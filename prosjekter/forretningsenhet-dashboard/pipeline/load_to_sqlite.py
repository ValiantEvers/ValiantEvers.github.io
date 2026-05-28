#!/usr/bin/env python3
"""
Load the generated CSV into a local SQLite database.
A single fact table `bu_monthly` is created. All downstream reporting
runs against this table via the queries in queries/*.sql.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
CSV_PATH = HERE / "data_raw.csv"
DB_PATH = HERE / "data.db"

SCHEMA = """
DROP TABLE IF EXISTS bu_monthly;

CREATE TABLE bu_monthly (
    product_line       TEXT    NOT NULL,
    side               TEXT    NOT NULL,
    period             TEXT    NOT NULL,
    version            TEXT    NOT NULL,
    nii                REAL    NOT NULL,
    nii_customer       REAL    NOT NULL,
    nii_ftp            REAL    NOT NULL,
    fee_income         REAL    NOT NULL,
    opex               REAL    NOT NULL,
    lending_volume     REAL    NOT NULL,
    rwa                REAL    NOT NULL,
    allocated_capital  REAL    NOT NULL,
    loan_impairment    REAL    NOT NULL,
    customer_rate      REAL    NOT NULL,
    ftp_rate           REAL    NOT NULL,
    PRIMARY KEY (product_line, period, version)
);

CREATE INDEX idx_period_version ON bu_monthly(period, version);
CREATE INDEX idx_product_version ON bu_monthly(product_line, version);
"""


def main() -> None:
    df = pd.read_csv(CSV_PATH)

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.executescript(SCHEMA)
        df.to_sql("bu_monthly", conn, if_exists="append", index=False)
        conn.commit()

        n = conn.execute("SELECT COUNT(*) FROM bu_monthly").fetchone()[0]
        versions = conn.execute(
            "SELECT version, COUNT(*) FROM bu_monthly GROUP BY version"
        ).fetchall()
        print(f"Loaded {n:,} rows into {DB_PATH}")
        for v, c in versions:
            print(f"  {v}: {c}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
