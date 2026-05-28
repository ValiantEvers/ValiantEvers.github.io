-- Per-product-line YTD table: Actual income, opex, C/I, ROAC,
-- allocated capital, and the Actual-vs-Budget variance on each.

WITH per_line AS (
    SELECT
        product_line,
        version,
        SUM(nii)                AS nii,
        SUM(fee_income)         AS fee_income,
        SUM(nii + fee_income)   AS total_income,
        SUM(opex)               AS opex,
        SUM(loan_impairment)    AS loan_impairment,
        SUM(nii + fee_income - opex - loan_impairment) AS pbt,
        AVG(allocated_capital)  AS allocated_capital_avg
    FROM bu_monthly
    WHERE period BETWEEN :ytd_start AND :latest_actual
    GROUP BY product_line, version
)
SELECT
    a.product_line,
    ROUND(a.total_income, 1)              AS total_income,
    ROUND(b.total_income, 1)              AS total_income_budget,
    ROUND(a.total_income - b.total_income, 1) AS total_income_var,
    ROUND(a.opex, 1)                      AS opex,
    ROUND(b.opex, 1)                      AS opex_budget,
    ROUND(a.opex - b.opex, 1)             AS opex_var,
    ROUND(a.loan_impairment, 1)           AS loan_impairment,
    ROUND(b.loan_impairment, 1)           AS loan_impairment_budget,
    ROUND(a.pbt, 1)                       AS pbt,
    ROUND(b.pbt, 1)                       AS pbt_budget,
    ROUND(a.pbt - b.pbt, 1)               AS pbt_var,
    ROUND(100.0 * a.opex / NULLIF(a.total_income, 0), 1) AS ci_ratio_pct,
    ROUND(100.0 * b.opex / NULLIF(b.total_income, 0), 1) AS ci_ratio_pct_budget,
    ROUND(a.allocated_capital_avg, 1)     AS allocated_capital_avg,
    -- Annualised ROAC = (12 / ytd_months) × PBT / avg allocated capital
    ROUND(100.0 * (12.0 / :ytd_months) * a.pbt
          / NULLIF(a.allocated_capital_avg, 0), 1) AS roac_pct,
    ROUND(100.0 * (12.0 / :ytd_months) * b.pbt
          / NULLIF(b.allocated_capital_avg, 0), 1) AS roac_pct_budget
FROM per_line a
JOIN per_line b
  ON a.product_line = b.product_line
WHERE a.version = 'Actual' AND b.version = 'Budget'
ORDER BY a.total_income DESC;
