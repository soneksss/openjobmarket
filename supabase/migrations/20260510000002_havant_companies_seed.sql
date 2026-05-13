-- ============================================================
-- Seed: Havant-area companies from Havant_companies.csv
-- Run AFTER migration 20260510000001 (adds website column)
--
-- Category mapping logic:
--   Construction company / builder / paving / loft → Construction & Renovation
--   Electrician / solar / EV charging              → Electrical & Electronic Engineering
--   Gas engineer / plumber / heating               → Plumbing & Heating
--   Landscaper / gardener                          → Gardening & Landscaping
--   Mover / courier / man and van                  → Moving & Transport
-- ============================================================

INSERT INTO public.seeded_trades
  (company_name, trade_category, address, postcode, lat, lng, email, phone, website, source)
VALUES

-- ── Construction & Renovation ──────────────────────────────

(
  'D & H Carpentry and Construction LTD',
  'Construction & Renovation',
  'Project house, Farlington, Portsmouth',
  'PO6 1RU',
  50.8432173, -1.0333585,
  'info@dh-cc.co.uk',
  '+44 23 9355 2695',
  'http://www.dh-cc.co.uk/',
  'csv_import'
),
(
  'Azzara Ltd',
  'Construction & Renovation',
  '5 Manor Cl., Havant',
  'PO9 1BD',
  50.8528737, -0.9796162,
  'info@azzaraltd.co.uk',
  '+44 7783 051153',
  'https://azzaraltd.co.uk/',
  'csv_import'
),
(
  'Develotec',
  'Construction & Renovation',
  'Unit A2, Endeavour Business Park, Havant',
  'PO9 1QN',
  50.8439018, -0.9877771,
  'projects@develotec.co.uk',
  '+44 23 9200 5142',
  'http://www.develotec.co.uk/',
  'csv_import'
),
(
  'Gregory Bros Ltd',
  'Construction & Renovation',
  'Chevron Buildings, Eastern Rd, Havant',
  'PO9 2JQ',
  50.8547127, -0.9758913,
  'office@gregorybrosltd.co.uk',
  '+44 23 9249 2322',
  'https://gregorybrosltd.co.uk/',
  'csv_import'
),
(
  'Total Construction Group Ltd',
  'Construction & Renovation',
  'Station Yard Bowes Hill, Rowlands Castle',
  'PO9 6BP',
  50.8924666, -0.9574104,
  'info@totalconstructiongroup.co.uk',
  '+44 1243 850022',
  'http://totalconstructiongroup.co.uk/',
  'csv_import'
),
(
  'Mulberry Building Contractors Ltd',
  'Construction & Renovation',
  'Unit C1 Endeavour Business Park, Penner Road, Havant',
  'PO9 1QN',
  50.843475, -0.990788,
  'enquiries@mulberrybuilding.co.uk',
  '+44 23 9245 3000',
  'http://www.mulberrybuilding.co.uk/',
  'csv_import'
),
(
  'LPJ Construction Ltd',
  'Construction & Renovation',
  '232 London Rd, Waterlooville',
  'PO7 7HB',
  50.8780443, -1.0336099,
  'info@lpjconstruction.co.uk',
  '+44 800 246 1300',
  'https://lpjconstruction.co.uk/',
  'csv_import'
),
(
  'Welton Property Ltd',
  'Construction & Renovation',
  NULL,
  NULL,
  50.8158862, -0.9558169,
  'harry@weltonproperty.co.uk',
  '+44 7361 216937',
  'https://weltonproperty.co.uk/',
  'csv_import'
),
(
  'Top-notch Lofts',
  'Construction & Renovation',
  '8 Woodington Cl, Havant',
  'PO9 5LB',
  50.8714746, -0.9723133,
  'movingup@top-notchlofts.co.uk',
  '+44 7743 908552',
  'https://top-notchlofts.co.uk/',
  'csv_import'
),
(
  'Royale Drives Ltd',
  'Construction & Renovation',
  '29 Central Rd, Drayton, Portsmouth',
  'PO6 1QG',
  50.8438673, -1.0449013,
  'royaledrives@gmail.com',
  '+44 7510 864793',
  'https://royaledrivesltd.com/',
  'csv_import'
),
(
  'Leaves Building and Maintenance Contractors Limited',
  'Construction & Renovation',
  'Unit 5, Oyster Estate, Jackson Cl, Farlington, Portsmouth',
  'PO6 1QN',
  50.8403963, -1.0424448,
  'info@leavespropertyservices.co.uk',
  '+44 23 9238 5070',
  'http://www.leavesbuilders.com/',
  'csv_import'
),
(
  'B H I Building Services',
  'Construction & Renovation',
  '224 Havant Rd, Drayton, Portsmouth',
  'PO6 1PA',
  50.8464768, -1.0486964,
  'info@bhibuildingservices.co.uk',
  '+44 23 9388 0373',
  'https://www.bhibuildingservices.co.uk/',
  'csv_import'
),
(
  'Our Space Limited',
  'Construction & Renovation',
  'Station Yard Bowes Hill, Hampshire',
  'PO9 6BP',
  50.8928221, -0.9591651,
  'info@our-spaceuk.com',
  '+44 333 242 2980',
  'https://our-spaceuk.com/',
  'csv_import'
),
(
  'Hampshire Groundwork & Surfacing Ltd',
  'Construction & Renovation',
  'Unit 1, Ashville House, 260 Havant Rd, Drayton, Portsmouth',
  'PO6 1PA',
  50.8464397, -1.0460389,
  'hampshiregroundworksurfacing@gmail.com',
  '+44 23 9236 1814',
  'http://www.hampshire-groundworks-surfacing.co.uk/',
  'csv_import'
),
(
  'Mkh Build Ltd',
  'Construction & Renovation',
  'Serpentine Rd, Widley, Waterlooville',
  'PO7 5EF',
  50.861073, -1.043031,
  'mkhbuildltd@gmail.com',
  '+44 7936 021170',
  'http://www.mkhbuildltd.co.uk/',
  'csv_import'
),
(
  'C&G Building Contractors (UK) Ltd',
  'Construction & Renovation',
  '25 London Rd, Widley, Waterlooville',
  'PO7 5AS',
  50.8578724, -1.0503108,
  'enquiries@cgbuilding.co.uk',
  '+44 23 9221 0033',
  'http://cgbuilding.co.uk/',
  'csv_import'
),
(
  'Floyd Building Services',
  'Construction & Renovation',
  NULL,
  NULL,
  50.8724474, -0.9782618,
  NULL,
  '+44 7966 190441',
  'https://floydbuildingservices.com/',
  'csv_import'
),

