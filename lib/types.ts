export type Locale = "it" | "en";

export type ModerationStatus = "pending" | "approved" | "rejected";

export type EventType = "temporary" | "recurring" | "permanent" | "private";

export type EventLifecycleStatus = "live_now" | "upcoming" | "ongoing" | "expired" | "cancelled";

export type EventTemporalStatus =
  | "live_now"
  | "starting_soon"
  | "today_later"
  | "upcoming"
  | "ongoing"
  | "permanent"
  | "ended";

export type EventVisibility = "public" | "password" | "link_only" | "private";

export type EventSourceType = "user" | "api" | "partner" | "manual";

export type EventStatus = ModerationStatus;

export type TimeFilter = "now" | "today" | "week" | "permanent" | "private";

export type EventReportReason =
  | "not_existing"
  | "wrong_time"
  | "wrong_place"
  | "inappropriate"
  | "duplicate"
  | "other";

export type UserRole = "user" | "admin";

export type CityBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type City = {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  country?: string | null;
  timezone?: string | null;
  launch_status?: "active" | "beta" | "requested" | null;
  latitude: number;
  longitude: number;
  lat?: number | null;
  lng?: number | null;
  radius_km: number;
  bbox: CityBounds;
  is_active: boolean;
};

export type Category = {
  id: string;
  slug: string;
  name_it: string;
  name_en: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  city_id: string;
  category_id: string;
  start_date: string;
  end_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
  timezone?: string | null;
  latitude: number;
  longitude: number;
  lat?: number | null;
  lng?: number | null;
  venue_name?: string | null;
  address: string | null;
  image_url: string | null;
  created_by: string | null;
  status: EventStatus | EventLifecycleStatus;
  moderation_status?: ModerationStatus | null;
  event_type?: EventType | null;
  visibility?: EventVisibility | null;
  password_hash?: string | null;
  secret_token?: string | null;
  source_type?: EventSourceType | null;
  source_id?: string | null;
  external_id?: string | null;
  source_url?: string | null;
  confidence_score?: number | null;
  quality_score?: number | null;
  verified_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  cities?: City | null;
  categories?: Category | null;
};

export type ClubRecord = {
  id: string;
  name: string;
  description: string | null;
  city_id: string | null;
  created_by: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type HomeData = {
  cities: City[];
  categories: Category[];
  events: EventRecord[];
};

export type AnalyticsEventName =
  | "page_view"
  | "city_selected"
  | "category_selected"
  | "event_clicked"
  | "event_created"
  | "event_reported"
  | "club_created"
  | "feedback_submitted"
  | "city_requested"
  | "onboarding_seen";
