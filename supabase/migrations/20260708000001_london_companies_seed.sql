-- ============================================================
-- London-area companies seed (source: LONDON_dataset.csv)
-- Google Maps scrape: 50 businesses, 49 valid
-- Skipped: Jimmy's Builders & Decorating Ltd (no phone, no email)
-- Records without a postcode use NULL — PostgreSQL UNIQUE allows multiple NULL rows
-- ============================================================

INSERT INTO public.seeded_trades
  (company_name, trade_category, normalised_categories,
   address, postcode, lat, lng, email, phone, website, source)
VALUES

-- ── Construction & Renovation ─────────────────────────────────────────────────
('Green Renovation Solutions','Construction & Renovation',ARRAY['Construction & Renovation'],
 '2 Perry St, Chislehurst','BR7 6PT',51.4185988,0.0964284,
 'jamie@grs.uk.com','+44 7703 680399','http://grs.uk.com/','google_maps'),

('YHB Contracts Ltd','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Unit 9-12, Charmwood Farm, Charmwood Ln, Orpington','BR6 7SA',51.3437829,0.102817,
 'enquiries@yhb.org.uk','+44 20 8858 6777','https://www.yhb.org.uk/','google_maps'),

('Trapezitsa Construction (Builder and Handyman)','Construction & Renovation',ARRAY['Construction & Renovation','Handyman / Small Jobs'],
 '415 High Rd Leytonstone, London','E11 4JU',51.5568896,0.0060129,
 'trapezitsaconstruction@yahoo.com','+44 7453 271474','https://trapezitsaconstructionltd.co.uk/','google_maps'),

('Villaprojects','Construction & Renovation',ARRAY['Construction & Renovation','Carpentry & Joinery'],
 '18b Beehive Ln, Ilford','IG1 3RD',51.573052,0.0643597,
 NULL,'+44 7943 373880','http://villaprojects.uk/','google_maps'),

('Greg Pro Renovation','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Seymour Ave, London','N17 9RG',51.5954877,-0.060724,
 'info@gregprorenovation.co.uk','+44 7496 067758','https://gregprorenovation.co.uk/','google_maps'),

-- ── Plastering & Rendering ────────────────────────────────────────────────────
('A and A Rendering limited','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 '32 Homemead Rd, Bromley','BR2 8BA',51.3920579,0.052978,
 'info@a-and-a-rendering-ltd.com','+44 7737 116065','https://www.a-and-a-rendering-ltd.com/','google_maps'),

('Eco Rendering Houses','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 '33 Eversley Ave, London','DA7 6RD',51.4652032,0.1700818,
 'info@ecorenderinghousesltd.co.uk','+44 20 3856 7098','http://ecorenderinghousesltd.co.uk/','google_maps'),

('Sb plastering & rendering limited','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 'Hope Park, Bromley','BR1 3RG',51.4125703,0.0101919,
 'sb.plastering@hotmail.com','+44 7770 540303','https://sbrendering.co.uk/','google_maps'),

('EAR Rendering Solution & Insulation','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 '4 Hayne Rd, Beckenham','BR3 4XD',51.4105711,-0.0337221,
 'info@britnine.com','+44 7311 459056','https://earrendering.co.uk/','google_maps'),

('Breathe Homes','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 '455 Wick Ln, Bow, London','E3 2TB',51.5347053,-0.0206549,
 'chris.julian@breathehomes.co.uk','+44 7888 864480','https://www.breathehomes.co/','google_maps'),

('SPIRO LTD RENDERING AND ROOFING','Plastering & Rendering',ARRAY['Plastering & Rendering','Roofing'],
 '739A High Rd Leytonstone, London','E11 4QS',51.5658295,0.0100367,
 'info@spiroltd.co.uk','+44 7496 677760','https://spiroltd.co.uk/','google_maps'),

('Hackney Plastering and Repairs','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 NULL,NULL,51.4893323,-0.0881552,
 'hackneyplastering@gmail.com','+44 7985 265376','https://www.hackneyplastering.com/','google_maps'),

