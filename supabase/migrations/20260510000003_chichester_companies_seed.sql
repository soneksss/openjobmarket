-- ============================================================
-- Chichester-area company seed  (source: Chichester_emails_csv.csv)
--
-- Step 1: Add normalised_categories text[] column so multi-trade
--         companies appear under all relevant filter categories.
-- Step 2: Insert Chichester companies with coordinates (approximated
--         from postcode centroids where GPS was not in source data).
-- Step 3: Back-fill normalised_categories for Havant companies that
--         cover multiple trades.
-- ============================================================

-- ── 1. Schema ─────────────────────────────────────────────────────────────────

ALTER TABLE public.seeded_trades
  ADD COLUMN IF NOT EXISTS normalised_categories text[];

-- ── 2. Chichester-area inserts ────────────────────────────────────────────────

INSERT INTO public.seeded_trades
  (company_name, trade_category, normalised_categories,
   address, postcode, lat, lng, email, phone, website, source)
VALUES

-- ── Construction & Renovation ─────────────────────────────────────────────────

(
  'Lucking Brothers South Ltd',
  'Construction & Renovation',
  ARRAY['Construction & Renovation'],
  'North St, Petworth',
  'GU28 9NH',
  50.9836, -0.6109,
  'builders@luckingbrotherssouth.co.uk',
  '+44 1798 342365',
  'https://www.luckingbrotherssouth.co.uk/',
  'csv_import'
),
(
  -- Multi-trade: construction, roofing, carpentry, painting, flooring
  'Petworth Builders & Roofers Ltd',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Roofing','Carpentry & Joinery','Painting & Decorating','Flooring & Tiling'],
  'Ranville Cl, Petworth',
  'GU28 0EN',
  50.9630, -0.6090,
  'info@petworthbuilders.co.uk',
  '+44 7946 769144',
  'https://www.petworthbuilders.co.uk/',
  'csv_import'
),
(
  'Ascia Construction',
  'Construction & Renovation',
  ARRAY['Construction & Renovation'],
  'The Portico, Stansted House, Rowlands Castle',
  'PO9 6DX',
  50.8938, -0.9589,
  'info@asciaconstruction.co.uk',
  '+44 23 9200 6344',
  'https://asciaconstruction.co.uk/',
  'csv_import'
),
(
  -- Facilities & construction — general contracting + maintenance
  'JFD Facilities and Construction',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Handyman / Small Jobs'],
  'Unit 4 Gravel Ln, Quarry Ln, Chichester',
  'PO19 8PQ',
  50.8374, -0.7748,
  'enquiries@jfdfandc.com',
  '+44 1243 215263',
  'https://jfdfandc.com/',
  'csv_import'
),
(
  'DM Building & Restoration Limited',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Plastering & Rendering'],
  'Stansted House, The Old Tack Room, Rowlands Castle',
  'PO9 6DX',
  50.8945, -0.9595,
  'info@dmbr.co.uk',
  '+44 333 772 1364',
  'https://www.dmbr.co.uk/',
  'csv_import'
),
(
  -- Heritage & conservation building firm
  'AIM Heritage & Development',
  'Construction & Renovation',
  ARRAY['Construction & Renovation'],
  'The Yard, Aldsworth Manor Farm, Emsworth',
  'PO10 8QT',
  50.8469, -0.9183,
  'office@aim.works',
  '+44 1243 389783',
  'http://aim.works/',
  'csv_import'
),
(
  -- Full-service: construction, electrical, plumbing, carpentry
  'Pinnacle Works Ltd',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Electrical','Plumbing & Heating','Carpentry & Joinery'],
  'Unit 1 Phoenix Business Centre, Spur Rd, Chichester',
  'PO19 8PN',
  50.8393, -0.7752,
  'enquiries@pinnacleworks.co.uk',
  '+44 1243 584636',
  'https://www.pinnacleworks.co.uk/',
  'csv_import'
),
(
  'Hambrook Construction Ltd',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Carpentry & Joinery'],
  'White Lodge, Hambrook, Chichester',
  'PO18 8RG',
  50.8637, -0.8068,
  'info@hambrookcarpentry.co.uk',
  '+44 7903 967356',
  'https://hambrookcarpentry.co.uk/',
  'csv_import'
),
(
  -- Driveway & patio specialists
  'More Than Driveways',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Gardening & Landscaping'],
  'Scant Rd E, Hambrook, Chichester',
  'PO18 8UB',
  50.8621, -0.8055,
  'info@morethandriveways.co.uk',
  '+44 1243 888682',
  'http://morethandriveways.co.uk/',
  'csv_import'
),
(
  'Garsden Pepper Ltd',
  'Construction & Renovation',
  ARRAY['Construction & Renovation'],
  'Graffham Cmn Rd, Petworth',
  'GU28 0PT',
  50.9795, -0.6353,
  'mduke@garsdenpepper.co.uk',
  '+44 7977 991995',
  'https://www.garsdenpepper.com/',
  'csv_import'
),
(
  -- Property maintenance, project management, construction
  'DMP Buildtech',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Handyman / Small Jobs'],
  'Old Army Barracks, Cemetery Ln, Emsworth',
  'PO10 8SB',
  50.8474, -0.9308,
  'hello@dmpbuildtech.co.uk',
  '+44 1243 767620',
  'https://www.dmpbuildtech.co.uk/',
  'csv_import'
),
(
  'Pegasus Builders',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Carpentry & Joinery'],
  'Wenham Barn, Wenham Manor, Rogate, Petersfield',
  'GU31 5AY',
  51.0037, -0.8956,
  'info@pegasusbuilders.co.uk',
  '+44 1730 266205',
  'http://www.pegasusbuilders.co.uk/',
  'csv_import'
),
(
  -- Natural building / Goodwood Estate; lime & natural plaster
  'Built By Artizans',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Plastering & Rendering'],
  'Woods Bldg the Wharf, 3, Midhurst',
  'GU29 9PX',
  51.0065, -0.7368,
  'hello@builtbyartizans.co.uk',
  '+44 1730 815885',
  'http://www.builtbyartizans.co.uk/',
  'csv_import'
),
(
  'Richardsons (Nyewood) Ltd',
  'Construction & Renovation',
  ARRAY['Construction & Renovation','Gardening & Landscaping'],
  'Station Yard, Nyewood, Petersfield',
  'GU31 5HX',
  51.0034, -0.9052,
  'office@r-nl.co.uk',
  '+44 1730 821771',
  'http://www.richardsons-nyewood.co.uk/',
  'csv_import'
),

