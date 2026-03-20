-- Rebuild reviews_with_details view
-- Only homeowner and company (tradesperson) types exist in this app.
DROP VIEW IF EXISTS reviews_with_details;
CREATE VIEW reviews_with_details AS
SELECT
    r.*,
    -- Reviewer display name (full)
    CASE r.reviewer_type
        WHEN 'homeowner' THEN h.first_name || ' ' || h.last_name
        WHEN 'company'   THEN c.company_name
    END AS reviewer_name,
    -- First name for "John D." formatting
    CASE r.reviewer_type
        WHEN 'homeowner' THEN h.first_name
        WHEN 'company'   THEN c.company_name
    END AS reviewer_first_name,
    -- Last name for "John D." formatting
    CASE r.reviewer_type
        WHEN 'homeowner' THEN h.last_name
        ELSE NULL
    END AS reviewer_last_name,
    -- Reviewer photo
    CASE r.reviewer_type
        WHEN 'homeowner' THEN h.profile_photo_url
        WHEN 'company'   THEN c.logo_url
    END AS reviewer_photo,
    -- Reviewed display name
    CASE r.reviewed_type
        WHEN 'homeowner' THEN h2.first_name || ' ' || h2.last_name
        WHEN 'company'   THEN c2.company_name
    END AS reviewed_name,
    -- Job title
    j.title AS job_title
FROM reviews r
LEFT JOIN jobs j               ON r.job_id     = j.id
LEFT JOIN homeowner_profiles h  ON r.reviewer_id = h.user_id AND r.reviewer_type = 'homeowner'
LEFT JOIN company_profiles   c  ON r.reviewer_id = c.user_id AND r.reviewer_type = 'company'
LEFT JOIN homeowner_profiles h2 ON r.reviewed_id = h2.user_id AND r.reviewed_type = 'homeowner'
LEFT JOIN company_profiles   c2 ON r.reviewed_id = c2.user_id AND r.reviewed_type = 'company';
