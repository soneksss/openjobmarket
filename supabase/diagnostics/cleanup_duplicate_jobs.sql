-- Delete the 6 duplicate "Cleaner" test jobs created during debugging
-- Review the list first, then uncomment the DELETE

SELECT id, title, status, created_at
FROM public.jobs
WHERE homeowner_id = '86cd5840-5804-4593-bb2e-6c0ac86943eb'
ORDER BY created_at DESC;

-- Once confirmed, delete them:
-- DELETE FROM public.jobs
-- WHERE homeowner_id = '86cd5840-5804-4593-bb2e-6c0ac86943eb';