-- ── Plastering & Rendering ────────────────────────────────────────────────────

(
  -- Lime plaster + marble/stone flooring & wall finishes
  'Lime & Marble Ltd',
  'Plastering & Rendering',
  ARRAY['Plastering & Rendering','Flooring & Tiling','Construction & Renovation'],
  'Unit 2, St James Industrial Estate, Chichester',
  'PO19 7JU',
  50.8360, -0.7709,
  'info@limeandmarble.com',
  '+44 7535 969540',
  'https://www.limeandmarble.com/',
  'csv_import'
),

-- ── Carpentry & Joinery ───────────────────────────────────────────────────────

(
  'R W Armstrong & Sons',
  'Carpentry & Joinery',
  ARRAY['Carpentry & Joinery','Construction & Renovation'],
  '1a, Oakwood Business Park, East Ashling, Chichester',
  'PO18 9AL',
  50.8660, -0.8222,
  'info@daedalusconservation.co.uk',
  '+44 1243 865771',
  'http://www.rwarmstrong.co.uk/',
  'csv_import'
),
(
  'Chichester Carpentry & Building Ltd',
  'Carpentry & Joinery',
  ARRAY['Carpentry & Joinery','Construction & Renovation'],
  'Unit 72, Enterprise Centre, Terminus Rd, Chichester',
  'PO19 8FY',
  50.8397, -0.7691,
  'accounts@chichestercarpentry.co.uk',
  '+44 1243 537601',
  'https://www.chichestercarpentry.co.uk/',
  'csv_import'
),
(
  -- Award-winning timber structures: oak frames, garden buildings, bridges
  'The Green Oak Carpentry Company',
  'Carpentry & Joinery',
  ARRAY['Carpentry & Joinery','Construction & Renovation','Gardening & Landscaping'],
  'Langley Farm Rd, Rake, Liss',
  'GU33 7JW',
  51.0480, -0.8839,
  'enquiries@greenoakcarpentry.co.uk',
  '+44 1730 892049',
  'https://www.greenoakcarpentry.co.uk/',
  'csv_import'
),
(
  -- Garden rooms, sunrooms, skylights — Carpentry + Gardening
  'English Garden Rooms',
  'Carpentry & Joinery',
  ARRAY['Carpentry & Joinery','Gardening & Landscaping','Construction & Renovation'],
  'Whithorne House, Lambert''s Ln, Midhurst',
  'GU29 9DH',
  51.0060, -0.7394,
  'sales@englishgardenrooms.co.uk',
  '+44 1730 815690',
  'https://englishgardenrooms.co.uk/',
  'csv_import'
),

