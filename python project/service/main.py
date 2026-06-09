from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query

from .observa import DATASET

app = FastAPI(title="Cuddle Analytics", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/districts")
def districts():
    return {"districts": DATASET.districts()}


@app.get("/dashboard")
def dashboard(region: str = Query(..., description="CSV Região value, ex: 'Freguesia do Ó (Distrito)'") ):
    try:
        return DATASET.dashboard(region)
    except KeyError:
        raise HTTPException(status_code=404, detail="District not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
