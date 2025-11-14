-- Debug: Check all columns in company_profiles table

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'company_profiles'
ORDER BY
    ordinal_position;
