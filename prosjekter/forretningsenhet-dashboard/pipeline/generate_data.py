#!/usr/bin/env python3
"""
Synthetic data generator for the Forretningsenhet Dashboard.
==============================================================
Builds 24 months × 5 product lines × {Actual, Budget, Forecast} for a fictional
Nordic wholesale-bank division. All numbers are NOK millions.

The generator is deterministic (seeded) so the dashboard reproduces exactly.
Nothing here pulls from a real bank's systems. See ../data.json for the
output the frontend consumes (built by build_json.py after this script).

Period: Jan 2025 — Dec 2026 (24 months)
Latest closed month: Apr 2026
  → Actuals: Jan 2025 – Apr 2026 (16 months)
  → Forecast: May 2026 – Dec 2026 (8 months)
  → Budget: all 24 months
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

OUT_PATH = Path(__file__).parent / "data_raw.csv"

START = date(2025, 1, 1)
MONTHS = 24
LATEST_ACTUAL = date(2026, 4, 1)   # last fully closed month
SEED = 20260528

# Hurdle rate (cost of capital) — used by the ROAC view. Illustrative.
HURDLE_RATE = 0.11
# Allocated capital = RWA × CET1 target
CET1_TARGET = 0.14


@dataclass(frozen=True)
class ProductBase:
    name: str
    side: str             # "lending", "deposit", or "other"
    nii_annual: float     # baseline annual NII (for "other" products)
    fee_annual: float
    opex_annual: float
    impairment_annual: float
    volume: float         # NOK millions of lending or deposit volume
    customer_rate: float  # decimal, e.g. 0.055
    ftp_rate: float       # decimal, e.g. 0.037
    rwa: float            # NOK millions


# Baseline FY run-rate per product line. The "Other" income for Markets and
# fee-heavy units is set directly via nii_annual / fee_annual since they are
# not volume-driven.
PRODUCTS: list[ProductBase] = [
    ProductBase(
        name="Lending & Specialised Finance",
        side="lending",
        nii_annual=0,           # derived from volume × (CR - FTP)
        fee_annual=520,
        opex_annual=1100,
        impairment_annual=300,
        volume=240_000,
        customer_rate=0.0560,
        ftp_rate=0.0375,
        rwa=195_000,
    ),
    ProductBase(
        name="Transaction Banking",
        side="deposit",
        nii_annual=0,           # derived from volume × (FTP - CR)
        fee_annual=1280,
        opex_annual=820,
        impairment_annual=15,
        volume=148_000,
        customer_rate=0.0205,
        ftp_rate=0.0360,
        rwa=58_000,
    ),
    ProductBase(
        name="Markets",
        side="other",
        nii_annual=420,
        fee_annual=1620,
        opex_annual=920,
        impairment_annual=0,
        volume=0,
        customer_rate=0,
        ftp_rate=0,
        rwa=90_000,
    ),
    ProductBase(
        name="Asset Management",
        side="other",
        nii_annual=55,
        fee_annual=1180,
        opex_annual=730,
        impairment_annual=0,
        volume=0,
        customer_rate=0,
        ftp_rate=0,
        rwa=11_000,
    ),
    ProductBase(
        name="Investor Services",
        side="other",
        nii_annual=42,
        fee_annual=770,
        opex_annual=480,
        impairment_annual=0,
        volume=0,
        customer_rate=0,
        ftp_rate=0,
        rwa=8_500,
    ),
]


def month_range(start: date, n: int) -> list[date]:
    return list(pd.date_range(start, periods=n, freq="MS").date)


def nii_from_rates(side: str, volume: float, cr: float, ftp: float) -> float:
    """Monthly NII from volume × spread for volume-driven products."""
    if side == "lending":
        return (cr - ftp) * volume / 12.0
    if side == "deposit":
        return (ftp - cr) * volume / 12.0
    return 0.0


def seasonality_fee(month: int) -> float:
    """Fee income has a mild quarter-end uplift and a Q1 slow-down."""
    pattern = {1: 0.92, 2: 0.97, 3: 1.06,
               4: 0.97, 5: 0.99, 6: 1.05,
               7: 0.94, 8: 0.95, 9: 1.04,
               10: 1.00, 11: 1.01, 12: 1.10}
    return pattern[month]


def build_version(version: str, rng: np.random.Generator) -> list[dict]:
    """Build one full version (Actual, Budget, or Forecast) for all products × months."""
    rows: list[dict] = []
    periods = month_range(START, MONTHS)

    for p in PRODUCTS:
        # --- per-product trajectory parameters ----------------------------
        if version == "Budget":
            # Budget is a smooth plan — flat baseline, mild growth assumption
            vol_growth_per_month = 0.0025      # 3% p.a. lending book growth
            fee_noise = 0.0
            opex_noise = 0.0
            cr_drift = 0.0
            ftp_drift = 0.0
            impairment_noise = 0.0
        elif version == "Forecast":
            # Forecast is recent re-baseline: similar to budget but reflects
            # the latest actuals direction. Slightly slower lending growth,
            # FTP a touch higher (rates surprised on the upside).
            vol_growth_per_month = 0.0018
            fee_noise = 0.0
            opex_noise = 0.0
            cr_drift = 0.0002                 # +20 bps p.a. on customer side
            ftp_drift = 0.00025               # +30 bps p.a. on FTP
            impairment_noise = 0.0
        else:  # Actual
            vol_growth_per_month = 0.0021     # slightly under plan
            fee_noise = 0.10
            opex_noise = 0.025
            cr_drift = 0.00015                # +18 bps p.a.
            ftp_drift = 0.00035               # +42 bps p.a. (rates went up)
            impairment_noise = 1.4            # impairments are volatile

        # --- monthly loop -------------------------------------------------
        cum_vol_factor = 1.0
        cum_cr = p.customer_rate
        cum_ftp = p.ftp_rate

        for i, period in enumerate(periods):
            # Volume drift (compounding)
            cum_vol_factor *= (1.0 + vol_growth_per_month)
            volume = p.volume * cum_vol_factor

            # Rate drift
            cum_cr = p.customer_rate + cr_drift * (i + 1)
            cum_ftp = p.ftp_rate + ftp_drift * (i + 1)

            # Add Actual noise
            if version == "Actual":
                volume *= 1.0 + rng.normal(0, 0.012)
                cum_cr_m = cum_cr + rng.normal(0, 0.0012)
                cum_ftp_m = cum_ftp + rng.normal(0, 0.0015)
            else:
                cum_cr_m = cum_cr
                cum_ftp_m = cum_ftp

            # NII
            if p.side in ("lending", "deposit"):
                nii_customer = cum_cr_m * volume / 12.0
                nii_ftp = cum_ftp_m * volume / 12.0
                nii = nii_from_rates(p.side, volume, cum_cr_m, cum_ftp_m)
            else:
                # "Other" products — fixed monthly NII
                base_monthly_nii = p.nii_annual / 12.0
                if version == "Actual":
                    nii = base_monthly_nii * (1.0 + rng.normal(0, 0.05))
                else:
                    nii = base_monthly_nii
                nii_customer = 0.0
                nii_ftp = 0.0

            # Fees (seasonal + noise)
            base_monthly_fee = p.fee_annual / 12.0 * seasonality_fee(period.month)
            if fee_noise > 0:
                fee = base_monthly_fee * (1.0 + rng.normal(0, fee_noise))
            else:
                fee = base_monthly_fee

            # Opex (mostly flat)
            base_monthly_opex = p.opex_annual / 12.0
            if opex_noise > 0:
                opex = base_monthly_opex * (1.0 + rng.normal(0, opex_noise))
            else:
                opex = base_monthly_opex

            # Impairment (lumpy)
            base_monthly_imp = p.impairment_annual / 12.0
            if impairment_noise > 0:
                # Most months close to baseline, occasional spike
                if rng.random() < 0.08:
                    imp = base_monthly_imp * rng.uniform(2.5, 5.0)
                else:
                    imp = max(0.0, base_monthly_imp * rng.normal(1.0, 0.4))
            else:
                imp = base_monthly_imp

            # Targeted credit event: a single LSF impairment spike in Aug 2025
            # to make the dashboard tell an interesting story.
            if (version == "Actual"
                    and p.name == "Lending & Specialised Finance"
                    and period == date(2025, 8, 1)):
                imp = base_monthly_imp * 6.5

            # RWA grows with volume for lending; for "other" stays close to base
            if p.side in ("lending", "deposit"):
                rwa = p.rwa * cum_vol_factor
            else:
                rwa = p.rwa

            allocated_capital = rwa * CET1_TARGET

            rows.append({
                "product_line": p.name,
                "side": p.side,
                "period": period.isoformat(),
                "version": version,
                "nii": round(nii, 2),
                "nii_customer": round(nii_customer, 2),
                "nii_ftp": round(nii_ftp, 2),
                "fee_income": round(fee, 2),
                "opex": round(opex, 2),
                "lending_volume": round(volume, 1) if p.side in ("lending", "deposit") else 0.0,
                "rwa": round(rwa, 1),
                "allocated_capital": round(allocated_capital, 2),
                "loan_impairment": round(imp, 2),
                "customer_rate": round(cum_cr_m, 6),
                "ftp_rate": round(cum_ftp_m, 6),
            })

    return rows


def main() -> None:
    rng = np.random.default_rng(SEED)
    all_rows: list[dict] = []
    for version in ("Budget", "Forecast", "Actual"):
        all_rows.extend(build_version(version, rng))

    # Restrict Actual to months <= LATEST_ACTUAL; Forecast to months > LATEST_ACTUAL.
    df = pd.DataFrame(all_rows)
    df["period_d"] = pd.to_datetime(df["period"]).dt.date

    actual_mask = (df["version"] == "Actual") & (df["period_d"] <= LATEST_ACTUAL)
    forecast_mask = (df["version"] == "Forecast") & (df["period_d"] > LATEST_ACTUAL)
    budget_mask = df["version"] == "Budget"

    df = df[actual_mask | forecast_mask | budget_mask].drop(columns=["period_d"])
    df = df.sort_values(["version", "product_line", "period"]).reset_index(drop=True)

    df.to_csv(OUT_PATH, index=False, quoting=csv.QUOTE_MINIMAL)
    print(f"Wrote {len(df):,} rows → {OUT_PATH}")
    print(f"Versions: {df['version'].value_counts().to_dict()}")
    print(f"Period range: {df['period'].min()} → {df['period'].max()}")


if __name__ == "__main__":
    main()
