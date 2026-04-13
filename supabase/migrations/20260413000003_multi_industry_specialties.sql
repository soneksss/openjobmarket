-- ============================================================
-- Multi-industry / specialties support
-- 1. Add industries TEXT[] to company_profiles
-- 2. Create specialties master table
-- 3. Create user_specialties join table
-- 4. Add specialty_id to jobs
-- 5. Backward compat migration
-- ============================================================

-- 1. Add industries array column (keeps single `industry` for backward compat)
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}';

-- 2. Specialties master table
CREATE TABLE IF NOT EXISTS specialties (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name   TEXT NOT NULL,
  industry TEXT NOT NULL,
  UNIQUE (name, industry)
);

-- Populate specialties from all TRADE_INDUSTRIES
INSERT INTO specialties (name, industry) VALUES
  ('Plumber',                        'Plumbing & Heating'),
  ('Gas Engineer',                   'Plumbing & Heating'),
  ('Heating Engineer',               'Plumbing & Heating'),
  ('Boiler Technician',              'Plumbing & Heating'),
  ('Boiler Repair',                  'Plumbing & Heating'),
  ('Boiler Installation',            'Plumbing & Heating'),
  ('Radiator Installation',          'Plumbing & Heating'),
  ('Leak Repair',                    'Plumbing & Heating'),
  ('Bathroom Plumbing',              'Plumbing & Heating'),
  ('Underfloor Heating Specialist',  'Plumbing & Heating'),
  ('Pipe Fitter',                    'Plumbing & Heating'),
  ('Electrician',                    'Electrical'),
  ('Solar Electrician',              'Electrical'),
  ('Electrical Engineer',            'Electrical'),
  ('Industrial Electrician',         'Electrical'),
  ('Consumer Unit / Fuse Board',     'Electrical'),
  ('Socket & Switch Installation',   'Electrical'),
  ('Lighting Installation',          'Electrical'),
  ('EV Charger Installation',        'Electrical'),
  ('Rewiring',                       'Electrical'),
  ('Fault Finding',                  'Electrical'),
  ('Fire Alarm Technician',          'Electrical'),
  ('Builder',                        'Construction & Renovation'),
  ('General Contractor',             'Construction & Renovation'),
  ('Extension Specialist',           'Construction & Renovation'),
  ('Loft Conversion Specialist',     'Construction & Renovation'),
  ('Bricklayer',                     'Construction & Renovation'),
  ('Insulation Installer',           'Construction & Renovation'),
  ('Glazier',                        'Construction & Renovation'),
  ('Scaffolder',                     'Construction & Renovation'),
  ('Welder',                         'Construction & Renovation'),
  ('Demolition',                     'Construction & Renovation'),
  ('Plasterer',                      'Plastering & Rendering'),
  ('Rendering Specialist',           'Plastering & Rendering'),
  ('Dry Lining',                     'Plastering & Rendering'),
  ('Skimming',                       'Plastering & Rendering'),
  ('Coving Specialist',              'Plastering & Rendering'),
  ('Painter & Decorator',            'Painting & Decorating'),
  ('Interior Painting',              'Painting & Decorating'),
  ('Exterior Painting',              'Painting & Decorating'),
  ('Wallpapering',                   'Painting & Decorating'),
  ('Coving & Cornicing',             'Painting & Decorating'),
  ('Roofer',                         'Roofing'),
  ('Flat Roofing',                   'Roofing'),
  ('Roof Repair',                    'Roofing'),
  ('Guttering',                      'Roofing'),
  ('Fascia & Soffit',                'Roofing'),
  ('Chimney Work',                   'Roofing'),
  ('Carpenter',                      'Carpentry & Joinery'),
  ('Joiner',                         'Carpentry & Joinery'),
  ('Kitchen Fitter',                 'Carpentry & Joinery'),
  ('Bathroom Fitter',                'Carpentry & Joinery'),
  ('Door Fitting',                   'Carpentry & Joinery'),
  ('Window Fitting',                 'Carpentry & Joinery'),
  ('Window Installer',               'Carpentry & Joinery'),
  ('Staircase Work',                 'Carpentry & Joinery'),
  ('Built-in Furniture',             'Carpentry & Joinery'),
  ('Decking',                        'Carpentry & Joinery'),
  ('Gardener',                       'Gardening & Landscaping'),
  ('Landscaper',                     'Gardening & Landscaping'),
  ('Tree Surgeon',                   'Gardening & Landscaping'),
  ('Lawn Care Specialist',           'Gardening & Landscaping'),
  ('Patio & Paving Specialist',      'Gardening & Landscaping'),
  ('Fence Installer',                'Gardening & Landscaping'),
  ('Flooring Specialist',            'Flooring & Tiling'),
  ('Tiler',                          'Flooring & Tiling'),
  ('Carpet Fitting',                 'Flooring & Tiling'),
  ('Laminate Flooring',              'Flooring & Tiling'),
  ('Hardwood Flooring',              'Flooring & Tiling'),
  ('Bathroom Tiling',                'Flooring & Tiling'),
  ('Kitchen Tiling',                 'Flooring & Tiling'),
  ('Domestic Cleaner',               'Cleaning'),
  ('End of Tenancy Cleaner',         'Cleaning'),
  ('Commercial Cleaner',             'Cleaning'),
  ('Carpet & Upholstery Cleaning',   'Cleaning'),
  ('Pressure Washing',               'Cleaning'),
  ('Property Maintenance',           'Cleaning'),
  ('Handyman',                       'Handyman / Small Jobs'),
  ('General Handyman',               'Handyman / Small Jobs'),
  ('General Repairs',                'Handyman / Small Jobs'),
  ('Furniture Assembly',             'Handyman / Small Jobs'),
  ('Odd Jobs',                       'Handyman / Small Jobs'),
  ('Locksmith',                      'Handyman / Small Jobs'),
  ('Man & Van',                      'Waste Removal'),
  ('House Clearance',                'Waste Removal'),
  ('Junk Removal',                   'Waste Removal'),
  ('Garden Waste Removal',           'Waste Removal'),
  ('Furniture Removal',              'Waste Removal'),
  ('Fence Installer',                'Fencing & Gates'),
  ('Gate Installation',              'Fencing & Gates'),
  ('Fence Repair',                   'Fencing & Gates'),
  ('Fencing',                        'Fencing & Gates'),
  ('Air Conditioning Installation',  'Air Conditioning & Ventilation'),
  ('Air Conditioning Repair',        'Air Conditioning & Ventilation'),
  ('Air Conditioning Service',       'Air Conditioning & Ventilation'),
  ('Ventilation Systems',            'Air Conditioning & Ventilation'),
  ('Heat Pump Installation',         'Air Conditioning & Ventilation'),
  ('Commercial HVAC Systems',        'Air Conditioning & Ventilation')
