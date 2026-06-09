from __future__ import annotations

import csv
import os
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from statistics import mean
from typing import Any, Dict, Iterable, List, Optional, Tuple


IND_TOTAL = "População total"
IND_WOMEN = "População total - mulheres"
IND_MEN = "População total - homens"
IND_ELDERLY = "População com 60 anos ou mais"
IND_CHILDREN = "População de 0 a 17 anos"

REQUIRED_FOR_DASHBOARD = [IND_TOTAL, IND_WOMEN, IND_MEN, IND_ELDERLY, IND_CHILDREN]

DEFAULT_SERIES_YEARS = [2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022]


def _strip_accents(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


def _safe_float(raw: str) -> Optional[float]:
    raw = (raw or "").strip()
    if not raw:
        return None
    # Observa Sampa uses comma as decimal separator
    raw = raw.replace(".", "") if raw.count(".") > 0 and raw.count(",") == 1 else raw
    raw = raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def _district_display_name(region: str) -> str:
    suffix = " (Distrito)"
    if region.endswith(suffix):
        return region[: -len(suffix)]
    return region


@dataclass(frozen=True)
class ValuePoint:
    year: int
    value: float


class ObservaSampaDataset:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        # indicator -> region -> year -> value
        self._index: Dict[str, Dict[str, Dict[int, float]]] = defaultdict(lambda: defaultdict(dict))

        self._districts: List[str] = []
        self._avg_latest_shares: Dict[str, float] = {}
        self._ranking_elderly_latest: List[Tuple[str, float]] = []

        self._load()
        self._compute_districts()
        self._compute_latest_aggregates()

    def _load(self) -> None:
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"CSV not found: {self.csv_path}")

        with open(self.csv_path, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f, delimiter=";")
            for row in reader:
                indicator = (row.get("Nome") or "").strip()
                region = (row.get("Região") or "").strip()
                period = (row.get("Período") or "").strip()
                result = (row.get("Resultado") or "").strip()

                if not indicator or not region or not period:
                    continue

                try:
                    year = int(period)
                except ValueError:
                    continue

                value = _safe_float(result)
                if value is None:
                    continue

                self._index[indicator][region][year] = value

    def _compute_districts(self) -> None:
        # districts that have all required indicators at least once
        districts: Optional[set[str]] = None
        for indicator in REQUIRED_FOR_DASHBOARD:
            regions = {r for r in self._index.get(indicator, {}).keys() if r.endswith("(Distrito)")}
            districts = regions if districts is None else districts.intersection(regions)

        self._districts = sorted(
            list(districts or []),
            key=lambda r: _strip_accents(_district_display_name(r)).lower(),
        )

    def _latest(self, indicator: str, region: str) -> ValuePoint:
        years_map = self._index.get(indicator, {}).get(region, {})
        if not years_map:
            raise KeyError(f"Missing indicator '{indicator}' for region '{region}'")
        year = max(years_map.keys())
        return ValuePoint(year=year, value=years_map[year])

    def _value_for_year(self, indicator: str, region: str, year: int) -> Optional[float]:
        return self._index.get(indicator, {}).get(region, {}).get(year)

    def districts(self) -> List[Dict[str, str]]:
        return [
            {
                "region": r,
                "name": _district_display_name(r),
            }
            for r in self._districts
        ]

    def _compute_latest_aggregates(self) -> None:
        # Precompute avg shares using each district's latest available values.
        women_shares: List[float] = []
        men_shares: List[float] = []
        elderly_shares: List[float] = []
        children_shares: List[float] = []
        adults_shares: List[float] = []

        ranking_elderly: List[Tuple[str, float]] = []

        for region in self._districts:
            total = self._latest(IND_TOTAL, region).value
            if total <= 0:
                continue

            women = self._latest(IND_WOMEN, region).value
            men = self._latest(IND_MEN, region).value
            elderly = self._latest(IND_ELDERLY, region).value
            children = self._latest(IND_CHILDREN, region).value

            women_shares.append((women / total) * 100)
            men_shares.append((men / total) * 100)
            elderly_share = (elderly / total) * 100
            children_share = (children / total) * 100
            elderly_shares.append(elderly_share)
            children_shares.append(children_share)

            adults = total - elderly - children
            adults_shares.append((adults / total) * 100)

            ranking_elderly.append((region, elderly_share))

        self._avg_latest_shares = {
            "women": mean(women_shares) if women_shares else 0.0,
            "men": mean(men_shares) if men_shares else 0.0,
            "elderly": mean(elderly_shares) if elderly_shares else 0.0,
            "children": mean(children_shares) if children_shares else 0.0,
            "adults": mean(adults_shares) if adults_shares else 0.0,
        }

        self._ranking_elderly_latest = sorted(ranking_elderly, key=lambda x: x[1], reverse=True)

    def _series_for_indicator_share(
        self,
        indicator: str,
        region: str,
        years: List[int],
    ) -> Tuple[List[int], List[float], List[float]]:
        # Returns (filtered_years, district_share%, avg_share%)
        district_values: List[Optional[float]] = []
        avg_values: List[Optional[float]] = []

        for y in years:
            v = self._value_for_year(indicator, region, y)
            t = self._value_for_year(IND_TOTAL, region, y)
            if v is None or t is None or t <= 0:
                district_values.append(None)
            else:
                district_values.append((v / t) * 100)

            # Average across districts for the same year
            shares_for_year: List[float] = []
            for r in self._districts:
                vv = self._value_for_year(indicator, r, y)
                tt = self._value_for_year(IND_TOTAL, r, y)
                if vv is None or tt is None or tt <= 0:
                    continue
                shares_for_year.append((vv / tt) * 100)
            avg_values.append(mean(shares_for_year) if shares_for_year else None)

        filtered_years: List[int] = []
        d_series: List[float] = []
        a_series: List[float] = []

        for i, y in enumerate(years):
            dv = district_values[i]
            av = avg_values[i]
            if dv is None or av is None:
                continue
            filtered_years.append(y)
            d_series.append(dv)
            a_series.append(av)

        return filtered_years, d_series, a_series

    def _build_ranking_rows(self, region: str) -> List[Dict[str, Any]]:
        # Compact ranking view: top 2, dots, around selected (±2), dots, bottom 1.
        ranking = self._ranking_elderly_latest
        if not ranking:
            return []

        # Find selected index
        idx = next((i for i, (r, _) in enumerate(ranking) if r == region), None)

        rows: List[Dict[str, Any]] = []

        def add_row(i: int, highlight: bool = False) -> None:
            r, share = ranking[i]
            rows.append(
                {
                    "pos": i + 1,
                    "name": _district_display_name(r),
                    "region": r,
                    "val": round(share, 1),
                    "highlight": highlight,
                }
            )

        # Top 2
        top_n = min(2, len(ranking))
        for i in range(top_n):
            add_row(i, highlight=(ranking[i][0] == region))

        if idx is None:
            return rows

        # Middle window
        window_start = max(0, idx - 2)
        window_end = min(len(ranking) - 1, idx + 2)

        if window_start > top_n:
            rows.append({"dots": True})

        for i in range(window_start, window_end + 1):
            if i < top_n:
                continue
            if i == len(ranking) - 1:
                continue
            add_row(i, highlight=(ranking[i][0] == region))

        # Bottom 1
        if len(ranking) > 3:
            if (len(ranking) - 1) > window_end:
                rows.append({"dots": True})
            add_row(len(ranking) - 1, highlight=(ranking[-1][0] == region))

        return rows

    def dashboard(self, region: str) -> Dict[str, Any]:
        if region not in self._districts:
            raise KeyError("District not supported")

        total_pt = self._latest(IND_TOTAL, region)
        women_pt = self._latest(IND_WOMEN, region)
        men_pt = self._latest(IND_MEN, region)
        elderly_pt = self._latest(IND_ELDERLY, region)
        children_pt = self._latest(IND_CHILDREN, region)

        total = total_pt.value
        if total <= 0:
            raise ValueError("Invalid total")

        women = women_pt.value
        men = men_pt.value
        elderly = elderly_pt.value
        children = children_pt.value
        adults = total - elderly - children

        def pct(v: float) -> float:
            return (v / total) * 100

        women_pct = pct(women)
        men_pct = pct(men)
        elderly_pct = pct(elderly)
        children_pct = pct(children)
        adults_pct = pct(adults)

        def delta(key: str, value_pct: float) -> float:
            return value_pct - (self._avg_latest_shares.get(key) or 0.0)

        kpis = {
            "total": {"value": int(round(total)), "year": total_pt.year},
            "women": {
                "value": int(round(women)),
                "year": women_pt.year,
                "pct": women_pct,
                "deltaPp": delta("women", women_pct),
            },
            "men": {
                "value": int(round(men)),
                "year": men_pt.year,
                "pct": men_pct,
                "deltaPp": delta("men", men_pct),
            },
            "elderly": {
                "value": int(round(elderly)),
                "year": elderly_pt.year,
                "pct": elderly_pct,
                "deltaPp": delta("elderly", elderly_pct),
            },
            "children": {
                "value": int(round(children)),
                "year": children_pt.year,
                "pct": children_pct,
                "deltaPp": delta("children", children_pct),
            },
            "adults": {
                "value": int(round(adults)),
                "year": total_pt.year,
                "pct": adults_pct,
                "deltaPp": delta("adults", adults_pct),
            },
        }

        years = DEFAULT_SERIES_YEARS
        y_w, s_w, m_w = self._series_for_indicator_share(IND_WOMEN, region, years)
        y_e, s_e, m_e = self._series_for_indicator_share(IND_ELDERLY, region, years)
        y_c, s_c, m_c = self._series_for_indicator_share(IND_CHILDREN, region, years)

        # Use the intersection of available years so tabs align
        common_years = sorted(set(y_w).intersection(y_e).intersection(y_c))

        def align(series_years: List[int], series_vals: List[float], target_years: List[int]) -> List[float]:
            mapping = {y: v for y, v in zip(series_years, series_vals)}
            return [mapping[y] for y in target_years]

        years_out = common_years
        women_series = align(y_w, s_w, years_out)
        women_media = align(y_w, m_w, years_out)
        elderly_series = align(y_e, s_e, years_out)
        elderly_media = align(y_e, m_e, years_out)
        children_series = align(y_c, s_c, years_out)
        children_media = align(y_c, m_c, years_out)

        def y_bounds(values: Iterable[float]) -> Dict[str, float]:
            vals = list(values)
            if not vals:
                return {"yMin": 0.0, "yMax": 1.0}
            vmin = min(vals)
            vmax = max(vals)
            pad = max(0.6, (vmax - vmin) * 0.12)
            return {
                "yMin": max(0.0, round(vmin - pad, 1)),
                "yMax": min(100.0, round(vmax + pad, 1)),
            }

        series = {
            "years": years_out,
            "women": {
                "data": [round(v, 1) for v in women_series],
                "media": [round(v, 1) for v in women_media],
                **y_bounds([*women_series, *women_media]),
            },
            "elderly": {
                "data": [round(v, 1) for v in elderly_series],
                "media": [round(v, 1) for v in elderly_media],
                **y_bounds([*elderly_series, *elderly_media]),
            },
            "children": {
                "data": [round(v, 1) for v in children_series],
                "media": [round(v, 1) for v in children_media],
                **y_bounds([*children_series, *children_media]),
            },
        }

        return {
            "district": {"region": region, "name": _district_display_name(region)},
            "kpis": kpis,
            "ranking": {
                "rows": self._build_ranking_rows(region),
            },
            "series": series,
        }


def load_default_dataset() -> ObservaSampaDataset:
    path = os.environ.get("OBSERVA_CSV_PATH") or os.environ.get("OBSERVA_CSV") or "ObservaSampaDadosAbertosIndicadoresCSV.csv"
    return ObservaSampaDataset(path)


DATASET = load_default_dataset()
