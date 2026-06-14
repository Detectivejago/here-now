begin;

insert into public.cities (
  id,
  name,
  slug,
  country_code,
  latitude,
  longitude,
  radius_km,
  bbox,
  is_active
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Milano',
    'milano',
    'IT',
    45.4642,
    9.1900,
    14,
    '{"south":45.386,"west":9.04,"north":45.535,"east":9.32}'::jsonb,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Parigi',
    'parigi',
    'FR',
    48.8566,
    2.3522,
    15,
    '{"south":48.8156,"west":2.2241,"north":48.9022,"east":2.4699}'::jsonb,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Amsterdam',
    'amsterdam',
    'NL',
    52.3676,
    4.9041,
    12,
    '{"south":52.318,"west":4.728,"north":52.431,"east":5.079}'::jsonb,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'New York',
    'new-york',
    'US',
    40.7128,
    -74.0060,
    18,
    '{"south":40.4774,"west":-74.2591,"north":40.9176,"east":-73.7004}'::jsonb,
    true
  )
on conflict (slug) do update
set name = excluded.name,
    country_code = excluded.country_code,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    radius_km = excluded.radius_km,
    bbox = excluded.bbox,
    is_active = excluded.is_active;

insert into public.categories (
  id,
  slug,
  name_it,
  name_en,
  color,
  sort_order,
  is_active
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'musica',
    'Musica',
    'Music',
    '#FF6B61',
    1,
    true
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'arte',
    'Arte',
    'Art',
    '#3C8DAD',
    2,
    true
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'food',
    'Food',
    'Food',
    '#F2A65A',
    3,
    true
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'sport',
    'Sport',
    'Sport',
    '#4BA66A',
    4,
    true
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'networking',
    'Networking',
    'Networking',
    '#7C6FE8',
    5,
    true
  ),
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'club',
    'Club',
    'Club',
    '#173F72',
    6,
    true
  )
on conflict (slug) do update
set name_it = excluded.name_it,
    name_en = excluded.name_en,
    color = excluded.color,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

insert into public.events (
  id,
  title,
  description,
  city_id,
  category_id,
  start_date,
  end_date,
  latitude,
  longitude,
  address,
  image_url,
  created_by,
  status
)
values
  (
    '90000000-0000-4000-8000-000000000001',
    'Jazz al tramonto',
    'Una serata intima con trio jazz, drink leggeri e vista sui tetti di Brera.',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    now() + interval '2 days',
    null,
    45.472,
    9.187,
    'Brera, Milano',
    'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=900&q=80',
    null,
    'approved'
  ),
  (
    '90000000-0000-4000-8000-000000000002',
    'Design walk in Porta Nuova',
    'Passeggiata guidata tra installazioni, architettura contemporanea e studi creativi.',
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    now() + interval '5 days',
    null,
    45.484,
    9.191,
    'Porta Nuova, Milano',
    null,
    null,
    'approved'
  ),
  (
    '90000000-0000-4000-8000-000000000003',
    'Degustazione Navigli',
    'Piccoli produttori, vini naturali e assaggi pensati per scoprire il quartiere.',
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    now() + interval '8 days',
    null,
    45.451,
    9.174,
    'Navigli, Milano',
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80',
    null,
    'approved'
  ),
  (
    '90000000-0000-4000-8000-000000000004',
    'Atelier aperti a Le Marais',
    'Gallerie indipendenti e artisti locali aprono gli studi per una visita serale.',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    now() + interval '4 days',
    null,
    48.859,
    2.362,
    'Le Marais, Paris',
    null,
    null,
    'approved'
  ),
  (
    '90000000-0000-4000-8000-000000000005',
    'Canal run',
    'Corsa leggera lungo i canali, ritmo sociale e colazione finale.',
    '33333333-3333-4333-8333-333333333333',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    now() + interval '3 days',
    null,
    52.37,
    4.895,
    'Jordaan, Amsterdam',
    null,
    null,
    'approved'
  ),
  (
    '90000000-0000-4000-8000-000000000006',
    'Rooftop founders night',
    'Incontro informale per founder, creativi e operatori tech nel cuore di Manhattan.',
    '44444444-4444-4444-8444-444444444444',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    now() + interval '6 days',
    null,
    40.741,
    -73.989,
    'Flatiron, New York',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
    null,
    'approved'
  )
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    city_id = excluded.city_id,
    category_id = excluded.category_id,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    address = excluded.address,
    image_url = excluded.image_url,
    status = excluded.status;

commit;
