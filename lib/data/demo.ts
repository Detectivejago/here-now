import type { Category, City, EventRecord } from "@/lib/types";

export const demoCities: City[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Milano",
    slug: "milano",
    country_code: "IT",
    latitude: 45.4642,
    longitude: 9.19,
    lat: 45.4642,
    lng: 9.19,
    radius_km: 14,
    bbox: { south: 45.386, west: 9.04, north: 45.535, east: 9.32 },
    is_active: true
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Parigi",
    slug: "parigi",
    country_code: "FR",
    latitude: 48.8566,
    longitude: 2.3522,
    lat: 48.8566,
    lng: 2.3522,
    radius_km: 15,
    bbox: { south: 48.8156, west: 2.2241, north: 48.9022, east: 2.4699 },
    is_active: true
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Amsterdam",
    slug: "amsterdam",
    country_code: "NL",
    latitude: 52.3676,
    longitude: 4.9041,
    lat: 52.3676,
    lng: 4.9041,
    radius_km: 12,
    bbox: { south: 52.318, west: 4.728, north: 52.431, east: 5.079 },
    is_active: true
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "New York",
    slug: "new-york",
    country_code: "US",
    latitude: 40.7128,
    longitude: -74.006,
    lat: 40.7128,
    lng: -74.006,
    radius_km: 18,
    bbox: { south: 40.4774, west: -74.2591, north: 40.9176, east: -73.7004 },
    is_active: true
  }
];

export const demoCategories: Category[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    slug: "musica",
    name_it: "Musica",
    name_en: "Music",
    color: "#FF6B61",
    sort_order: 1,
    is_active: true
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    slug: "arte",
    name_it: "Arte",
    name_en: "Art",
    color: "#3C8DAD",
    sort_order: 2,
    is_active: true
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    slug: "food",
    name_it: "Food",
    name_en: "Food",
    color: "#F2A65A",
    sort_order: 3,
    is_active: true
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    slug: "sport",
    name_it: "Sport",
    name_en: "Sport",
    color: "#4BA66A",
    sort_order: 4,
    is_active: true
  },
  {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    slug: "networking",
    name_it: "Networking",
    name_en: "Networking",
    color: "#7C6FE8",
    sort_order: 5,
    is_active: true
  },
  {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    slug: "club",
    name_it: "Club",
    name_en: "Club",
    color: "#173F72",
    sort_order: 6,
    is_active: true
  }
];

const now = new Date();
const daysFromNow = (days: number) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 19, 30).toISOString();

export const demoEvents: EventRecord[] = [
  {
    id: "90000000-0000-4000-8000-000000000001",
    title: "Jazz al tramonto",
    description: "Una serata intima con trio jazz, drink leggeri e vista sui tetti di Brera.",
    city_id: demoCities[0].id,
    category_id: demoCategories[0].id,
    start_date: daysFromNow(2),
    end_date: null,
    latitude: 45.472,
    longitude: 9.187,
    address: "Brera, Milano",
    image_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=900&q=80",
    created_by: null,
    status: "approved",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    cities: demoCities[0],
    categories: demoCategories[0]
  },
  {
    id: "90000000-0000-4000-8000-000000000002",
    title: "Design walk in Porta Nuova",
    description: "Passeggiata guidata tra installazioni, architettura contemporanea e studi creativi.",
    city_id: demoCities[0].id,
    category_id: demoCategories[1].id,
    start_date: daysFromNow(5),
    end_date: null,
    latitude: 45.484,
    longitude: 9.191,
    address: "Porta Nuova, Milano",
    image_url: null,
    created_by: null,
    status: "approved",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    cities: demoCities[0],
    categories: demoCategories[1]
  },
  {
    id: "90000000-0000-4000-8000-000000000003",
    title: "Degustazione Navigli",
    description: "Piccoli produttori, vini naturali e assaggi pensati per scoprire il quartiere.",
    city_id: demoCities[0].id,
    category_id: demoCategories[2].id,
    start_date: daysFromNow(8),
    end_date: null,
    latitude: 45.451,
    longitude: 9.174,
    address: "Navigli, Milano",
    image_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80",
    created_by: null,
    status: "approved",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    cities: demoCities[0],
    categories: demoCategories[2]
  },
  {
    id: "90000000-0000-4000-8000-000000000004",
    title: "Atelier aperti a Le Marais",
    description: "Gallerie indipendenti e artisti locali aprono gli studi per una visita serale.",
    city_id: demoCities[1].id,
    category_id: demoCategories[1].id,
    start_date: daysFromNow(4),
    end_date: null,
    latitude: 48.859,
    longitude: 2.362,
    address: "Le Marais, Paris",
    image_url: null,
    created_by: null,
    status: "approved",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    cities: demoCities[1],
    categories: demoCategories[1]
  },
  {
    id: "90000000-0000-4000-8000-000000000005",
    title: "Canal run",
    description: "Corsa leggera lungo i canali, ritmo sociale e colazione finale.",
    city_id: demoCities[2].id,
    category_id: demoCategories[3].id,
    start_date: daysFromNow(3),
    end_date: null,
    latitude: 52.37,
    longitude: 4.895,
    address: "Jordaan, Amsterdam",
    image_url: null,
    created_by: null,
    status: "approved",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    cities: demoCities[2],
    categories: demoCategories[3]
  },
  {
    id: "90000000-0000-4000-8000-000000000006",
    title: "Rooftop founders night",
    description: "Incontro informale per founder, creativi e operatori tech nel cuore di Manhattan.",
    city_id: demoCities[3].id,
    category_id: demoCategories[4].id,
    start_date: daysFromNow(6),
    end_date: null,
    latitude: 40.741,
    longitude: -73.989,
    address: "Flatiron, New York",
    image_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
    created_by: null,
    status: "approved",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    cities: demoCities[3],
    categories: demoCategories[4]
  }
];

export const demoHomeData = {
  cities: demoCities,
  categories: demoCategories,
  events: demoEvents
};
