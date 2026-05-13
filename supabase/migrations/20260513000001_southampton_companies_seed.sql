-- ============================================================
-- Southampton-area company seed  (source: Southampton_emails_list.csv)
-- Requires: normalised_categories column (added in 20260510000003)
-- ============================================================

INSERT INTO public.seeded_trades
  (company_name, trade_category, normalised_categories,
   address, postcode, lat, lng, email, phone, website, source)
VALUES

-- ── Plumbing & Heating ────────────────────────────────────────────────────────
('Tidal Plumbing and Heating Ltd','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '11 Effingham Gardens, Sholing, Southampton','SO19 8GF',50.9041638,-1.345858,
 'info@tidalplumbingandheating.co.uk','+44 7377 794212','http://www.tidalplumbingandheating.co.uk/','csv_import'),

('South Plumbing Services','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '12 Langbar Cl, Southampton','SO19 7JH',50.9111684,-1.3697327,
 'info@southplumbing.co.uk','+44 7737 424073','https://www.southplumbing.co.uk/','csv_import'),

('Brennan & Son','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '35 Chafen Rd, Southampton','SO18 1BD',50.9190291,-1.3786152,
 'info@brennanheating.co.uk','+44 23 8022 5566','https://www.brennanheating.co.uk/','csv_import'),

('Jetstream Draincleaning Limited','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '33A Portsmouth Rd, Woolston, Southampton','SO19 9BA',50.8981996,-1.3794696,
 'info@jetstreamdraincleaning.co.uk','+44 7789 475700','https://www.jetstreamdraincleaning.co.uk/','csv_import'),

('Emergency Plumber Hampshire','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '46 Coates Rd, Sholing, Southampton','SO19 0HJ',50.901154,-1.3342977,
 'paul@emergencyplumberhampshire.co.uk','+44 7852 583351','http://www.emergencyplumberhampshire.co.uk/','csv_import'),

('Gassed Up Heating Ltd','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '55 Sullivan Rd, Sholing, Southampton','SO19 0JF',50.8992495,-1.3384325,
 'gassedupheating@gmail.com','+44 7415 380453','http://www.gassedupheating.co.uk/','csv_import'),

('RP Heating Solutions Ltd','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '24 Tilbrook Rd, Southampton','SO15 4HL',50.9199224,-1.4427874,
 'info@rpplumbingheating.co.uk','+44 7802 810720','https://www.rpplumbingheating.co.uk/','csv_import'),

('Tip Top Plumbing Heating and Gas Services Ltd','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 'Upper Weston Ln, Southampton','SO19 9HY',50.8944613,-1.3559832,
 'leetiptopgas@gmail.com','+44 23 8057 1673','http://www.tiptopboilers.co.uk/','csv_import'),

('Emit Heat Limited','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 'Charles Gordon House, Southampton','SO15 2EB',50.9147415,-1.404487,
 'mike@emitheat.com','+44 7495 438159','https://www.emitheat.com/','csv_import'),

('PrimeFlow Plumbing & Heating','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '32 Foundry Ln, Southampton','SO15 3FZ',50.912894,-1.4331174,
 'PrimeFlowHeating@outlook.com','+44 7985 656538',NULL,'csv_import'),

('AE Renewables ltd','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '47 Ashmead Rd, Southampton','SO16 5DJ',50.9343999,-1.4490188,
 'hello@a-egas.com','+44 7706 445778','https://aerenewables.co.uk/','csv_import'),

('Combi-Nation Gas heating and plumbing','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '390 Portsmouth Rd, Southampton','SO19 9AS',50.8945527,-1.3526374,
 'info@combi-nationheating.co.uk','+44 23 8077 5666','https://www.centralheatingsouthampton.co.uk/','csv_import'),

('MTV plumbing and heating ltd','Plumbing & Heating',ARRAY['Plumbing & Heating'],
 '36 Hinton Cres, Thornhill, Southampton','SO19 6GT',50.9052672,-1.3296085,
 'info@mtvpnh.co.uk','+44 23 8111 2731','https://mtvpnh.co.uk/','csv_import'),

('Innovation Bathrooms and Kitchens Ltd','Plumbing & Heating',ARRAY['Plumbing & Heating','Construction & Renovation'],
 '542 Millbrook Rd W, Millbrook, Southampton','SO15 0JU',50.9142397,-1.4513455,
 'showroom@innovation-bathrooms.com','+44 23 8017 3466','https://innovation-bathrooms.com/','csv_import'),

('HS PLUMBING AND ELECTRICAL','Plumbing & Heating',ARRAY['Plumbing & Heating','Electrical','Handyman / Small Jobs'],
 '25 Rockleigh Rd, Southampton','SO16 7AQ',50.9358782,-1.418062,
 'admin@hsplumbing-electrical.com','+44 7733 952082','https://hsplumbing-electrical.com/','csv_import'),

-- ── Electrical ────────────────────────────────────────────────────────────────
('CH Electrical Contractors Ltd','Electrical',ARRAY['Electrical'],
 '20 Quayside Rd, Southampton','SO18 1EG',50.9160911,-1.3812019,
 'chris@chelectricalcontractor.com','+44 7399 806174','https://chelectricalcontractor.com/','csv_import'),

('Parker''s Electrical','Electrical',ARRAY['Electrical'],
 '25 Taunton Dr, Southampton','SO18 5BX',50.9177356,-1.3483705,
 'contact@parkerselectrical.co.uk','+44 7497 378070','http://parkerselectrical.co.uk/','csv_import'),