('Yogi Plastering Ltd','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 '28 Tolworth Gardens, Romford','RM6 5TH',51.5671195,0.135899,
 'info@yogiplastering.com','+44 7908 093099','https://www.yogiplastering.com/','google_maps'),

-- ── Roofing ───────────────────────────────────────────────────────────────────
('A C Roofing','Roofing',ARRAY['Roofing'],
 'Meadow View, Cackets La, Cudham, Sevenoaks','TN14 7QG',51.317298,0.080833,
 NULL,'+44 1959 534742','https://www.acroofingservices.co.uk/','google_maps'),

('DJM Roofing Ltd','Roofing',ARRAY['Roofing'],
 'Euro suite, 16-18 Woodford Rd, London','E7 0HA',51.553033,0.025437,
 'djmroofing@hotmail.com','+44 20 8502 5080','https://www.djmroofingltd.co.uk/','google_maps'),

('Woodford Roofing','Roofing',ARRAY['Roofing'],
 'Churchill Lodge, 50 Savill Row, Woodford Green','IG8 0UE',51.60838,0.0198707,
 NULL,'+44 7730 594461','http://www.woodfordroofingltd.co.uk/','google_maps'),

('Rushmoore Roofing - Roof Repair Woodford','Roofing',ARRAY['Roofing'],
 '115 George Ln, London','E18 1AB',51.5926854,0.0266803,
 'roofing268@gmail.com','+44 7939 488956','https://rushmooreroofinguk.com/','google_maps'),

-- ── Fencing & Gates ───────────────────────────────────────────────────────────
('FourBrothers Fencing','Fencing & Gates',ARRAY['Fencing & Gates'],
 'Spekehill, Coldharbour Estate, London','SE9 3BN',51.4298588,0.0541852,
 'contactus@fourbrothersfencing.co.uk','+44 7783 728857','http://www.fourbrothersfencing.co.uk/','google_maps'),

('B R Stacey Fencing Contractors','Fencing & Gates',ARRAY['Fencing & Gates'],
 '28 Sutherland Ave, Biggin Hill, Westerham','TN16 3HE',51.3087948,0.0354056,
 'info@brstaceyfencing.co.uk','+44 1959 575749','http://www.brstaceyfencing.co.uk/','google_maps'),

('Fencemasters','Fencing & Gates',ARRAY['Fencing & Gates'],
 '26 Burrfield Dr, Orpington','BR5 4BZ',51.3903574,0.1201409,
 'info@fence-masters.co.uk','+44 1689 602608','https://www.fence-masters.co.uk/','google_maps'),

('Chislehurst Fencing','Fencing & Gates',ARRAY['Fencing & Gates'],
 'High St, Chislehurst','BR7 6JU',51.4160617,0.0697047,
 'info@chislehurstfencing.com','+44 20 8050 7079','http://www.chislehurstfencing.co.uk/','google_maps'),

('Farnborough Fencing & Landscaping Services','Fencing & Gates',ARRAY['Fencing & Gates','Gardening & Landscaping'],
 '42 Felstead Rd, Orpington','BR6 9AB',51.3718074,0.101199,
 'info@fbfencing.co.uk','+44 7745 143773','http://www.fbfencing.co.uk/','google_maps'),

-- ── Electrical ────────────────────────────────────────────────────────────────
('Radke Electrical services Limited','Electrical',ARRAY['Electrical'],
 'Ravensbourne Cres, Romford','RM3 0UD',51.5847497,0.2328518,
 'Info@r-e-services.co.uk','+44 7745 342351','http://www.r-e-services.co.uk/','google_maps'),

('M & K Electrical & Data','Electrical',ARRAY['Electrical'],
 '7 Poole Rd, Hornchurch','RM11 3AS',51.5664743,0.2352164,
 'info@mandkelectrical.co.uk','+44 7545 370597','https://www.mandkelectrical.co.uk/','google_maps'),

