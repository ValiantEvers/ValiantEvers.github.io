#!/usr/bin/env python3
"""
Run the reporting queries against data.db and write the JSON the frontend
consumes (../data.json).
"""

from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime, timezone
from pathlib import Path

from commentary import build_commentary

HERE = Path(__file__).parent
DB_PATH = HERE / "data.db"
QUERIES_DIR = HERE / "queries"
OUT_PATH = HERE.parent / "data.json"

# Reporting parameters
LATEST_ACTUAL  = "2026-04-01"   # last fully closed month
YTD_START      = "2026-01-01"
YTD_MONTHS     = 4
FY_START       = "2026-01-01"
FY_END         = "2026-12-01"
FIRST_FORECAST = "2026-05-01"
HURDLE_RATE    = 0.11           # cost of capital
CET1_TARGET    = 0.14

DISCLAIMER = (
    "Illustrative synthetic data. Not affiliated with or representative of "
    "any real bank."
)


def read_sql(name: str) -> str:
    return (QUERIES_DIR / name).read_text(encoding="utf-8")


def rows_to_dicts(cursor: sqlite3.Cursor) -> list[dict]:
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, r)) for r in cursor.fetchall()]


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    params = {
        "period": LATEST_ACTUAL,
        "ytd_start": YTD_START,
        "latest_actual": LATEST_ACTUAL,
        "ytd_months": YTD_MONTHS,
        "fy_start": FY_START,
        "fy_end": FY_END,
        "first_forecast": FIRST_FORECAST,
        "hurdle_rate": HURDLE_RATE,
    }

    # ----- KPIs current month ---------------------------------------------
    cur = conn.execute(read_sql("01_kpi_current_month.sql"), params)
    by_version = {row["version"].lower(): dict(row) for row in rows_to_dicts(cur)}
    kpi_current = by_version

    # ----- KPIs YTD --------------------------------------------------------
    cur = conn.execute(read_sql("02_kpi_ytd.sql"), params)
    by_version_ytd = {row["version"].lower(): dict(row) for row in rows_to_dicts(cur)}
    kpi_ytd = by_version_ytd

    # ----- Waterfall (YTD) -------------------------------------------------
    cur = conn.execute(read_sql("03_variance_waterfall_ytd.sql"), params)
    waterfall = rows_to_dicts(cur)

    # ----- Per-line YTD table ---------------------------------------------
    cur = conn.execute(read_sql("04_per_line_ytd.sql"), params)
    per_line = rows_to_dicts(cur)

    # ----- ROAC vs hurdle --------------------------------------------------
    cur = conn.execute(read_sql("05_roac_vs_hurdle.sql"), params)
    roac_vs_hurdle = rows_to_dicts(cur)

    # ----- Monthly trend ---------------------------------------------------
    cur = conn.execute(read_sql("06_monthly_trend.sql"), params)
    monthly_trend = rows_to_dicts(cur)

    # ----- Sensitivity baseline -------------------------------------------
    cur = conn.execute(read_sql("07_sensitivity_baseline.sql"), params)
    sensitivity_baseline = rows_to_dicts(cur)

    # ----- Full-year view (Actual YTD + remaining Forecast vs FY Budget) -
    cur = conn.execute(read_sql("08_kpi_fy_view.sql"), params)
    fy_rows = rows_to_dicts(cur)
    kpi_fy = {row["bucket"]: row for row in fy_rows}

    # ----- Division-level YTD aggregates for the sensitivity panel --------
    cur = conn.execute(
        """
        SELECT
            ROUND(SUM(nii + fee_income), 1)               AS total_income,
            ROUND(SUM(opex), 1)                           AS opex,
            ROUND(SUM(loan_impairment), 1)                AS loan_impairment,
            ROUND(SUM(nii + fee_income - opex - loan_impairment), 1) AS pbt,
            ROUND(AVG(allocated_capital_total), 1)        AS allocated_capital_avg
        FROM (
            SELECT period,
                   SUM(nii) AS nii,
                   SUM(fee_income) AS fee_income,
                   SUM(opex) AS opex,
                   SUM(loan_impairment) AS loan_impairment,
                   SUM(allocated_capital) AS allocated_capital_total
            FROM bu_monthly
            WHERE version = 'Actual'
              AND period BETWEEN :ytd_start AND :latest_actual
            GROUP BY period
        )
        """,
        params,
    )
    division_aggregates = dict(cur.fetchone())

    conn.close()

    # ----- Commentary ------------------------------------------------------
    commentary = build_commentary(kpi_ytd, waterfall, per_line, roac_vs_hurdle)

    # ----- Compose output --------------------------------------------------
    out = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "latest_actual_period": LATEST_ACTUAL,
            "ytd_start": YTD_START,
            "ytd_months": YTD_MONTHS,
            "hurdle_rate_pct": HURDLE_RATE * 100,
            "cet1_target_pct": CET1_TARGET * 100,
            "currency": "NOK millions",
            "disclaimer": DISCLAIMER,
        },
        "kpi_current_month": kpi_current,
        "kpi_ytd": kpi_ytd,
        "kpi_fy_view": kpi_fy,
        "waterfall_ytd": waterfall,
        "per_line_ytd": per_line,
        "roac_vs_hurdle": roac_vs_hurdle,
        "monthly_trend": monthly_trend,
        "sensitivity_baseline": sensitivity_baseline,
        "division_aggregates": division_aggregates,
        "commentary": commentary,
    }

    OUT_PATH.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
    print(f"  KPI current month versions: {list(kpi_current.keys())}")
    print(f"  Waterfall rows: {len(waterfall)}")
    print(f"  Per-line rows: {len(per_line)}")
    print(f"  Commentary bullets: {len(commentary)}")


if __name__ == "__main__":
    main()
