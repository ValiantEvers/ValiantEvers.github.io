-- Annualised YTD ROAC per product line, marked against the hurdle rate
-- (cost of capital). Frontend uses this to show which segments create
-- value above the hurdle.

SELECT
    product_line,
    ROUND(100.0 * (12.0 / :ytd_months)
          * SUM(nii + fee_income - opex - loan_impairment)
          / NULLIF(AVG(allocated_capital), 0), 1) AS roac_pct,
    ROUND(100.0 * :hurdle_rate, 1)                AS hurdle_pct,
    ROUND(AVG(allocated_capital), 1)              AS allocated_capital_avg,
    CASE
        WHEN (12.0 / :ytd_months)
             * SUM(nii + fee_income - opex - loan_impairment)
             / NULLIF(AVG(allocated_capital), 0) >= :hurdle_rate
        THEN 'above_hurdle'
        ELSE 'below_hurdle'
    END AS hurdle_status
FROM bu_monthly
WHERE version = 'Actual'
  AND period BETWEEN :ytd_start AND :latest_actual
GROUP BY product_line
ORDER BY roac_pct DESC;
