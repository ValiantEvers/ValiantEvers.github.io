-- Baseline numbers the JavaScript sensitivity panel mutates client-side.
-- Returns the YTD Actual numbers for each lending/deposit product:
-- current volume, customer rate, FTP rate, and total income.
-- The frontend lets the user nudge these three inputs and re-computes
-- NII and division ROAC live.

SELECT
    product_line,
    side,
    AVG(lending_volume) AS volume,
    AVG(customer_rate)  AS customer_rate,
    AVG(ftp_rate)       AS ftp_rate,
    SUM(nii)            AS ytd_nii,
    SUM(fee_income)     AS ytd_fee_income,
    SUM(opex)           AS ytd_opex,
    SUM(loan_impairment) AS ytd_impairment,
    AVG(allocated_capital) AS allocated_capital
FROM bu_monthly
WHERE version = 'Actual'
  AND period BETWEEN :ytd_start AND :latest_actual
GROUP BY product_line, side
ORDER BY product_line;