('HG Electrical','Electrical',ARRAY['Electrical'],
 'Muira Industrial Estate, William St, Northam, Southampton','SO14 5QH',50.9099304,-1.3841576,
 'info@hgehome.co.uk','+44 23 8201 1863','http://www.hgehome.co.uk/','csv_import'),

('AV Electrical & Property Solutions Limited','Electrical',ARRAY['Electrical'],
 '37A Victoria Rd, Woolston, Southampton','SO19 9DY',50.8968559,-1.3798122,
 'info@aveps.co.uk','+44 23 8020 0563','http://www.electricalpropertysolutions.co.uk/','csv_import'),

('J Thorn Electrical','Electrical',ARRAY['Electrical'],
 'Oakbank Rd, Woolston, Southampton','SO19 9DT',50.8983706,-1.3793079,
 'info@jthornelectrical.com','+44 23 8044 0488','https://www.jthornelectrical.co.uk/','csv_import'),

('ABM Electrical Solutions','Electrical',ARRAY['Electrical'],
 'Centenary Quay, Woolston, Southampton','SO19 9UR',50.8950344,-1.3829518,
 'info@abmelectricalsolutions.co.uk','+44 23 8254 4189','https://www.abmelectricalsolutions.co.uk/','csv_import'),

('Primal Building Services Ltd','Electrical',ARRAY['Electrical'],
 'International Way, Weston, Southampton','SO19 9NY',50.8861547,-1.3681752,
 'info@primalbuildingservices.com','+44 800 048 7934','https://primalbuildingservices.co.uk/','csv_import'),

('Neil''s Electrical Services','Electrical',ARRAY['Electrical'],
 'Suite 74, 151 High St, Southampton','SO14 2BT',50.900678,-1.40423,
 'neil@neilselectricalservices.co.uk','+44 23 8032 8104','http://www.nes247.co.uk/','csv_import'),

('Jenkins Electrical Maintenance Services','Electrical',ARRAY['Electrical'],
 '21 Mount Pleasant Rd, Southampton','SO14 0EF',50.9148351,-1.3946263,
 'info@jenkinsems.co.uk','+44 23 8218 2809','http://electricianinsouthampton.co.uk/','csv_import'),

('Gas and Electricity Engineers','Electrical',ARRAY['Electrical'],
 '151 High St, Southampton','SO14 2BT',50.9006485,-1.4041686,
 'sales@gasandelec.com','+44 23 8009 0892','https://www.gasandelec.com/','csv_import'),

-- ── Construction & Renovation ─────────────────────────────────────────────────
('George Henry builders','Construction & Renovation',ARRAY['Construction & Renovation'],
 '8 Cedar Ave, Shirley, Southampton','SO15 5GW',50.9217508,-1.4237895,
 'info@georgehenrybuilders.co.uk','+44 7909 333814','https://georgehenrybuilders.co.uk/','csv_import'),

('TW Builders','Construction & Renovation',ARRAY['Construction & Renovation'],
 '81 Millais Rd, Southampton','SO19 2FX',50.9017324,-1.3682475,
 'info@twbuilders.co.uk','+44 7770 395026','https://www.twbuilders.co.uk/','csv_import'),

('BMS House Conversions LTD','Construction & Renovation',ARRAY['Construction & Renovation'],
 '141 Victoria Rd, Woolston, Southampton','SO19 9EG',50.89296,-1.381207,
 'bms.houseconversions@gmail.com','+44 7703 599133','https://www.bmshouseconversionsltd.co.uk/','csv_import'),

('Wren Building Contractors','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Tagus House, 9 Ocean Way, Southampton','SO14 3TJ',50.8948616,-1.3947915,
 NULL,'+44 1489 690070',NULL,'csv_import'),

('Profile Brickwork Ltd','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Solent House, 107A Alma Rd, Portswood, Southampton','SO14 6UY',50.9209709,-1.4028236,
 'enquiries@profilebrickwork.com','+44 23 8036 0790','http://profilebrickwork.com/','csv_import'),

('Dam brickwork','Construction & Renovation',ARRAY['Construction & Renovation'],
 '72 Cumbrian Way, Southampton','SO16 4AU',50.9217895,-1.4508434,
 'info@dambrickwork.co.uk','+44 23 8078 3414','http://www.dambrickwork.co.uk/','csv_import'),

('Mason Bricklaying Ltd','Construction & Renovation',ARRAY['Construction & Renovation'],
 '34 Chiltern Grn, Southampton','SO16 4AZ',50.9197763,-1.4539357,
 'Info@masonbricklaying.co.uk','+44 7715 842928','https://www.masonbricklaying.co.uk/','csv_import'),

('HD Homes','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Bitterne Rd W, Southampton','SO18 1AP',50.9179033,-1.3798493,
 'homedevelopments2001@gmail.com','+44 7760 154130','https://www.hdhomes.co.uk/','csv_import'),

('Chameleon Brick Services Ltd','Construction & Renovation',ARRAY['Construction & Renovation'],
 '10 Sedgewick Rd, Sholing, Southampton','SO19 8HD',50.9071306,-1.3454589,
 'enquiries@chameleon-brick.co.uk',NULL,'https://www.chameleon-brick.co.uk/','csv_import'),

('Michael Rose Builders','Construction & Renovation',ARRAY['Construction & Renovation'],
 '20 Hillside Ave, Southampton','SO18 1JY',50.9260056,-1.3733259,
 'info@michaelrosebuilders.co.uk','+44 7812 609983','https://michaelrosebuilders.co.uk/','csv_import'),

('Quaystone Projects Ltd','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Trinity Industrial Estate, Millbrook Rd W, Millbrook, Southampton','SO15 0LA',50.9158819,-1.4527604,
 'enquiries@quaystoneprojects.co.uk','+44 23 8001 6244','http://www.quaystoneprojects.co.uk/','csv_import'),

