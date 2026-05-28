-- Full-year view used by the third KPI panel.
-- "Actual+Forecast" = sum of Actual months (Jan–:latest_actual) PLUS
-- Forecast months (after :latest_actual through year-end).
-- Compared against the Full Year Budget.

WITH all_months AS (
    SELECT
        CASE
            WHEN version = 'Actual'   AND period BETWEEN :fy_start AND :latest_actual THEN 'fy_view'
            WHEN version = 'Forecast' AND period BETWEEN :first_forecast AND :fy_end  THEN 'fy_view'
            WHEN version = 'Budget'   AND period BETWEEN :fy_start AND :fy_end        THEN 'fy_budget'
            ELSE NULL
        END AS bucket,
        period,
        product_line,
        nii, fee_income, opex, loan_impairment, allocated_capital
    FROM bu_monthly
)
SELECT
    bucket,
    ROUND(SUM(nii), 1)                AS nii,
    ROUND(SUM(fee_income), 1)         AS fee_income,
    ROUND(SUM(nii + fee_income), 1)   AS total_income,
    ROUND(SUM(opex), 1)               AS opex,
    ROUND(SUM(loan_impairment), 1)    AS loan_impairment,
    ROUND(SUM(nii + fee_income - opex - loan_impairment), 1) AS pbt,
    ROUND(100.0 * SUM(opex) / NULLIF(SUM(nii + fee_income), 0), 1) AS ci_ratio_pct,
    ROUND(
        100.0 * SUM(nii + fee_income - opex - loan_impairment)
              / NULLIF(
                  (SELECT AVG(allocated_capital_total)
                   FROM (
                       SELECT period, SUM(allocated_capital) AS allocated_capital_total
                       FROM bu_monthly
                       WHERE version = 'Budget'
                         AND period BETWEEN :fy_start AND :fy_end
                       GROUP BY period
                   )), 0),
        1
    ) AS roac_pct
FROM all_months
WHERE bucket IS NOT NULL
GROUP BY bucket
ORDER BY bucket;
