-- KPIs for year-to-date (:ytd_start through :latest_actual inclusive).
-- ROAC is annualised by dividing PBT by months elapsed and multiplying by 12.

SELECT
    version,
    ROUND(SUM(nii), 1)                AS nii,
    ROUND(SUM(fee_income), 1)         AS fee_income,
    ROUND(SUM(nii + fee_income), 1)   AS total_income,
    ROUND(SUM(opex), 1)               AS opex,
    ROUND(SUM(loan_impairment), 1)    AS loan_impairment,
    ROUND(SUM(nii + fee_income - opex - loan_impairment), 1) AS pbt,
    -- Avg allocated capital across the YTD window
    ROUND(AVG(allocated_capital_total), 1) AS allocated_capital_avg,
    ROUND(100.0 * SUM(opex) / NULLIF(SUM(nii + fee_income), 0), 1) AS ci_ratio_pct,
    ROUND(
        100.0
        * (12.0 / :ytd_months)
        * SUM(nii + fee_income - opex - loan_impairment)
        / NULLIF(AVG(allocated_capital_total), 0),
        1
    ) AS roac_pct_annualised
FROM (
    SELECT
        version,
        period,
        SUM(nii) AS nii,
        SUM(fee_income) AS fee_income,
        SUM(opex) AS opex,
        SUM(loan_impairment) AS loan_impairment,
        SUM(allocated_capital) AS allocated_capital_total
    FROM bu_monthly
    WHERE period BETWEEN :ytd_start AND :latest_actual
    GROUP BY version, period
)
GROUP BY version
ORDER BY version;
