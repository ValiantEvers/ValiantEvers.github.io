"""
Rule-based commentary generator. Takes the structured numbers a finance
business partner would have in front of them and emits three short bullets
of the kind that go at the top of a monthly pack.

This is intentionally rule-based (no LLM) — so the page works without any
API key. The optional GenAI variant is wired in separately behind a flag.
"""

from __future__ import annotations


def _fmt_nok_m(x: float) -> str:
    if abs(x) >= 1000:
        return f"NOK {x/1000:.1f} bn"
    return f"NOK {x:.0f} m"


def _fmt_pp(x: float) -> str:
    sign = "+" if x >= 0 else "−"
    return f"{sign}{abs(x):.1f} pp"


def _fmt_pct(x: float) -> str:
    return f"{x:.1f}%"


def _signed_pct(x: float) -> str:
    sign = "+" if x >= 0 else "−"
    return f"{sign}{abs(x):.1f}%"


def build_commentary(
    kpi_ytd: dict,
    waterfall: list[dict],
    per_line: list[dict],
    roac_vs_hurdle: list[dict],
) -> list[str]:
    """Return up to three bullets of FBP-style monthly commentary."""
    out: list[str] = []

    # -- 1. Top-line PBT and what's driving it ---------------------------
    actual = kpi_ytd["actual"]
    budget = kpi_ytd["budget"]
    pbt_var = actual["pbt"] - budget["pbt"]
    pbt_var_pct = 100.0 * pbt_var / abs(budget["pbt"]) if budget["pbt"] else 0.0

    waterfall_map = {row["bucket"]: row["value"] for row in waterfall}
    vol_eff = waterfall_map.get("volume_effect", 0.0)
    cr_eff = waterfall_map.get("customer_rate_effect", 0.0)
    ftp_eff = waterfall_map.get("ftp_effect", 0.0)

    # Find the biggest absolute NII driver
    drivers = [("volume", vol_eff), ("customer margin", cr_eff), ("FTP funding cost", ftp_eff)]
    drivers.sort(key=lambda kv: abs(kv[1]), reverse=True)
    top_driver_name, top_driver_val = drivers[0]
    direction = "tailwind" if top_driver_val >= 0 else "headwind"
    out.append(
        f"YTD PBT of {_fmt_nok_m(actual['pbt'])} runs {_signed_pct(pbt_var_pct)} vs budget "
        f"({_fmt_nok_m(pbt_var)}); the largest NII driver is "
        f"{top_driver_name} ({_fmt_nok_m(top_driver_val)} {direction})."
    )

    # -- 2. Cost of risk / impairment spike -------------------------------
    # Look at LSF (or whichever line has the largest impairment over-run)
    over_runs = sorted(
        per_line,
        key=lambda r: r["loan_impairment"] - r["loan_impairment_budget"],
        reverse=True,
    )
    worst = over_runs[0]
    imp_var = worst["loan_impairment"] - worst["loan_impairment_budget"]
    if imp_var > 25:
        out.append(
            f"{worst['product_line']} loan impairment of "
            f"{_fmt_nok_m(worst['loan_impairment'])} runs "
            f"{_fmt_nok_m(imp_var)} above budget — review provisioning trajectory "
            f"and concentration in the affected sub-portfolios."
        )
    else:
        # Fallback: comment on C/I deterioration
        ci_var = actual["ci_ratio_pct"] - budget["ci_ratio_pct"]
        out.append(
            f"Cost/income ratio at {_fmt_pct(actual['ci_ratio_pct'])} runs "
            f"{_fmt_pp(ci_var)} vs budget — "
            f"{'unfavourable, opex growing faster than income' if ci_var > 0 else 'favourable; income leverage holding up'}."
        )

    # -- 3. ROAC vs hurdle dispersion -------------------------------------
    above = [r for r in roac_vs_hurdle if r["hurdle_status"] == "above_hurdle"]
    below = [r for r in roac_vs_hurdle if r["hurdle_status"] == "below_hurdle"]
    if below:
        worst_roac = min(below, key=lambda r: r["roac_pct"])
        gap = worst_roac["hurdle_pct"] - worst_roac["roac_pct"]
        out.append(
            f"{len(below)} of {len(roac_vs_hurdle)} product lines trail the "
            f"{_fmt_pct(worst_roac['hurdle_pct'])} hurdle; "
            f"{worst_roac['product_line']} is widest at "
            f"{_fmt_pct(worst_roac['roac_pct'])} ({_fmt_pp(-gap)} below) — "
            f"capital reallocation or RWA optimisation should be on the table."
        )
    else:
        best = max(above, key=lambda r: r["roac_pct"])
        out.append(
            f"All {len(roac_vs_hurdle)} product lines clear the "
            f"{_fmt_pct(best['hurdle_pct'])} hurdle; "
            f"{best['product_line']} leads at {_fmt_pct(best['roac_pct'])}."
        )

    return out
