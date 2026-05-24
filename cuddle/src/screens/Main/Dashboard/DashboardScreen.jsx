import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Kanit_400Regular, Kanit_500Medium, Kanit_600SemiBold, Kanit_700Bold } from '@expo-google-fonts/kanit';
import { SettingsContext } from '../../../contexts/SettingsContext';

const { width } = Dimensions.get('window');

// ─── Data ──────────────────────────────────────────────────────────────────────

const KPIS = [
  { label: 'Mulheres',     value: '72.662', pct: '53,2% do total', delta: '+0,3pp vs média', positive: true },
  { label: 'Homens',       value: '63.009', pct: '46,1% do total', delta: '-0,7pp vs média', positive: false },
  { label: 'Idosos (60+)', value: '29.495', pct: '21,6% do total', delta: '+2,9pp vs média', positive: true },
  { label: 'Crianças 0-17',value: '28.904', pct: '21,1% do total', delta: '-2,4pp vs média', positive: false },
];

const ADULTOS = { label: 'Adultos 18-59', value: '78.299', pct: '57,3% do total', delta: '-0,5pp vs média', positive: false };

const RANKING = [
  { pos: '1.',  name: 'Alto de Pinheiros', val: '32,8%', highlight: false, dots: false },
  { pos: '2.',  name: 'Jardim Paulista',   val: '30,1%', highlight: false, dots: false },
  { dots: true },
  { pos: '38.', name: 'Aricanduva',        val: '22,1%', highlight: false, dots: false },
  { pos: '39.', name: 'Casa Verde',        val: '22,0%', highlight: false, dots: false },
  { pos: '40.', name: 'Freguesia do Ó',   val: '21,6%', highlight: true,  dots: false },
  { pos: '41.', name: 'República',         val: '21,6%', highlight: false, dots: false },
  { pos: '42.', name: 'Ponte Rasa',        val: '21,0%', highlight: false, dots: false },
  { dots: true },
  { pos: '96.', name: 'Anhanguera',        val: '11,7%', highlight: false, dots: false },
];

const ANOS = ['2008', '2010', '2012', '2014', '2016', '2018', '2020', '2022'];

const SERIES = [
  {
    title: 'Mulheres (% da população)',
    color: '#4db8c0',
    data:  [53.1, 53.1, 53.2, 53.2, 53.3, 53.3, 53.4, 53.5],
    media: [52.9, 52.9, 53.0, 53.0, 53.0, 53.1, 53.1, 53.1],
    yMin: 52.6, yMax: 53.8,
  },
  {
    title: 'Idosos 60+ (% da população)',
    color: '#e8837a',
    data:  [14.1, 13.4, 15.0, 16.0, 17.0, 18.2, 19.4, 20.5],
    media: [12.0, 12.4, 12.8, 13.2, 13.8, 14.4, 15.0, 15.6],
    yMin: 10, yMax: 22,
  },
  {
    title: 'Crianças 0-17 (% da população)',
    color: '#4db89e',
    data:  [24.0, 22.4, 22.0, 21.6, 21.3, 20.9, 20.7, 21.0],
    media: [25.5, 25.0, 24.4, 23.8, 23.4, 23.0, 22.7, 22.5],
    yMin: 19, yMax: 27,
  },
];

// ─── Mini sparkline (pure RN, no external chart lib) ───────────────────────────

const CHART_W = width - 64;
const CHART_H = 100;
const PAD_L = 36;
const PAD_B = 24;
const PAD_T = 8;
const PAD_R = 8;

function normalize(val, min, max) {
  return (val - min) / (max - min);
}

function toPoints(data, yMin, yMax) {
  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;
  return data.map((v, i) => ({
    x: PAD_L + (i / (data.length - 1)) * innerW,
    y: PAD_T + (1 - normalize(v, yMin, yMax)) * innerH,
    v,
  }));
}