('JNV Electrical and Maintenance','Electrical',ARRAY['Electrical'],
 'Dagenham Rd, Dagenham','RM10 7UH',51.5529972,0.169449,
 'jnvelectrical@hotmail.com','+44 7581 369720',NULL,'google_maps'),

('Powerbrite Electrical East London','Electrical',ARRAY['Electrical'],
 '25 Heath Park Rd, Romford','RM2 5UB',51.5779638,0.1978697,
 'powerbrite.electrical@gmail.com','+44 7973 407768','https://www.powerbrite.co.uk/','google_maps'),

('MN Electrical','Electrical',ARRAY['Electrical'],
 NULL,NULL,51.5808147,0.1840301,
 'info@mnelectrical.com','+44 7424 677297','https://mnelectrical.uk/','google_maps'),

-- ── Plumbing & Heating ────────────────────────────────────────────────────────
('Marshalls Park Plumbing','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '89 Seymer Rd, Romford','RM1 4LA',51.587087,0.1772593,
 NULL,'+44 7528 232298','http://www.marshallsparkplumbing.com/','google_maps'),

('CAS Plumbing and Heating Services Ltd','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '40 Purbeck Rd, Hornchurch','RM11 1NA',51.5668291,0.1988366,
 'CAS.heating21@gmail.com','+44 1708 918775','http://www.casplumbingheating.co.uk/','google_maps'),

('OM Emergency Plumbing','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '224 North St, Romford','RM1 4QD',51.5844708,0.1742296,
 NULL,'+44 7932 718660','https://omemergency.co.uk/','google_maps'),

('Lazard Plumbing Heating & Gas','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '11 Meadow Way, Upminster','RM14 3AA',51.5522647,0.2492057,
 'admin@lazardplumbing.co.uk','+44 1708 596515','https://lazardplumbing.co.uk/','google_maps'),

('B S Plumbing and Heating Dm Ltd','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '71 Cornworthy Rd, Dagenham','RM8 2DF',51.5459127,0.1207158,
 'info@bsplumbing.co.uk','+44 800 107 7119','https://bsplumbing.co.uk/','google_maps'),

-- ── Flooring & Tiling ─────────────────────────────────────────────────────────
('GB Tiling Ltd.','Flooring & Tiling',ARRAY['Flooring & Tiling'],
 '6 Belle Vue Rd, Downe, Orpington','BR6 7HR',51.3403491,0.0567587,
 NULL,'+44 1689 870384','http://gbtilingltd.co.uk/','google_maps'),

-- ── Gardening & Landscaping ───────────────────────────────────────────────────
('Iconic Landscapes Ltd','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '18 Ash Rd, Green Street Green, Orpington','BR6 6AZ',51.3498516,0.0948516,
 'info@iconiclandscapes.co','+44 7740 310409','http://www.iconiclandscapes.co/','google_maps'),

('Bigstar Home Service','Gardening & Landscaping',ARRAY['Gardening & Landscaping','Handyman / Small Jobs'],
 '54 Huddlestone Rd, London','E7 0AN',51.5551164,0.0173823,
 'Bigstarhomeservices@yahoo.com','+44 7436 322543','http://www.bigstarhomeservices.co.uk/','google_maps'),

('Garden Care Company','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 'Whalebone Ln N, Romford','RM6 5QT',51.5898312,0.14237,
 'info@gardencarecompany.com','+44 7907 473256','https://gardencarecompany.com/','google_maps'),

('Olive Tree Landscaping LTD','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '122 Reedham Cl, London','N17 9PU',51.5859153,-0.05753,
 NULL,'+44 7599 445202','https://olive-tree-landscaping.co.uk/','google_maps'),

('Jays Gardening Services','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '423 High St N, London','E12 6TL',51.5464,0.0486719,
 'hello@jaysgardening.com','+44 7884 427556','https://www.jaysgardening.com/','google_maps'),

