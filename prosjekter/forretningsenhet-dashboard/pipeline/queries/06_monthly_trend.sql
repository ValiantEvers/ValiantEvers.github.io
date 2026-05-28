-- Monthly division-level time series used by the sensitivity panel as a baseline
-- and by the dashboard trend chart. Returns one row per (period, version).

SELECT
    period,
    version,
    ROUND(SUM(nii), 1)               AS nii,
    ROUND(SUM(fee_income), 1)        AS fee_income,
    ROUND(SUM(nii + fee_income), 1)  AS total_income,
    ROUND(SUM(opex), 1)              AS opex,
    ROUND(SUM(loan_impairment), 1)   AS loan_impairment,
    ROUND(SUM(nii + fee_income - opex - loan_impairment), 1) AS pbt,
    ROUND(SUM(allocated_capital), 1) AS allocated_capital,
    ROUND(SUM(lending_volume), 1)    AS lending_volume_total
FROM bu_monthly
GROUP BY period, version
ORDER BY period, version;
