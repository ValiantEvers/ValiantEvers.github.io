-- KPI tiles for the latest closed month (parameterised at runtime as :period).
-- Returns division totals for that month: Actual, Budget, Forecast.
-- Frontend uses these to render the four KPI tiles (Income, C/I, ROAC, PBT).

SELECT
    version,
    ROUND(SUM(nii), 1)               AS nii,
    ROUND(SUM(fee_income), 1)        AS fee_income,
    ROUND(SUM(nii + fee_income), 1)  AS total_income,
    ROUND(SUM(opex), 1)              AS opex,
    ROUND(SUM(loan_impairment), 1)   AS loan_impairment,
    ROUND(SUM(nii + fee_income - opex - loan_impairment), 1) AS pbt,
    ROUND(SUM(allocated_capital), 1) AS allocated_capital,
    ROUND(SUM(rwa), 1)               AS rwa,
    -- C/I = opex / income
    ROUND(100.0 * SUM(opex) / NULLIF(SUM(nii + fee_income), 0), 1) AS ci_ratio_pct,
    -- ROAC = annualised PBT / allocated capital
    ROUND(100.0 * 12.0 * SUM(nii + fee_income - opex - loan_impairment)
                  / NULLIF(SUM(allocated_capital), 0), 1) AS roac_pct
FROM bu_monthly
WHERE period = :period
GROUP BY version
ORDER BY version;