('EJM Building Services','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Royal Mail House, Terminus Terrace, Southampton','SO14 3FD',50.897598,-1.3973242,
 'info@ejmbuildingservices.co.uk','+44 23 8124 7315','http://ejmbuildingservices.co.uk/','csv_import'),

('Test Valley Driveways ltd','Construction & Renovation',ARRAY['Construction & Renovation'],
 '15 Rockstone Pl, Southampton','SO15 2EP',50.9145976,-1.4029097,
 'info@testvalleydriveways.com','+44 23 8144 9720','https://testvalleydrivewayslimited.com/','csv_import'),

('Driveways Southampton','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Andersons Rd, Southampton','SO14 5FE',50.9002568,-1.3922003,
 'info@drivewaysouthampton.co.uk','+44 7480 549222','http://drivewaysouthampton.co.uk/','csv_import'),

('The Driveway Division','Construction & Renovation',ARRAY['Construction & Renovation'],
 'Longbridge Industrial Park, Floating Bridge Rd, Southampton','SO14 5FZ',50.8983892,-1.3883182,
 'info@thedrivewaydivision.co.uk','+44 23 8046 3778','https://www.thedrivewaydivision.co.uk/','csv_import'),

('D & S Surfacing Contractors','Construction & Renovation',ARRAY['Construction & Renovation','Gardening & Landscaping'],
 '63 Botany Bay Rd, Sholing, Southampton','SO19 8FE',50.8988781,-1.3533437,
 'info@dssurfacingcontractors.co.uk','+44 23 8030 8762','http://dssurfacingcontractors.co.uk/','csv_import'),

('AOM Building Contractors Ltd','Construction & Renovation',ARRAY['Construction & Renovation','Carpentry & Joinery'],
 '237 Manor Farm Rd, Southampton','SO18 1NY',50.9320233,-1.3735345,
 'enquiries@aombuild.com','+44 7496 539173','http://www.aombuild.com/','csv_import'),

('Hauxy Brickwork LTD','Construction & Renovation',
 ARRAY['Construction & Renovation','Carpentry & Joinery','Electrical','Fencing & Gates','Gardening & Landscaping','Painting & Decorating','Plastering & Rendering','Roofing'],
 'Cornwall Cres, Southampton','SO18 2AQ',50.9286115,-1.3641132,
 'craig@hauxybrickworkltd.co.uk','+44 7377 128007','http://www.hauxybrickworkltd.co.uk/','csv_import'),

-- ── Plastering & Rendering ────────────────────────────────────────────────────
('Daedalus Drylining & Plastering','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 'Stanton Buildings, Unit 1 Stanton Rd, Southampton','SO15 4HU',50.9180561,-1.4411872,
 'info@daedalusdryliningplastering.co.uk','+44 7712 510413','http://www.daedalusdryliningplastering.co.uk/','csv_import'),

('Extreme Plastering LTD','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 '35 Mill Rd, Southampton','SO15 4JB',50.9167132,-1.4456036,
 'info@extremeplastering.co.uk','+44 7743 043440','http://www.extremeplastering.co.uk/','csv_import'),

('N. Cole Plastering and Dry Lining Limited','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 '3-4 Lower Vicarage Rd, Woolston, Southampton','SO19 7RJ',50.9003422,-1.3813112,
 'info@ncoleplastering.co.uk','+44 23 8042 1244','http://www.ncoleplastering.co.uk/','csv_import'),

('Crowley Plastering','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 '4 Kellett Rd, Upper Shirley, Southampton','SO15 7PR',50.9235968,-1.4155468,
 'info@crowleyplastering.co.uk','+44 7976 521601','http://www.crowleyplastering.co.uk/','csv_import'),

('B.Arnold Plastering & Rendering','Plastering & Rendering',ARRAY['Plastering & Rendering'],
 'The Greenwich, Gloucester Square, Southampton','SO14 2GJ',50.8968226,-1.4040733,
 'b.arnoldplastering@yahoo.com','+44 7789 860786','http://barnoldplastering.co.uk/','csv_import'),

('Mothline Preservations Ltd','Plastering & Rendering',ARRAY['Plastering & Rendering','Cleaning'],
 '284 Wimpson Ln, Southampton','SO16 4PX',50.9275538,-1.4508571,
 'mothline@hotmail.com','+44 23 8168 3854','https://www.mothlinepreservations.co.uk/','csv_import'),

('DannySG Plastering','Plastering & Rendering',ARRAY['Plastering & Rendering','Painting & Decorating'],
 '30 Cunningham Cres, Sholing, Southampton','SO19 8JY',50.9021704,-1.3532908,
 'dannysguthrie@gmail.com','+44 7922 658054',NULL,'csv_import'),

-- ── Painting & Decorating ─────────────────────────────────────────────────────
('D C Best & Sons','Painting & Decorating',ARRAY['Painting & Decorating'],
 '13 Furze Rd, Southampton','SO19 8PF',50.9059448,-1.3570823,
 'info@pabdecorating.co.uk','+44 7740 797163','http://www.pabdecorating.co.uk/','csv_import'),

('PAB Decorating','Painting & Decorating',ARRAY['Painting & Decorating'],
 '13 Furze Cl, Sholing, Southampton','SO19 8PG',50.9059896,-1.3570907,
 'info@pabdecorating.co.uk','+44 7740 797163','http://www.pabdecorating.co.uk/','csv_import'),

('Colours By Artisan Painting & Decorating','Painting & Decorating',ARRAY['Painting & Decorating'],
 '557 Bitterne Rd E, Southampton','SO18 5EQ',50.9148658,-1.3504861,
 'dean@coloursbyartisan.co.uk','+44 7875 006162','http://coloursbyartisan.co.uk/','csv_import'),

