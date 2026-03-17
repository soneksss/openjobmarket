-- Backfill coordinates on homeowner jobs that are missing lat/lng.
-- Copy from the homeowner_profile when the profile has coordinates.
-- Jobs created via the old form never captured coordinates; this patches them.

UPDATE jobs j
SET
  latitude  = hp.latitude,
  longitude = hp.longitude
FROM homeowner_profiles hp
WHERE j.homeowner_id = hp.id
  AND j.latitude  IS NULL
  AND j.longitude IS NULL
  AND hp.latitude  IS NOT NULL
  AND hp.longitude IS NOT NULL;