function Polyline({ points, color, dashed = false }) {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Simulate dashed with short segments every other
  if (dashed) {
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i], p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      segs.push({ x1: p0.x, y1: p0.y, x2: mx, y2: my });
    }
    return segs.map((s, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          left: s.x1,
          top: s.y1,
          width: Math.sqrt((s.x2 - s.x1) ** 2 + (s.y2 - s.y1) ** 2),
          height: 1.5,
          backgroundColor: color,
          opacity: 0.6,
          transform: [{ rotate: `${Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * (180 / Math.PI)}deg` }],
          transformOrigin: '0 50%',
        }}
      />
    ));
  }
  // Solid line segments
  return points.slice(0, -1).map((p0, i) => {
    const p1 = points[i + 1];
    const len = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
    return (
      <View
        key={i}
        style={{
          position: 'absolute',
          left: p0.x,
          top: p0.y - 1,
          width: len,
          height: 2,
          backgroundColor: color,
          transform: [{ rotate: `${angle}deg` }],
          transformOrigin: '0 50%',
        }}
      />
    );
  });
}

function MiniChart({ series }) {
  const { color, data, media, yMin, yMax } = series;
  const pts = toPoints(data, yMin, yMax);
  const mpts = toPoints(media, yMin, yMax);
  const innerH = CHART_H - PAD_T - PAD_B;
  const innerW = CHART_W - PAD_L - PAD_R;
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <View style={{ width: CHART_W, height: CHART_H + 4, position: 'relative' }}>
      {/* Y axis ticks */}
      {yTicks.map((t) => {
        const y = PAD_T + (1 - normalize(t, yMin, yMax)) * innerH;
        return (
          <View key={t} style={{ position: 'absolute', left: 0, top: y - 6, width: PAD_L - 4, alignItems: 'flex-end' }}>
            <Text style={styles.chartTick}>{t}%</Text>
          </View>
        );
      })}
      {/* Grid lines */}
      {yTicks.map((t) => {
        const y = PAD_T + (1 - normalize(t, yMin, yMax)) * innerH;
        return (
          <View key={t} style={{ position: 'absolute', left: PAD_L, top: y, width: innerW, height: 0.5, backgroundColor: 'rgba(0,0,0,0.06)' }} />
        );
      })}
      {/* Media line (dashed) */}
      <Polyline points={mpts} color="#d4a017" dashed />
      {/* Main line */}
      <Polyline points={pts} color={color} />
      {/* Data points */}
      {pts.map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: p.x - 3, top: p.y - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      ))}
      {/* X axis labels */}
      {ANOS.map((a, i) => {
        const x = PAD_L + (i / (ANOS.length - 1)) * innerW;
        return (
          <View key={a} style={{ position: 'absolute', left: x - 16, top: CHART_H - PAD_B + 6, width: 32 }}>
            <Text style={[styles.chartTick, { textAlign: 'center' }]}>{a}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Donut chart (pure RN View-based arc simulation) ──────────────────────────
// We use a simple visual representation with two coloured arcs as semi-circles

function DonutChart() {
  // Mulheres = 53.2%, Homens = 46.1% (remainder ~0.7% não declarado)
  // Visual: a ring using two background halves
  const SIZE = 120;
  const STROKE = 18;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE }}>
      {/* Outer ring background (homens) */}
      <View style={{
        position: 'absolute',
        width: SIZE, height: SIZE,
        borderRadius: SIZE / 2,
        backgroundColor: '#1a5c6e',
      }} />
      {/* Mulheres arc overlay – covers ~53% of the circle */}
      {/* We fake it: left half is full teal, right half clips to ~6° extra */}
      <View style={{
        position: 'absolute',
        width: SIZE, height: SIZE,
        borderRadius: SIZE / 2,
        overflow: 'hidden',
      }}>
        {/* Left half – full mulheres */}
        <View style={{ position: 'absolute', left: 0, top: 0, width: SIZE / 2, height: SIZE, backgroundColor: '#4db8c0' }} />
        {/* Right partial – ~3% extra (53-50) out of 50 = 6% of right half */}
        <View style={{ position: 'absolute', left: SIZE / 2, top: 0, width: (SIZE / 2) * 0.12, height: SIZE, backgroundColor: '#4db8c0' }} />
      </View>
      {/* Inner white hole */}
      <View style={{
        position: 'absolute',
        width: SIZE - STROKE * 2,
        height: SIZE - STROKE * 2,
        borderRadius: (SIZE - STROKE * 2) / 2,
        backgroundColor: '#f4f9fa',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={styles.donutPct}>53,2%</Text>
        <Text style={styles.donutLbl}>mulheres</Text>
      </View>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { darkMode } = useContext(SettingsContext);
  const [activeTab, setActiveTab] = useState(0);

  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_600SemiBold,
    Kanit_700Bold,
  });

  if (!fontsLoaded) return null;

  const theme = darkMode ? darkStyles : {};

  return (
    <SafeAreaView style={[styles.safe, theme.safe]} edges={['top']}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor="#1a5c6e" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Freguesia do Ó</Text>
        <Text style={styles.headerSub}>Análise demográfica para o mercado pet</Text>
        <View style={styles.headerBorder} />
      </View>

      <ScrollView
        style={[styles.scroll, theme.scroll]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Blob decorations */}
        <View style={[styles.blob, { width: 160, height: 160, top: -30, right: -40, opacity: 0.4 }]} />
        <View style={[styles.blob, { width: 100, height: 100, top: 320, left: -30, opacity: 0.3 }]} />
        <View style={[styles.blob, { width: 80, height: 80, top: 700, right: 10, opacity: 0.3 }]} />

        {/* ── Seção: Visão geral ── */}
        <Text style={[styles.sectionLabel, theme.sectionLabel]}>Visão geral da população</Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalLbl}>POPULAÇÃO TOTAL</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={styles.totalNum}>136.698</Text>
            <Text style={styles.totalSub}>habitantes</Text>
          </View>
        </View>

        {/* KPI grid 2x2 */}
        <View style={styles.kpiGrid}>
          {KPIS.map((k) => (
            <View key={k.label} style={[styles.kpiCard, k.positive ? styles.kpiPos : styles.kpiNeg, theme.kpiCard]}>
              <View style={[styles.kpiLblWrap, { borderLeftColor: k.positive ? '#4db89e' : '#e8837a' }]}>
                <Text style={[styles.kpiLbl, { color: k.positive ? '#4db89e' : '#e8837a' }]}>{k.label.toUpperCase()}</Text>
              </View>
              <Text style={[styles.kpiNum, theme.kpiNum]}>{k.value}</Text>
              <Text style={[styles.kpiPct, theme.kpiPct]}>{k.pct}</Text>
              <Text style={[styles.kpiDelta, { color: k.positive ? '#0a8a68' : '#c9413a' }]}>{k.delta}</Text>
            </View>
          ))}
        </View>

        {/* Adultos – full width */}
        <View style={[styles.kpiCardFull, styles.kpiNeg, theme.kpiCard]}>
          <View style={[styles.kpiLblWrap, { borderLeftColor: '#e8837a' }]}>
            <Text style={[styles.kpiLbl, { color: '#e8837a' }]}>{ADULTOS.label.toUpperCase()}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text style={[styles.kpiNum, theme.kpiNum]}>{ADULTOS.value}</Text>
            <View>
              <Text style={[styles.kpiPct, theme.kpiPct]}>{ADULTOS.pct}</Text>
              <Text style={[styles.kpiDelta, { color: '#c9413a' }]}>{ADULTOS.delta}</Text>
            </View>
          </View>
        </View>

        {/* ── Seção: Gênero e ranking ── */}
        <Text style={[styles.sectionTitle, theme.sectionLabel]}>Gênero e Ranking de Idosos</Text>

        {/* Donut + ranking lado a lado */}
        <View style={[styles.card, theme.card, { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }]}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Text style={[styles.chartTitle, theme.chartTitle]}>Distribuição por Gênero</Text>
            <DonutChart />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#4db8c0' }} />
                <Text style={[styles.legendTxt, theme.legendTxt]}>Mulheres</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#1a5c6e' }} />
                <Text style={[styles.legendTxt, theme.legendTxt]}>Homens</Text>
              </View>
            </View>
          </View>

          {/* Ranking */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.rankingTitle, theme.rankingTitle]}>Ranking – Idosos (60+)</Text>
            {RANKING.map((r, i) =>
              r.dots ? (
                <Text key={i} style={styles.dots}>···</Text>
              ) : (
                <View key={i} style={[styles.rankRow, r.highlight && styles.rankRowHL]}>
                  <Text style={[styles.rankPos, r.highlight && styles.rankTxtHL]}>{r.pos}</Text>
                  <Text style={[styles.rankName, r.highlight && styles.rankTxtHL]} numberOfLines={1}>{r.name}</Text>
                  <Text style={[styles.rankVal, r.highlight && styles.rankTxtHL]}>{r.val}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* ── Seção: Evolução ── */}
        <Text style={[styles.sectionTitle, theme.sectionLabel]}>Evolução por Grupo (2008–2023)</Text>
        <Text style={[styles.sectionSubtitle, theme.kpiPct]}>Comparativo com a média dos distritos de SP</Text>

        {/* Tab selector */}
        <View style={[styles.tabBar, theme.card]}>
          {SERIES.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.tab, activeTab === i && { borderBottomWidth: 2, borderBottomColor: s.color }]}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabTxt, activeTab === i && { color: s.color, fontFamily: 'Kanit_600SemiBold' }]}>
                {i === 0 ? 'Mulheres' : i === 1 ? 'Idosos' : 'Crianças'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.card, theme.card, { paddingTop: 12 }]}>
          <Text style={[styles.chartTitle, theme.chartTitle]}>{SERIES[activeTab].title}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: SERIES[activeTab].color }} />
              <Text style={[styles.legendTxt, theme.legendTxt]}>Freguesia do Ó</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 3, backgroundColor: '#d4a017', opacity: 0.7 }} />
              <Text style={[styles.legendTxt, theme.legendTxt]}>Média distritos</Text>
            </View>
          </View>
          <MiniChart series={SERIES[activeTab]} />
        </View>

        {/* ── Recomendações ── */}
        <Text style={[styles.sectionTitle, theme.sectionLabel]}>Recomendações</Text>

        <View style={[styles.recCard, theme.recCard]}>
          <Text style={styles.recIcon}>⚖️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recTitle, theme.kpiNum]}>Perfil equilibrado</Text>
            <Text style={[styles.recBody, theme.kpiPct]}>
              Seu bairro tem um perfil demográfico diversificado e próximo da média de SP. Uma estratégia variada é o melhor caminho — atenda bem todos os perfis de tutores.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, theme.footer]}>Cuddle  |  Dados: Observa Sampa</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#dff0f5',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#dff0f5',
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Blobs decorativos
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(180,220,235,0.45)',
  },

  // Header
  header: {
    backgroundColor: '#1a5c6e',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  headerTitle: {
    fontFamily: 'Kanit_700Bold',
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 13,
    color: '#a8d4df',
    marginTop: 2,
    marginBottom: 14,
  },
  headerBorder: {
    height: 3,
    backgroundColor: '#d4a017',
  },

  // Section labels
  sectionLabel: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 11,
    color: '#2a7a8c',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 11,
    color: '#2a7a8c',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 12,
    color: '#6a9aaa',
    textAlign: 'center',
    marginBottom: 10,
  },

  // Total card
  totalCard: {
    backgroundColor: '#1a5c6e',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#d4a017',
  },
  totalLbl: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 10,
    color: '#a8d4df',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  totalNum: {
    fontFamily: 'Kanit_700Bold',
    fontSize: 36,
    color: '#ffffff',
    lineHeight: 40,
  },
  totalSub: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 16,
    color: '#a8d4df',
  },

  // KPI cards
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 10,
    gap: 10,
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1.5,
    width: (width - 32 - 10) / 2 - 0.5,
  },
  kpiCardFull: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginTop: 10,
  },
  kpiPos: { borderColor: '#4db89e' },
  kpiNeg: { borderColor: '#e8837a' },
  kpiLblWrap: {
    borderLeftWidth: 3,
    paddingLeft: 6,
    marginBottom: 6,
  },
  kpiLbl: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  kpiNum: {
    fontFamily: 'Kanit_700Bold',
    fontSize: 26,
    color: '#1a5c6e',
    lineHeight: 28,
  },
  kpiPct: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 12,
    color: '#6a9aaa',
    marginTop: 2,
  },
  kpiDelta: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 11,
    marginTop: 4,
  },

  // Card genérico
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#c8dfe6',
    marginTop: 12,
  },

  // Chart
  chartTitle: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 12,
    color: '#1a5c6e',
    textAlign: 'center',
    marginBottom: 8,
  },
  chartTick: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 9,
    color: '#6a9aaa',
  },
  legendTxt: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 11,
    color: '#6a9aaa',
  },

  // Donut
  donutPct: {
    fontFamily: 'Kanit_700Bold',
    fontSize: 16,
    color: '#1a5c6e',
    textAlign: 'center',
  },
  donutLbl: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 10,
    color: '#6a9aaa',
    textAlign: 'center',
  },

  // Ranking
  rankingTitle: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 10,
    color: '#2a7a8c',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f8fa',
  },
  rankRowHL: {
    backgroundColor: '#1a5c6e',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  rankPos: {
    fontFamily: 'Kanit_500Medium',
    fontSize: 10,
    color: '#6a9aaa',
    width: 26,
  },
  rankName: {
    fontFamily: 'Kanit_500Medium',
    fontSize: 11,
    color: '#1a5c6e',
    flex: 1,
    paddingRight: 4,
  },
  rankVal: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 11,
    color: '#2a7a8c',
  },
  rankTxtHL: {
    color: '#ffffff',
  },
  dots: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 14,
    color: '#a8c8d4',
    textAlign: 'center',
    letterSpacing: 3,
    paddingVertical: 2,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: '#c8dfe6',
    backgroundColor: '#ffffff',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabTxt: {
    fontFamily: 'Kanit_500Medium',
    fontSize: 12,
    color: '#6a9aaa',
  },

  // Recomendação
  recCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#c8e8f0',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#2a7a8c',
    gap: 12,
  },
  recIcon: {
    fontSize: 24,
  },
  recTitle: {
    fontFamily: 'Kanit_600SemiBold',
    fontSize: 13,
    color: '#1a5c6e',
    marginBottom: 4,
  },
  recBody: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 12,
    color: '#3a7a8c',
    lineHeight: 18,
  },

  // Footer
  footer: {
    fontFamily: 'Kanit_400Regular',
    fontSize: 10,
    color: '#6a9aaa',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#c8dfe6',
    marginHorizontal: 16,
  },
});

// ─── Dark mode overrides ────────────────────────────────────────────────────────

const darkStyles = {
  safe:         { backgroundColor: '#0d1f26' },
  scroll:       { backgroundColor: '#0d1f26' },
  sectionLabel: { color: '#4db8c0' },
  kpiCard:      { backgroundColor: '#152e38', borderColor: '#1e4455' },
  kpiNum:       { color: '#e0f4f8' },
  kpiPct:       { color: '#4a8a9a' },
  card:         { backgroundColor: '#152e38', borderColor: '#1e4455' },
  chartTitle:   { color: '#a8d4df' },
  legendTxt:    { color: '#4a8a9a' },
  rankingTitle: { color: '#4db8c0' },
  recCard:      { backgroundColor: '#0e2b38', borderLeftColor: '#4db8c0' },
  footer:       { color: '#2a6a7a', borderTopColor: '#1e4455' },
};