('Adam Klos Painter & Decorator Ltd','Painting & Decorating',ARRAY['Painting & Decorating'],
 '12 Shirley High St, Shirley, Southampton','SO15 3NH',50.9211947,-1.432258,
 'adamklosgm@gmail.com','+44 7438 076278','http://www.adamklospainter.co.uk/','csv_import'),

('PerfectPrep Decorating Service','Painting & Decorating',ARRAY['Painting & Decorating'],
 '16B Waterloo Rd, Southampton','SO15 3AR',50.9099811,-1.420153,
 'perfectprep.decorating@gmail.com','+44 7415 089587','http://www.perfectprepdecorating.co.uk/','csv_import'),

('RDS PAINTING & DECORATING','Painting & Decorating',ARRAY['Painting & Decorating'],
 '14 Lacon Cl, Southampton','SO18 1JA',50.9228419,-1.3715382,
 'info@paintinghampshire.co.uk','+44 7812 075482','http://www.paintinghampshire.co.uk/','csv_import'),

('Pastilles Painting And Decorating','Painting & Decorating',ARRAY['Painting & Decorating'],
 '103 Witts Hill, Southampton','SO18 4QL',50.923231,-1.3608584,
 'pastillespainting@gmail.com','+44 7360 094318','https://pastillespainting.co.uk/','csv_import'),

('Gogo Deco LTD','Painting & Decorating',ARRAY['Painting & Decorating'],
 '521 Hinkler Rd, Thornhill, Southampton','SO19 6DJ',50.9077595,-1.3417857,
 'info@gogo-deco.co.uk','+44 7481 842933','http://www.gogo-deco.co.uk/','csv_import'),

('Flash Home Painting & Handyman Services','Painting & Decorating',ARRAY['Painting & Decorating','Handyman / Small Jobs'],
 'Anson Dr, Sholing, Southampton','SO19 8RW',50.9062225,-1.3432938,
 'handyflashhomeservices@gmail.com','+44 7553 029015','http://www.flashhomeservices.co.uk/','csv_import'),

-- ── Roofing ───────────────────────────────────────────────────────────────────
('Supremacy Roof Care Ltd','Roofing',ARRAY['Roofing'],
 NULL,NULL,50.9138207,-1.4004929,
 'info@supremacyroofcare.co.uk','+44 23 8184 9681','https://www.supremacyroofcare.co.uk/','csv_import'),

('N Joslin Roofing','Roofing',ARRAY['Roofing'],
 '2 Mansbridge Rd, Southampton','SO18 2LD',50.9412496,-1.3728663,
 'info@njoslinroofing.com','+44 7502 047790','https://www.njoslinroofing.com/','csv_import'),

('HIGHLIGHT ROOFING AND BUILDING LTD','Roofing',ARRAY['Roofing','Construction & Renovation'],
 '45 Lodge Rd, Southampton','SO14 6RL',50.9194665,-1.3976757,
 'info@highlightroofingbuilding.co.uk','+44 7957 023517','https://www.highlightroofingbuilding.co.uk/','csv_import'),

('Protec Roofing (Southern) Ltd','Roofing',ARRAY['Roofing'],
 '3 & 4 Lower Vicarage Rd, Southampton','SO19 7RJ',50.9001502,-1.3812731,
 'info@protecroofingltd.co.uk','+44 1489 298003','http://www.protecroofingltd.co.uk/','csv_import'),

('Hampshire Roofers Ltd','Roofing',ARRAY['Roofing'],
 '15 Rockstone Pl, Southampton','SO15 2EP',50.9145976,-1.4029097,
 'info@approvedroofers.co.uk','+44 23 8181 0383','https://www.approvedroofers.co.uk/free-roofing-quote','csv_import'),

('SPP Roofing Ltd','Roofing',ARRAY['Roofing','Cleaning'],
 '185 Kingsclere Ave, Weston, Southampton','SO19 9JR',50.885916,-1.3626066,
 'spproofing@aol.com','+44 23 8168 1911','http://www.spproofing.co.uk/','csv_import'),

('The Roofing Division','Roofing',ARRAY['Roofing'],
 'Longbridge Industrial Park, Floating Bridge Rd, Southampton','SO14 3FL',50.8985774,-1.3891263,
 'info@theroofingdivision.com','+44 23 8046 3778','https://www.theroofingdivision.com/','csv_import'),

('M Russell Roofing & Building','Roofing',ARRAY['Roofing','Construction & Renovation'],
 '77 Victoria Rd, Woolston, Southampton','SO19 9DZ',50.8947084,-1.3800448,
 'marcandharvey@gmail.com','+44 7720 609455','http://mrussellroofing.co.uk/','csv_import'),

('M King Roofing & Cladding ltd','Roofing',ARRAY['Roofing','Construction & Renovation'],
 '4 Effingham Gardens, Sholing, Southampton','SO19 8GG',50.9038822,-1.3458403,
 'Matthew@mkrc.info','+44 23 8043 7116','http://mkingroofingandcladding.info/','csv_import'),

('A.P.Smith Roofing','Roofing',ARRAY['Roofing'],
 '156 Somerset Ave, Southampton','SO18 5FT',50.9198098,-1.3408143,
 'paul@apsmithroofing.co.uk','+44 7803 116668','http://www.apsmithroofing.co.uk/','csv_import'),

