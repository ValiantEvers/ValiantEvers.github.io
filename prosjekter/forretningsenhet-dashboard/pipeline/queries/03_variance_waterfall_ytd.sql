-- NII variance waterfall, YTD Actual vs YTD Budget.
-- For volume-driven products (lending + deposit), decompose the variance into:
--   volume effect  = ΔVolume × BudgetMargin
--   margin effect  = ActualVolume × ΔCustomerRate × signCR
--   FTP effect     = ActualVolume × ΔFTPRate × signFTP
-- where signs depend on whether the product is lending- or deposit-funded:
--   lending: marginCR>0, marginFTP<0  (higher customer rate good, higher FTP bad)
--   deposit: marginCR<0, marginFTP>0  (higher customer rate bad, higher FTP good)
-- Non-volume products land in the "other" residual.

WITH ytd_actual AS (
    SELECT
        product_line, side,
        SUM(nii)            AS nii,
        AVG(lending_volume) AS avg_volume,
        AVG(customer_rate)  AS avg_cr,
        AVG(ftp_rate)       AS avg_ftp
    FROM bu_monthly
    WHERE version = 'Actual'
      AND period BETWEEN :ytd_start AND :latest_actual
    GROUP BY product_line, side
),
ytd_budget AS (
    SELECT
        product_line, side,
        SUM(nii)            AS nii,
        AVG(lending_volume) AS avg_volume,
        AVG(customer_rate)  AS avg_cr,
        AVG(ftp_rate)       AS avg_ftp
    FROM bu_monthly
    WHERE version = 'Budget'
      AND period BETWEEN :ytd_start AND :latest_actual
    GROUP BY product_line, side
),
joined AS (
    SELECT
        a.product_line, a.side,
        b.nii          AS budget_nii,
        a.nii          AS actual_nii,
        b.avg_volume   AS b_vol,
        a.avg_volume   AS a_vol,
        b.avg_cr       AS b_cr,
        a.avg_cr       AS a_cr,
        b.avg_ftp      AS b_ftp,
        a.avg_ftp      AS a_ftp,
        :ytd_months    AS months
    FROM ytd_actual a
    JOIN ytd_budget b USING (product_line, side)
)
SELECT
    'budget_nii'    AS bucket,
    ROUND(SUM(budget_nii), 1) AS value
FROM joined
UNION ALL
SELECT
    'volume_effect',
    ROUND(
        SUM(CASE WHEN side = 'lending'
                 THEN (a_vol - b_vol) * (b_cr - b_ftp) / 12.0 * months
                 WHEN side = 'deposit'
                 THEN (a_vol - b_vol) * (b_ftp - b_cr) / 12.0 * months
                 ELSE 0 END),
        1)
FROM joined
UNION ALL
SELECT
    'customer_rate_effect',
    ROUND(
        SUM(CASE WHEN side = 'lending'
                 THEN a_vol * (a_cr - b_cr) / 12.0 * months
                 WHEN side = 'deposit'
                 THEN a_vol * (b_cr - a_cr) / 12.0 * months
                 ELSE 0 END),
        1)
FROM joined
UNION ALL
SELECT
    'ftp_effect',
    ROUND(
        SUM(CASE WHEN side = 'lending'
                 THEN a_vol * (b_ftp - a_ftp) / 12.0 * months
                 WHEN side = 'deposit'
                 THEN a_vol * (a_ftp - b_ftp) / 12.0 * months
                 ELSE 0 END),
        1)
FROM joined
UNION ALL
SELECT
    'other_nii_effect',
    ROUND(
        (SELECT COALESCE(SUM(nii), 0) FROM ytd_actual WHERE side = 'other')
      - (SELECT COALESCE(SUM(nii), 0) FROM ytd_budget WHERE side = 'other'),
        1)
UNION ALL
SELECT
    'actual_nii',
    ROUND(SUM(actual_nii), 1)
    + (SELECT COALESCE(SUM(nii), 0) FROM ytd_actual WHERE side = 'other')
    - (SELECT COALESCE(SUM(actual_nii), 0) FROM joined WHERE side = 'other')
FROM joined;
