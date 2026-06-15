export const citySelect = `
  id,
  name,
  slug,
  country_code,
  country,
  timezone,
  launch_status,
  latitude,
  longitude,
  lat,
  lng,
  radius_km,
  bbox,
  is_active
`;

export const legacyCitySelect = citySelect
  .replace("  lat,\n", "")
  .replace("  lng,\n", "");

export const minimalCitySelect = `
  id,
  name,
  slug,
  country_code,
  latitude,
  longitude,
  radius_km,
  bbox,
  is_active
`;

export const publicEventSelect = `
  id,
  title,
  description,
  city_id,
  category_id,
  start_date,
  end_date,
  start_time,
  end_time,
  timezone,
  latitude,
  longitude,
  lat,
  lng,
  venue_name,
  address,
  image_url,
  created_by,
  status,
  moderation_status,
  event_type,
  visibility,
  source_type,
  source_id,
  external_id,
  source_url,
  confidence_score,
  quality_score,
  verified_at,
  expires_at,
  created_at,
  updated_at,
  cities(*),
  categories(*)
`;

export const mapEventSelect = `
  id,
  title,
  city_id,
  category_id,
  start_date,
  end_date,
  start_time,
  end_time,
  timezone,
  latitude,
  longitude,
  lat,
  lng,
  venue_name,
  created_by,
  status,
  moderation_status,
  event_type,
  visibility,
  source_type,
  source_id,
  external_id,
  source_url,
  confidence_score,
  quality_score,
  verified_at,
  expires_at,
  created_at,
  updated_at,
  cities(*),
  categories(*)
`;

export const createdEventSelect = `
  id,
  secret_token
`;

export const legacyPublicEventSelect = publicEventSelect.replace("  quality_score,\n", "");

export const legacyMapEventSelect = mapEventSelect.replace("  quality_score,\n", "");