('South Coast Driveways & Roofing Ltd','Roofing',ARRAY['Roofing','Construction & Renovation','Fencing & Gates','Gardening & Landscaping'],
 '69 Warren Ave, Shirley Warren, Southampton','SO16 6AF',50.9309601,-1.4388933,
 'info@scdr.co.uk','+44 23 8168 2257','https://www.scdr.co.uk/','csv_import'),

('Jd Lod Driveways & Roofing','Roofing',ARRAY['Roofing','Construction & Renovation','Fencing & Gates','Cleaning'],
 'Flat E, 78 Shirley Rd, Southampton','SO15 3EY',50.9108144,-1.4199498,
 'jdloddriveways@gmail.com','+44 23 8098 0654','https://www.jdloddriveways.co.uk/','csv_import'),

-- ── Carpentry & Joinery ───────────────────────────────────────────────────────
('HB Carpentry LTD','Carpentry & Joinery',ARRAY['Carpentry & Joinery'],
 '45 Glenfield Cres, Southampton','SO18 4RG',50.9169327,-1.3647985,
 'INFO@HBCARPENTRYANDBUILDING.CO.UK','+44 7724 344797','https://www.hbcarpentryltd.com/','csv_import'),

('Mike Bott Carpentry & Construction','Carpentry & Joinery',ARRAY['Carpentry & Joinery','Construction & Renovation'],
 '119 Avenue Rd, Southampton','SO14 6BD',50.9212236,-1.3976012,
 'info@mikebottcarpentry.co.uk','+44 7840 331363','http://www.mikebottcarpentry.co.uk/','csv_import'),

('MDC Carpentry Workshop','Carpentry & Joinery',ARRAY['Carpentry & Joinery'],
 '22 Floating Bridge Rd, Southampton','SO14 3FL',50.8983902,-1.3878926,
 'info@mdccarpentryworkshop.co.uk','+44 23 8063 7242','http://www.mdccarpentryworkshop.co.uk/','csv_import'),

('Mark Lloyd Carpentry & Associated Works','Carpentry & Joinery',ARRAY['Carpentry & Joinery','Construction & Renovation'],
 '84 Copsewood Rd, Southampton','SO18 1QU',50.9303961,-1.3679165,
 'info@marklloydcarpentry.co.uk','+44 7970 649742','http://www.marklloydcarpentry.co.uk/','csv_import'),

('J C L Projects','Carpentry & Joinery',ARRAY['Carpentry & Joinery'],
 'Loveridge Trading Estate, Southbrook Rd, Southampton','SO15 1GQ',50.9077836,-1.417808,
 'tim@jclprojects.co.uk','+44 23 8168 1612','https://www.jclprojects.co.uk/','csv_import'),

('Timbafix','Carpentry & Joinery',ARRAY['Carpentry & Joinery','Flooring & Tiling','Fencing & Gates','Painting & Decorating','Handyman / Small Jobs'],
 '29 Henry Rd, Shirley, Southampton','SO15 3HB',50.9184641,-1.4319182,
 'sales@timbafix.com','+44 7379 631889','https://timbafix.com/','csv_import'),

('UK TIMBERSOLUTION','Carpentry & Joinery',ARRAY['Carpentry & Joinery'],
 '106 Bassett Green Rd, Southampton','SO16 3EF',50.9436756,-1.3873623,
 'info@timbersolution.co.uk','+44 7903 998582','https://timbersolution.co.uk/','csv_import'),

-- ── Gardening & Landscaping ───────────────────────────────────────────────────
('Scotts Garden Services','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '144 Adelaide Rd, Southampton','SO17 2HX',50.9247416,-1.3857058,
 'scottsgardenserviceshampshire@gmail.com','+44 7766 220883',NULL,'csv_import'),

('Debbie Carroll Garden Designs','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '104 Newtown Rd, Sholing, Southampton','SO19 9HQ',50.8919192,-1.3545737,
 'debbie@dcgardendesigns.co.uk','+44 7821 546950','http://www.dcgardendesigns.co.uk/','csv_import'),

('Acre Landscapes','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '53 Chapel Cres, Sholing, Southampton','SO19 8JU',50.901785,-1.3536751,
 'dan@acrelandscapes.net','+44 7795 822244','http://www.acrelandscapes.net/','csv_import'),

('Mark Arnold Gardening Services','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '10 Freemantle Cl, Southampton','SO19 7BB',50.9096482,-1.3658608,
 'enquiries@markarnoldgardening.co.uk','+44 7962 164650','http://www.markarnoldgardening.co.uk/','csv_import'),

('Gutter and Garden Guys','Gardening & Landscaping',ARRAY['Gardening & Landscaping','Cleaning'],
 '15 Rockstone Pl, Southampton','SO15 2EP',50.9145564,-1.4029538,
 'book@ggguys.co.uk','+44 7872 306570','https://ggguys.co.uk/','csv_import'),

('Paul Freeman Tree Services','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '120 Thornhill Park Rd, Thornhill, Southampton','SO18 5TS',50.914907,-1.3314938,
 'freemantrees@outlook.com','+44 7791 285235','http://www.freemantrees.co.uk/','csv_import'),

('HRG Tree Surgeons','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 'Mountbatten House, Grosvenor Square, Southampton','SO15 2JU',50.9108824,-1.4066442,
 'info@hrgtreesurgeons.co.uk','+44 23 8244 0473','https://www.hrgtreesurgeons.co.uk/','csv_import'),

('All Seasons Tree and Garden Care','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 'Palm Rd, Southampton','SO16 5HF',50.9360435,-1.4392425,
 'allseasontreegardencare@gmail.com','+44 7480 865116','https://www.allseasonstreeandgardencare.com/','csv_import'),