-- ── Roofing ───────────────────────────────────────────────────────────────────

(
  -- Tiling, slating, flat roofing, lead, repointing (masonry)
  'Morley & Sons Roofing',
  'Roofing',
  ARRAY['Roofing','Construction & Renovation','Plastering & Rendering'],
  'Bracklesham Ln, Chichester',
  'PO20 8JF',
  50.7843, -0.7978,
  'morleyandsonsroofing@gmail.com',
  '+44 7375 543882',
  'http://www.morleyandsonsroofing.co.uk/',
  'csv_import'
),

-- ── Electrical ────────────────────────────────────────────────────────────────

(
  -- Electrician + solar PV installations
  'Chi-Lec Electrical Contractors Ltd',
  'Electrical',
  ARRAY['Electrical'],
  'Parchment St, Chichester',
  'PO19 3BX',
  50.8372, -0.7820,
  'info@chi-lec.com',
  '+44 7759 045007',
  'https://chi-lec.com/',
  'csv_import'
),

-- ── Plumbing & Heating ────────────────────────────────────────────────────────

(
  -- Gas engineer + heating + solar energy
  'T J Porter Heating Solutions & Energy Services',
  'Plumbing & Heating',
  ARRAY['Plumbing & Heating','Electrical','Air Conditioning & Ventilation'],
  'Rosedale, Ashfield Rd, Midhurst',
  'GU29 9JX',
  51.0059, -0.7392,
  'info@porterheating.co.uk',
  '+44 1798 879929',
  'https://www.porterheating.co.uk/',
  'csv_import'
),

-- ── Fencing & Gates ───────────────────────────────────────────────────────────

(
  -- No address in source data — lat/lng NULL; won't appear on map
  'Elite Boundaries',
  'Fencing & Gates',
  ARRAY['Fencing & Gates','Construction & Renovation'],
  NULL,
  NULL,
  NULL, NULL,
  'enquires@eliteboundaries.co.uk',
  '+44 7376 460922',
  'https://eliteboundaries.co.uk/',
  'csv_import'
),

-- ── Cleaning ─────────────────────────────────────────────────────────────────

