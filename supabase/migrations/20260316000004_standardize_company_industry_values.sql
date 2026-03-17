-- Standardize company_profiles.industry values to match TRADE_INDUSTRIES titles.
-- Maps legacy free-text/broad industry names → new structured titles.

UPDATE company_profiles SET industry =
  CASE
    -- Plumbing & Heating
    WHEN industry ILIKE '%plumb%'
      OR industry ILIKE '%heating%'
      OR industry ILIKE '%boiler%'
      OR industry ILIKE '%gas engineer%'
      THEN 'Plumbing & Heating'

    -- Electrical
    WHEN industry ILIKE '%electr%'
      OR industry ILIKE '%elétr%'
      THEN 'Electrical'

    -- Construction & Renovation
    WHEN industry ILIKE '%construct%'
      OR industry ILIKE '%building%'
      OR industry ILIKE '%renovation%'
      OR industry ILIKE '%general contrac%'
      OR industry ILIKE '%builder%'
      OR industry ILIKE '%bricklaying%'
      OR industry ILIKE '%plastering%'
      OR industry ILIKE '%scaffolding%'
      OR industry ILIKE '%demolition%'
      THEN 'Construction & Renovation'

    -- Painting & Decorating
    WHEN industry ILIKE '%painting%'
      OR industry ILIKE '%decorating%'
      OR industry ILIKE '%decorator%'
      OR industry ILIKE '%wallpaper%'
      THEN 'Painting & Decorating'

    -- Roofing
    WHEN industry ILIKE '%roofing%'
      OR industry ILIKE '%roofer%'
      OR industry ILIKE '%guttering%'
      OR industry ILIKE '%fascia%'
      OR industry ILIKE '%chimney%'
      THEN 'Roofing'

    -- Carpentry & Joinery
    WHEN industry ILIKE '%carpentry%'
      OR industry ILIKE '%joinery%'
      OR industry ILIKE '%kitchen fitter%'
      OR industry ILIKE '%door fitting%'
      OR industry ILIKE '%window fitting%'
      OR industry ILIKE '%window install%'
      THEN 'Carpentry & Joinery'

    -- Gardening & Landscaping
    WHEN industry ILIKE '%garden%'
      OR industry ILIKE '%landscap%'
      OR industry ILIKE '%tree surgeon%'
      OR industry ILIKE '%lawn%'
      OR industry ILIKE '%patio%'
      THEN 'Gardening & Landscaping'

    -- Flooring & Tiling
    WHEN industry ILIKE '%flooring%'
      OR industry ILIKE '%tiling%'
      OR industry ILIKE '%tiler%'
      OR industry ILIKE '%carpet%'
      OR industry ILIKE '%laminate%'
      OR industry ILIKE '%hardwood floor%'
      THEN 'Flooring & Tiling'

    -- Cleaning
    WHEN industry ILIKE '%cleaning%'
      OR industry ILIKE '%cleaner%'
      OR industry ILIKE '%limpeza%'
      OR industry ILIKE '%pressure wash%'
      OR industry ILIKE '%property maintenance%'
      THEN 'Cleaning'

    -- Handyman / Small Jobs
    WHEN industry ILIKE '%handyman%'
      OR industry ILIKE '%odd jobs%'
      OR industry ILIKE '%general repair%'
      OR industry ILIKE '%furniture assembly%'
      OR industry ILIKE '%locksmith%'
      THEN 'Handyman / Small Jobs'

    -- Waste Removal
    WHEN industry ILIKE '%waste%'
      OR industry ILIKE '%clearance%'
      OR industry ILIKE '%junk removal%'
      OR industry ILIKE '%man and van%'
      OR industry ILIKE '%man & van%'
      OR industry ILIKE '%furniture removal%'
      THEN 'Waste Removal'

    -- Fencing & Gates
    WHEN industry ILIKE '%fencing%'
      OR industry ILIKE '%fence%'
      OR industry ILIKE '%gate install%'
      THEN 'Fencing & Gates'

    -- Leave unchanged if already a valid TRADE_INDUSTRIES title
    WHEN industry IN (
      'Plumbing & Heating', 'Electrical', 'Construction & Renovation',
      'Painting & Decorating', 'Roofing', 'Carpentry & Joinery',
      'Gardening & Landscaping', 'Flooring & Tiling', 'Cleaning',
      'Handyman / Small Jobs', 'Waste Removal', 'Fencing & Gates',
      'Not sure / Other'
    ) THEN industry

    -- Anything unmatched → Not sure / Other
    ELSE 'Not sure / Other'
  END
WHERE industry IS NOT NULL AND industry != '';