('Delta Trees Ltd','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '29 Rownhams Rd, Southampton','SO16 5DX',50.9328325,-1.4477894,
 'deltatrees@gmail.com','+44 7707 329178','http://deltatrees.co.uk/','csv_import'),

('Wyldewood Tree & Garden Ltd','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 NULL,NULL,50.9138207,-1.4004929,
 'info@wyldewoodtrees.co.uk','+44 7437 188146','http://www.wyldewoodtrees.co.uk/','csv_import'),

('Billys Broken Branches Tree Care','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 NULL,NULL,50.9216321,-1.3536301,
 'billysbrokenbranches@gmail.com','+44 23 8111 2768','http://www.billysbrokenbranches.co.uk/','csv_import'),

('Complete gardening and landscaping services','Gardening & Landscaping',ARRAY['Gardening & Landscaping'],
 '21 Honeysuckle Rd, Southampton','SO16 3HS',50.9389784,-1.3963343,
 'info@complete.com','+44 7511 117716','http://completegardeningandlandscaping.co.uk/','csv_import'),

-- ── Flooring & Tiling ─────────────────────────────────────────────────────────
('TILE INFINITY','Flooring & Tiling',ARRAY['Flooring & Tiling','Construction & Renovation'],
 'Middle Rd, Sholing, Southampton','SO19 8FR',50.9025318,-1.3601613,
 'info@tileinfinity.co.uk','+44 7469 800879','https://tileinfinity.co.uk/tiler-southampton','csv_import'),

('Precision Tiling','Flooring & Tiling',ARRAY['Flooring & Tiling'],
 '4a Inkerman Rd, Woolston, Southampton','SO19 9DA',50.8971131,-1.3780859,
 'precisiontilingsouth@gmail.com','+44 7534 396648',NULL,'csv_import'),

('Ideal Ceramic Specialists Ltd','Flooring & Tiling',ARRAY['Flooring & Tiling'],
 '3A High Rd, Swaythling, Southampton','SO16 2HW',50.9405482,-1.3790716,
 'idealceramicspecialistsltd@gmail.com','+44 23 8067 7213','http://www.ideal-tiling.com/','csv_import'),

-- ── Cleaning ─────────────────────────────────────────────────────────────────
('Lion Commercial Cleaning Ltd','Cleaning',ARRAY['Cleaning'],
 'Director General''s House, 15 Rockstone Pl, Southampton','SO15 2EP',50.9145976,-1.4029097,
 'info@lionccl.co.uk','+44 800 077 6799','http://www.lionccl.co.uk/','csv_import'),

('DixeyClean Ltd','Cleaning',ARRAY['Cleaning'],
 '33 Caerleon Dr, Southampton','SO19 5LH',50.9106416,-1.3468417,
 'richard@dixeyclean.co.uk','+44 800 772 0872','http://www.dixeyclean.co.uk/','csv_import'),

('Cleaning Queens','Cleaning',ARRAY['Cleaning'],
 '16 Weston Grove Rd, Woolston, Southampton','SO19 9EL',50.8932033,-1.3789089,
 'cleaningqueens.south@gmail.com','+44 7784 119261',NULL,'csv_import'),

('The Super Cleaners (Southampton)','Cleaning',ARRAY['Cleaning'],
 'Arena Business Centres, Southampton','SO14 3LP',50.9007853,-1.3973427,
 'info@thesupercleaners.co.uk','+44 800 118 4075','http://www.thesupercleaners.co.uk/','csv_import'),

-- ── Handyman / Small Jobs ─────────────────────────────────────────────────────
('SHS Hants - Southampton Handyman Services Hampshire','Handyman / Small Jobs',
 ARRAY['Handyman / Small Jobs','Plumbing & Heating','Construction & Renovation'],
 '57, 77 Andersons Rd, Southampton','SO14 5FF',50.8995156,-1.3914945,
 'info@shshants.co.uk','+44 23 8030 8900','http://www.shshants.co.uk/','csv_import'),

('Handyman Services Southampton SHS Hants','Handyman / Small Jobs',
 ARRAY['Handyman / Small Jobs','Electrical','Plumbing & Heating','Roofing'],
 '84 Sullivan Rd, Sholing, Southampton','SO19 0JL',50.8981581,-1.3374765,
 'info@shshants.co.uk','+44 23 8065 8677','http://www.shshants.co.uk/','csv_import'),

('Hampshire Premium Handyman','Handyman / Small Jobs',ARRAY['Handyman / Small Jobs'],
 '73 Portswood Rd, Southampton','SO17 2FU',50.9224129,-1.3957284,
 'shad.tofiq@gmail.com','+44 7876 498012',NULL,'csv_import'),

('Oddjob Handyman Services','Handyman / Small Jobs',ARRAY['Handyman / Small Jobs'],
 'Centenary Quay, Woolston, Southampton','SO19 9UD',50.8942279,-1.382813,
 'jimbo385@gmail.com','+44 23 8000 0234','https://oddjobhandymanservices.co.uk/','csv_import'),

('A1 Flat Pack Furniture Assemblers','Handyman / Small Jobs',ARRAY['Handyman / Small Jobs'],
 '62a Romsey Rd, Shirley, Southampton','SO16 4DB',50.9248844,-1.4379405,
 'mondayant@gmail.com','+44 7970 097454',NULL,'csv_import'),

('Handyman Southampton','Handyman / Small Jobs',
 ARRAY['Handyman / Small Jobs','Carpentry & Joinery','Electrical','Plumbing & Heating'],
 NULL,NULL,50.9230466,-1.418056,
 'info@wefix24.co.uk','+44 7300 300155','https://wefix24.co.uk/','csv_import'),

