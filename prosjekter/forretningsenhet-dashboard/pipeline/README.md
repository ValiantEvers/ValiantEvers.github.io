# Forretningsenhet Dashboard — Pipeline

Reproduces the synthetic dataset behind the dashboard. End-to-end run takes a couple of seconds.

## Stack
- `generate_data.py` — pandas builds 24 months × 5 product lines × {Actual, Budget, Forecast}
- `load_to_sqlite.py` — writes a single `bu_monthly` fact table to `data.db`
- `queries/*.sql` — reporting queries (KPI rollup, NII variance decomposition, per-line table, ROAC vs hurdle)
- `build_json.py` — runs the queries and emits `../data.json`

## Run

```bash
cd pipeline
pip install -r requirements.txt
python generate_data.py    # writes data_raw.csv
python load_to_sqlite.py   # writes data.db
python build_json.py       # writes ../data.json
```

Or run all three in one go:

```bash
python generate_data.py && python load_to_sqlite.py && python build_json.py
```

## What the data represents
A fictional Nordic wholesale-bank division with five product lines (Lending &
Specialised Finance, Transaction Banking, Markets, Asset Management, Investor
Services). All numbers are synthetic and parameterised in `generate_data.py`.
Nothing in this pipeline talks to a real bank's systems.

## Why SQLite + SQL
The frontend could read pandas DataFrames directly. SQLite is here because (a)
SQL is the lingua franca of every finance reporting stack and showing it
working end-to-end is the point of the demo, and (b) it lets the variance
decomposition, ROAC view, and per-line rollup live as readable `.sql` files
that someone reviewing the repo can scan in thirty seconds.

## Assumptions baked into the generator
- Customer rates: lending products in the 4.5–6.5 % range; deposit/transaction
  products credited via FTP only.
- FTP curve: ~3.5 % short, ~3.8 % long, with a small jitter month to month.
- Allocated capital = RWA × 14 % (illustrative CET1 target).
- Hurdle rate (cost of capital) = 11 % annualised.
- Tax: ROAC is reported pre-tax (PBT ÷ allocated capital), matching how most
  internal management reports show segment returns.
- All currency figures are in NOK millions unless otherwise stated.