-- ── Electrical & Electronic Engineering ───────────────────

(
  'RMD Electrical & Renewables',
  'Electrical & Electronic Engineering',
  '7 Maylands Rd, Bedhampton, Havant',
  'PO9 3NP',
  -- lat was missing from source data; approximated from postcode PO9 3NP
  50.8620, -1.0082339,
  'info@rmdes.co.uk',
  '+44 23 9278 0885',
  'http://www.rmdelectricalandrenewables.co.uk/',
  'csv_import'
),
(
  'TVR Electrical Services Solar',
  'Electrical & Electronic Engineering',
  'Unit 13, The Wren Centre, Westbourne Rd, Emsworth',
  'PO10 7SU',
  50.8604142, -0.9297376,
  'info@tvrelectrical.co.uk',
  '+44 1243 372319',
  'https://tvrelectrical.co.uk/',
  'csv_import'
),
(
  'Helix Electrical Limited',
  'Electrical & Electronic Engineering',
  '6 Brushwood Grv, Emsworth',
  'PO10 7GT',
  50.8630818, -0.9347266,
  'info@helixelectrical.net',
  '+44 7741 473446',
  'https://helixelectrical.net/',
  'csv_import'
),
(
  'Delmar Technologies',
  'Electrical & Electronic Engineering',
  'Rose Cottage, 9 Augustine Rd, Drayton, Portsmouth',
  'PO6 1HY',
  50.8488784, -1.0470859,
  'info@delmar-tech.co.uk',
  '+44 7704 892150',
  'https://delmar-tech.co.uk/',
  'csv_import'
),

-- ── Plumbing & Heating ─────────────────────────────────────

(
  'Dragon Domestic Gas Services Ltd',
  'Plumbing & Heating',
  'Baker Barracks, 17 Swift Rd, Emsworth',
  'PO10 8EB',
  50.82529, -0.9327907,
  'bookings@dragondomesticgasservices.co.uk',
  '+44 7736 371837',
  'https://www.dragondomesticgasservices.co.uk/',
  'csv_import'
),
(
  'Fast Flow Gas Services Ltd',
  'Plumbing & Heating',
  '92 Park Ln, Bedhampton, Havant',
  'PO9 3HN',
  50.8618256, -0.9996822,
  'fastflowgasservices@hotmail.co.uk',
  '+44 7828 879334',
  'https://www.fastflowgasservices.com/',
  'csv_import'
),

-- ── Gardening & Landscaping ────────────────────────────────

(
  'Home And Garden Solutions',
  'Gardening & Landscaping',
  '89 Hursley Rd, Havant',
  'PO9 4RF',
  50.8681416, -0.9905928,
  'jonturner.hgs@hotmail.co.uk',
  '+44 23 9247 5039',
  'http://www.facebook.com/pages/Jon-Turner-Home-Garden-Solutions/188957087817120',
  'csv_import'
),

-- ── Moving & Transport ─────────────────────────────────────

(
  'Joey The Van Man Removals',
  'Moving & Transport',
  '228 Victoria Rd, Emsworth',
  'PO10 7LY',
  50.8518063, -0.9513122,
  'joeythevanman@gmail.com',
  '+44 7456 652812',
  'https://www.facebook.com/Joey-The-Van-Man-101267222097941',
  'csv_import'
),
(
  'TMR South Coast Group Ltd',
  'Construction & Renovation',
  'Walton Rd, Drayton, Portsmouth',
  'PO6 1UJ',
  50.8366805, -1.0487724,
  'info@tmrsouthcoastgroup.co.uk',
  '+44 333 772 0299',
  'https://tmrsouthcoastgroup.co.uk/',
  'csv_import'
)

ON CONFLICT (company_name, postcode) DO NOTHING;