-- ── Moving & Transport ────────────────────────────────────────────────────────
('Pack & Stack Removals','Moving & Transport',ARRAY['Moving & Transport'],
 'Frobisher House, Southbrook Rd, Southampton','SO15 1GX',50.9084682,-1.4134772,
 'packandstackremovals@outlook.com','+44 23 8218 2968','https://www.packandstackremovals.co.uk/','csv_import'),

('Piano Removal Services','Moving & Transport',ARRAY['Moving & Transport'],
 'Southampton','SO16 6PX',50.9312491,-1.4270555,
 'quote@pianoremovalservices.com','+44 7789 898683','http://www.pianoremovalservices.com/','csv_import'),

('Relocate UK','Moving & Transport',ARRAY['Moving & Transport'],
 '8 The Blake Building, Ocean Way, Southampton','SO14 3LN',50.8972693,-1.3912931,
 'info@relocate.uk.com','+44 23 8071 0920','http://www.relocate.uk.com/','csv_import'),

('Home Run Removals Southampton','Moving & Transport',ARRAY['Moving & Transport'],
 '76 Hulton Cl, Southampton','SO19 9TY',50.8884572,-1.3773038,
 'info@homerunremovals.com','+44 7742 585609','https://homerunremovals.com/','csv_import'),

('Sledges of Southampton Removals','Moving & Transport',ARRAY['Moving & Transport'],
 '91 Sullivan Rd, Sholing, Southampton','SO19 0JQ',50.8987704,-1.3366194,
 'johnny@sledgesofsouthampton.co.uk','+44 7554 883717','https://www.sledgesofsouthampton.co.uk/','csv_import'),

('Morgans Movers','Moving & Transport',ARRAY['Moving & Transport'],
 '90 Palm Rd, Southampton','SO16 5HF',50.9360406,-1.4393584,
 'info.morgansmovers@gmail.com','+44 7833 341390','http://morgans-movers.com/','csv_import'),

('The Man In A Van Southampton','Moving & Transport',ARRAY['Moving & Transport'],
 '16 Portal Rd, Sholing, Southampton','SO19 8LE',50.9035611,-1.353113,
 'themaninavan@outlook.com','+44 7900 005611','https://www.themaninavan.uk/','csv_import'),

('D&D REMOVALS','Moving & Transport',ARRAY['Moving & Transport'],
 'Tunstall Rd, Southampton','SO19 6NT',50.9042263,-1.3310031,
 'info@dd-removals.co.uk','+44 7450 392596','https://www.d-d-removals.co.uk/','csv_import'),

('Locks Heath Removals Limited','Moving & Transport',ARRAY['Moving & Transport'],
 '5 Swanage Cl, Itchen, Southampton','SO19 2EW',50.901252,-1.3740085,
 'lhrrelocations@btinternet.com','+44 7860 828080','https://www.locksheathremovals.co.uk/','csv_import'),

('VIGO TRANSPORT LTD REMOVALS AND HOUSE CLEARANCE','Moving & Transport',ARRAY['Moving & Transport','Waste Removal'],
 '40 Danebury Way, Southampton','SO16 0YF',50.936204,-1.4654351,
 'info@vigotransport.co.uk','+44 7857 710628','https://www.vigotransport.co.uk/','csv_import'),

-- ── Waste Removal ─────────────────────────────────────────────────────────────
('The Waste Group - Skip Hire','Waste Removal',ARRAY['Waste Removal'],
 'Lower Banister St, Southampton','SO15 2RU',50.9122656,-1.405675,
 'info@thewastegroup.co.uk','+44 800 652 0160','https://www.thewastegroup.co.uk/areas/southampton/','csv_import'),

('South Coast Metal Recycling and Waste Clearance Ltd','Waste Removal',ARRAY['Waste Removal'],
 '6 Haweswater Close, Southampton','SO16 9QW',50.9282777,-1.453713,
 'southcoastmetalsandrecyclingltd@outlook.com','+44 7766 377740',
 'http://www.southcoastmetalrecyclingandwasteclearanceltd.co.uk/','csv_import'),

('L&S Waste Management','Waste Removal',ARRAY['Waste Removal'],
 'Ashley Cres, Southampton','SO19 9NA',50.8920058,-1.3437896,
 'info@lswaste.co.uk','+44 1329 840000','https://lswaste.co.uk/online-ordering/skip-hire/','csv_import'),

('South Central House Clearance Services Limited','Waste Removal',ARRAY['Waste Removal'],
 '22 Ivy Dene, Sholing, Southampton','SO19 0AB',50.9027181,-1.3350133,
 'centralenquiries@southcoastclearanceservices.com','+44 800 634 4692',
 'https://southcentralclearanceservices.com/','csv_import'),

('South Coast House Clearance Services Ltd','Waste Removal',ARRAY['Waste Removal','Gardening & Landscaping'],
 '94 Victoria Rd, Woolston, Southampton','SO19 9EF',50.8942676,-1.380608,
 'enquiries@southcoastclearanceservices.com','+44 808 134 8332',
 'https://southcoastclearanceservices.com/','csv_import'),

('Zero Waste Group Rubbish Removal','Waste Removal',ARRAY['Waste Removal'],
 'Unit F, Drivers Wharf, Questmap Business Park, Southampton','SO14 0PF',50.9130097,-1.3845642,
 'info@zerowastegroup.co.uk','+44 345 241 6055','https://www.zerowastegroup.co.uk/','csv_import'),

('TJ Waste & Recycling','Waste Removal',ARRAY['Waste Removal'],
 'Dibles Wharf, Belvidere Road, Southampton','SO14 5QY',50.9079415,-1.3877035,
 'enquiries@tj-group.co.uk','+44 1329 226170','https://www.tj-waste.co.uk/','csv_import'),