-- ── Air Conditioning & Ventilation ────────────────────────────────────────────
('EFAM Air','Air Conditioning & Ventilation',ARRAY['Air Conditioning & Ventilation'],
 'Unit 12, Metro Business Centre, Kangley Bridge Rd, London','SE26 5BW',51.421705,-0.0351998,
 'help@efamair.com','+44 800 084 3520','http://efamair.com/','google_maps'),

-- ── Painting & Decorating ─────────────────────────────────────────────────────
('Regency Professional Decorating Services','Painting & Decorating',ARRAY['Painting & Decorating'],
 'Everglade House, 1 Eastleigh Rd, London','E17 5LU',51.5927305,-0.0281703,
 'paul@regencydecor.london','+44 7900 375258','https://www.regencydecor.london/','google_maps'),

('ProStrike London Decorating Services','Painting & Decorating',ARRAY['Painting & Decorating'],
 '60 Markfield Rd, London','N15 4QA',51.5834284,-0.0641258,
 'prostrikelondon@gmail.com','+44 7821 262538','https://prostrikedecorators.co.uk/','google_maps'),

('D.L.J. Painting and Decorating LTD','Painting & Decorating',ARRAY['Painting & Decorating'],
 '174 Murchison Rd, London','E10 6LX',51.5652401,-0.0048315,
 NULL,'+44 7730 798941','http://www.dljpainting.com/','google_maps'),

('Klevi Painting & Decorating Ltd','Painting & Decorating',ARRAY['Painting & Decorating'],
 NULL,NULL,51.5808954,-0.0042029,
 'Info@klevipaintinganddecorating.co.uk','+44 20 3633 1399','https://klevipaintinganddecorating.co.uk/','google_maps'),

('EA PAINTING & DECORATING LTD','Painting & Decorating',ARRAY['Painting & Decorating'],
 'Leyton, 52 Grange Park Rd, London','E10 5ES',51.5649805,-0.0139625,
 'Eegidijus122@gmail.com','+44 7544 245580','https://www.eapaintingdecorating.com/','google_maps'),

-- ── Carpentry & Joinery ───────────────────────────────────────────────────────
('Aksmartbuilders','Carpentry & Joinery',ARRAY['Carpentry & Joinery','Construction & Renovation'],
 '99 Glengall Rd, London','IG8 0DP',51.6067763,0.0282994,
 'info@aksmartbuilders.co.uk','+44 7432 655127','http://www.aksmartbuilders.co.uk/','google_maps'),

('The English Carpentry and Building Services','Carpentry & Joinery',ARRAY['Carpentry & Joinery','Construction & Renovation'],
 '22 Mendip Rd, Ilford','IG2 7PN',51.5788272,0.0946418,
 NULL,'+44 7446 688596','http://www.englishcarpentry.com/','google_maps'),

('360 Carpentry','Carpentry & Joinery',ARRAY['Carpentry & Joinery'],
 '68 Heathway, Dagenham','RM10 9PL',51.5347472,0.1484494,
 'Support@360carpentry.co.uk','+44 7846 268733','https://360carpentry.co.uk/','google_maps'),

-- ── Handyman / Small Jobs ─────────────────────────────────────────────────────
('All Round Handyman Services','Handyman / Small Jobs',ARRAY['Handyman / Small Jobs'],
 'North Dr, Orpington','BR6 9PG',51.3621964,0.0870335,
 'd.clements@allroundhandyman.co.uk','+44 7879 558111','http://www.allroundhandyman.co.uk/','google_maps'),

-- ── Waste Removal ─────────────────────────────────────────────────────────────
('Mitchells Moving Company Ltd','Waste Removal',ARRAY['Waste Removal'],
 'Office 13, Access house, Cray Ave., Orpington','BR5 3QB',51.3903982,0.109422,
 'info@mitchellsmovingcompany.com','+44 800 023 4610','https://mitchellsmovingcompany.com/','google_maps')

ON CONFLICT (company_name, postcode) DO NOTHING;