(
  -- Property maintenance, gutter cleaning, pressure washing, painting
  'MC Property Maintenance',
  'Cleaning',
  ARRAY['Cleaning','Painting & Decorating','Handyman / Small Jobs'],
  'Crowshall Farm, Chilgrove Road, Chichester',
  'PO18 9HP',
  50.8703, -0.8207,
  'info@mcpm.co.uk',
  '+44 1243 530076',
  'https://www.mcpropertymaintenance.co.uk/',
  'csv_import'
),
(
  -- Laundry + house cleaning + property services
  'Home & Dry Garment Care and Home Services',
  'Cleaning',
  ARRAY['Cleaning'],
  '1, St James'' Works, St Pancras, Chichester',
  'PO19 7NN',
  50.8368, -0.7712,
  'info@homeanddry.biz',
  '+44 1243 543877',
  'http://www.homeanddry.biz/',
  'csv_import'
),
(
  -- Chimney sweep + web services (primary trade: chimney sweep)
  'Shaun The Sweep',
  'Cleaning',
  ARRAY['Cleaning','Handyman / Small Jobs'],
  '20 Montague Rd, Easebourne, Midhurst',
  'GU29 9BJ',
  51.0045, -0.7345,
  'shaun@shaunthesweep.co.uk',
  '+44 1730 817359',
  'http://www.shaunthesweep.co.uk/',
  'csv_import'
),

-- ── Moving & Transport ────────────────────────────────────────────────────────

(
  'Churchill Freight Services',
  'Moving & Transport',
  ARRAY['Moving & Transport'],
  'Bognor Rd, Chichester',
  'PO20 1BF',
  50.8249, -0.7578,
  'transport@churchill-freight.com',
  '+44 1243 531239',
  'https://www.churchill-freight.com/about-us',
  'csv_import'
),
(
  -- Specialist boat transport (no email in source)
  'Shoreline Interboat',
  'Moving & Transport',
  ARRAY['Moving & Transport'],
  '1 Hunston Villas, Hunston, Chichester',
  'PO20 1NR',
  50.8228, -0.7715,
  NULL,
  '+44 1243 785370',
  'https://www.boattrans.co.uk/',
  'csv_import'
)

ON CONFLICT (company_name, postcode) DO NOTHING;

-- ── 3. Back-fill normalised_categories for Havant companies ───────────────────
-- Multi-trade companies that were seeded without normalised_categories.
-- These were already inserted; we update only where normalised_categories is NULL.

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Carpentry & Joinery']
  WHERE company_name = 'D & H Carpentry and Construction LTD' AND normalised_categories IS NULL;

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Electrical','Gardening & Landscaping']
  WHERE company_name = 'Develotec' AND normalised_categories IS NULL;

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Electrical','Plumbing & Heating','Gardening & Landscaping','Plastering & Rendering','Carpentry & Joinery']
  WHERE company_name = 'Welton Property Ltd' AND normalised_categories IS NULL;

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Gardening & Landscaping','Carpentry & Joinery','Flooring & Tiling','Handyman / Small Jobs']
  WHERE company_name = 'Home And Garden Solutions' AND normalised_categories IS NULL;

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Electrical','Air Conditioning & Ventilation']
  WHERE company_name = 'RMD Electrical & Renewables' AND normalised_categories IS NULL;

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Plumbing & Heating','Air Conditioning & Ventilation']
  WHERE company_name = 'Dragon Domestic Gas Services Ltd' AND normalised_categories IS NULL;

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Gardening & Landscaping']
  WHERE company_name = 'Royale Drives Ltd' AND normalised_categories IS NULL;

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Cleaning','Handyman / Small Jobs']
  WHERE company_name = 'Leaves Building and Maintenance Contractors Limited' AND normalised_categories IS NULL;

UPDATE public.seeded_trades SET normalised_categories = ARRAY['Construction & Renovation','Carpentry & Joinery']
  WHERE company_name = 'B H I Building Services' AND normalised_categories IS NULL;

-- For single-category companies, default normalised_categories to their trade_category
-- (avoids NULL — makes future cs.{} queries predictable)
UPDATE public.seeded_trades
  SET normalised_categories = ARRAY[trade_category]
  WHERE normalised_categories IS NULL AND trade_category IS NOT NULL;