('BMC Clearance Services','Waste Removal',ARRAY['Waste Removal','Moving & Transport'],
 '94 Green Ln, Southampton','SO16 9FP',50.9327607,-1.4555543,
 'BMC.Clearanceservices@outlook.com','+44 7917 415304','https://bmcclearanceservices.co.uk/','csv_import'),

('No1 House Clearance Southampton','Waste Removal',ARRAY['Waste Removal'],
 '9C Carlisle Rd, Shirley, Southampton','SO16 4FG',50.9228265,-1.4354619,
 'no1@no1houseclearancesouthampton.co.uk','+44 23 8202 9294',
 'https://no1houseclearancesouthampton.co.uk/','csv_import'),

('ethiclear Ltd','Waste Removal',ARRAY['Waste Removal','Moving & Transport'],
 '15 Rockstone Pl, Southampton','SO15 2EP',50.9145564,-1.4029538,
 'hello@ethiclear.co.uk','+44 23 8244 4108','https://www.ethiclear.co.uk/','csv_import'),

('First Call Rubbish','Waste Removal',ARRAY['Waste Removal'],
 'Warren Ave, Shirley Warren, Southampton','SO16 6AE',50.9301455,-1.4386415,
 'info@firstcallrubbish.co.uk','+44 7502 093081','https://www.firstcallrubbish.co.uk/','csv_import'),

-- ── Fencing & Gates ───────────────────────────────────────────────────────────
('Southampton Fencing Pros','Fencing & Gates',ARRAY['Fencing & Gates'],
 '292 Shirley Rd, Shirley, Southampton','SO15 3HL',50.9165805,-1.4262776,
 'info@southamptonfencingpros.com','+44 23 9431 1777','https://southamptonfencingpros.com/','csv_import'),

('Aztec Fencing','Fencing & Gates',ARRAY['Fencing & Gates'],
 '18 Thornleigh Rd, Woolston, Southampton','SO19 9DH',50.8958917,-1.3712264,
 'jamie@aztecfencing.co.uk',NULL,'https://www.aztecfencing.co.uk/','csv_import'),

('MA Fencing','Fencing & Gates',ARRAY['Fencing & Gates'],
 'Freemantle Cl, Southampton','SO19 7BB',50.9096859,-1.3658796,
 'enquiries@mafencing.com','+44 7962 164650','https://mafencing.com/','csv_import'),

('Hayward Fencing','Fencing & Gates',ARRAY['Fencing & Gates'],
 '35 Middle Rd, Southampton','SO52 9JD',50.8992225,-1.3613951,
 'enquiries@hayward-fencing.co.uk','+44 7860 351582','http://www.hayward-fencing.co.uk/','csv_import'),

('Fencing Solutions','Fencing & Gates',ARRAY['Fencing & Gates','Gardening & Landscaping'],
 NULL,NULL,50.9322775,-1.4336391,
 'fencingsolutionssouth@gmail.com','+44 7518 390816',
 'https://fencingsolutionssouthampton.co.uk/','csv_import'),

-- ── Air Conditioning & Ventilation ────────────────────────────────────────────
('Thomas Air Services (TAS) Ltd','Air Conditioning & Ventilation',ARRAY['Air Conditioning & Ventilation'],
 'Unit 7B, Northbrook Industrial Estate, Vincent Ave, Southampton','SO16 6PB',50.9320283,-1.427285,
 'info@taslimited.co.uk','+44 23 8077 4888','http://www.taslimited.co.uk/','csv_import'),

('HHS Air Conditioning Installation Southampton','Air Conditioning & Ventilation',ARRAY['Air Conditioning & Ventilation'],
 '15 English Rd, Southampton','SO15 8PR',50.9182154,-1.434408,
 'info@hhs-aircon.com','+44 23 8070 3307','https://hhs-aircon.com/','csv_import'),

('Intelligent Air - Home & Office Air Conditioning','Air Conditioning & Ventilation',ARRAY['Air Conditioning & Ventilation'],
 'Archway House, Wilton Rd, Southampton','SO15 5JP',50.9301556,-1.4265375,
 'hello@intelligentair.co.uk','+44 23 8218 2907','http://www.intelligentair.co.uk/','csv_import'),

('Air cool mechanical services ltd','Air Conditioning & Ventilation',ARRAY['Air Conditioning & Ventilation'],
 '33a Portsmouth Rd, Woolston, Southampton','SO19 9BA',50.8981996,-1.3794696,
 'info@aircoolmech.co.uk','+44 7432 598866','http://aircoolmech.co.uk/','csv_import'),

('Woodhouse Environmental Services','Air Conditioning & Ventilation',ARRAY['Air Conditioning & Ventilation'],
 '1-2 Lower Vicarage Rd, Woolston, Southampton','SO19 7RJ',50.9003117,-1.3813058,
 'enquiries@woodhouseservices.co.uk','+44 1489 797800','https://woodhouseservices.co.uk/','csv_import'),

('Just Coolers Southampton','Air Conditioning & Ventilation',ARRAY['Air Conditioning & Ventilation'],
 '151 High St, Southampton','SO14 2BT',50.9006485,-1.4041686,
 'sales@just-coolers.com','+44 23 8001 0395','http://just-coolers.com/air-conditioning-southampton/','csv_import')

ON CONFLICT (company_name, postcode) DO NOTHING;

-- Back-fill any newly inserted rows that still have NULL normalised_categories
UPDATE public.seeded_trades
SET normalised_categories = ARRAY[trade_category]
WHERE normalised_categories IS NULL
  AND trade_category IS NOT NULL
  AND source = 'csv_import';