ON CONFLICT (name, industry) DO NOTHING;

-- 3. user_specialties join table
CREATE TABLE IF NOT EXISTS user_specialties (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  UNIQUE (user_id, specialty_id)
);

CREATE INDEX IF NOT EXISTS idx_user_specialties_user   ON user_specialties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_specialties_spec   ON user_specialties(specialty_id);
CREATE INDEX IF NOT EXISTS idx_company_industries      ON company_profiles USING GIN(industries);

-- RLS
ALTER TABLE specialties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specialties_public_read"  ON specialties      FOR SELECT USING (true);
CREATE POLICY "user_specialties_own"     ON user_specialties FOR ALL    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_specialties_read"    ON user_specialties FOR SELECT USING (true);

-- 4. Add specialty_id to jobs (nullable — not required for existing jobs)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES specialties(id);

-- 5. Backward compat migration
-- Populate industries[] from existing single industry value
UPDATE company_profiles
  SET industries = ARRAY[industry]
  WHERE industry IS NOT NULL
    AND industry <> ''
    AND (industries IS NULL OR industries = '{}' OR array_length(industries, 1) IS NULL);

-- Populate user_specialties from existing services[] on company_profiles
INSERT INTO user_specialties (user_id, specialty_id)
SELECT DISTINCT cp.user_id, s.id
FROM company_profiles cp
CROSS JOIN LATERAL unnest(COALESCE(cp.services, '{}')) AS svc
JOIN specialties s ON s.name = svc
WHERE cp.user_id IS NOT NULL
ON CONFLICT (user_id, specialty_id) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '✓ Multi-industry specialties migration complete';
END $$;
