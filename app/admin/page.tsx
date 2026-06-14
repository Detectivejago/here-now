import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Plus, Save, Trash2, X } from "lucide-react";
import {
  createAdminEvent,
  deleteEvent,
  saveCategory,
  saveCity,
  saveEvent,
  updateEventStatus
} from "@/app/admin/actions";
import { getLifecycleStatus, getModerationStatus } from "@/lib/events/filters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Category, City, EventRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

function countEvents(rows: { event_name: string }[] | null | undefined, eventName: string) {
  return rows?.filter((row) => row.event_name === eventName).length ?? 0;
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <main className="admin-page">
        <section className="admin-shell">
          <div className="admin-card">
            <h1 className="admin-title">Admin</h1>
            <p className="admin-copy">
              Configura Supabase in `.env.local` per usare autenticazione, RLS e pannello admin.
            </p>
            <Link href="/" className="pill-button primary">
              Torna alla mappa
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    notFound();
  }

  const [
    { data: events },
    { data: categories },
    { data: cities },
    { data: analyticsRows }
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*, cities(*), categories(*)")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("cities").select("*").order("name", { ascending: true }),
    supabase
      .from("analytics_events")
      .select("event_name")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1000)
  ]);

  const typedCategories = (categories ?? []) as Category[];
  const typedCities = (cities ?? []) as City[];
  const typedEvents = (events ?? []) as EventRecord[];
  const approvedCount = typedEvents.filter((event) => getModerationStatus(event) === "approved").length;
  const pendingCount = typedEvents.filter((event) => getModerationStatus(event) === "pending").length;
  const firstCity = typedCities[0];
  const firstCategory = typedCategories[0];

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-header">
          <h1 className="admin-title">Pannello admin</h1>
          <p className="admin-copy">
            Approva gli eventi pending, correggi dati geografici e mantieni categorie e città
            coerenti prima che compaiano sulla mappa.
          </p>
          <Link href="/" className="pill-button subtle">
            Torna alla mappa
          </Link>
        </header>

        <div className="admin-grid">
          <section className="admin-card">
            <h2>Analytics base</h2>
            <div className="metric-grid">
              <div className="metric">
                <strong>{approvedCount}</strong>
                <span>eventi approvati</span>
              </div>
              <div className="metric">
                <strong>{pendingCount}</strong>
                <span>eventi pending</span>
              </div>
              <div className="metric">
                <strong>{countEvents(analyticsRows, "page_view")}</strong>
                <span>visite 7 giorni</span>
              </div>
              <div className="metric">
                <strong>{countEvents(analyticsRows, "event_clicked")}</strong>
                <span>click evento 7 giorni</span>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <h2>Nuovo evento</h2>
            <form action={createAdminEvent} className="form-grid">
              <label className="field">
                Titolo
                <input name="title" required />
              </label>
              <label className="field">
                Descrizione
                <textarea name="description" required />
              </label>
              <div className="form-row">
                <label className="field">
                  Città
                  <select name="city_id" defaultValue={firstCity?.id} required>
                    {typedCities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Categoria
                  <select name="category_id" defaultValue={firstCategory?.id} required>
                    {typedCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name_it}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label className="field">
                  Inizio
                  <input name="start_date" type="datetime-local" required />
                </label>
                <label className="field">
                  Fine
                  <input name="end_date" type="datetime-local" />
                </label>
              </div>
              <label className="field">
                Indirizzo
                <input name="address" />
              </label>
              <div className="form-row">
                <label className="field">
                  Latitudine
                  <input name="latitude" defaultValue={firstCity?.latitude} required />
                </label>
                <label className="field">
                  Longitudine
                  <input name="longitude" defaultValue={firstCity?.longitude} required />
                </label>
              </div>
              <label className="field">
                Immagine URL
                <input name="image_url" type="url" />
              </label>
              <label className="field">
                Status
                <select name="status" defaultValue="approved" required>
                  <option value="approved">approved</option>
                  <option value="pending">pending</option>
                  <option value="rejected">rejected</option>
                </select>
              </label>
              <button className="small-button save" type="submit">
                <Plus size={16} aria-hidden="true" /> Crea evento
              </button>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card-heading">
              <h2>Eventi recenti</h2>
              <p className="admin-hint">Ultimi 40 eventi, inclusi approvati, pending e rifiutati.</p>
            </div>
            {typedEvents.length === 0 ? (
              <p className="empty-state">Nessun evento creato.</p>
            ) : (
              typedEvents.map((event) => (
                <article className="pending-event event-admin-card" key={event.id}>
                  <div className="event-admin-heading">
                    <h3>{event.title}</h3>
                    <span className={`status-badge ${getModerationStatus(event)}`}>
                      {getModerationStatus(event)}
                    </span>
                  </div>
                  <p className="event-admin-meta">
                    {event.cities?.name ?? "Citta non impostata"} ·{" "}
                    {event.categories?.name_it ?? "Categoria non impostata"} ·{" "}
                    {toDateTimeLocal(event.start_date).replace("T", " ")} ·{" "}
                    {getLifecycleStatus(event)}
                  </p>
                  <form action={saveEvent} className="form-grid">
                    <input type="hidden" name="id" value={event.id} />
                    <label className="field">
                      Titolo
                      <input name="title" defaultValue={event.title} required />
                    </label>
                    <label className="field">
                      Descrizione
                      <textarea name="description" defaultValue={event.description} required />
                    </label>
                    <div className="form-row">
                      <label className="field">
                        Città
                        <select name="city_id" defaultValue={event.city_id} required>
                          {typedCities.map((city) => (
                            <option key={city.id} value={city.id}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        Categoria
                        <select name="category_id" defaultValue={event.category_id} required>
                          {typedCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name_it}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-row">
                      <label className="field">
                        Inizio
                        <input
                          name="start_date"
                          type="datetime-local"
                          defaultValue={toDateTimeLocal(event.start_date)}
                          required
                        />
                      </label>
                      <label className="field">
                        Fine
                        <input
                          name="end_date"
                          type="datetime-local"
                          defaultValue={toDateTimeLocal(event.end_date)}
                        />
                      </label>
                    </div>
                    <label className="field">
                      Indirizzo
                      <input name="address" defaultValue={event.address ?? ""} />
                    </label>
                    <label className="field">
                      Immagine URL
                      <input name="image_url" type="url" defaultValue={event.image_url ?? ""} />
                    </label>
                    <div className="form-row">
                      <label className="field">
                        Latitudine
                        <input name="latitude" defaultValue={event.latitude} required />
                      </label>
                      <label className="field">
                        Longitudine
                        <input name="longitude" defaultValue={event.longitude} required />
                      </label>
                    </div>
                    <div className="admin-actions">
                      <button className="small-button save" type="submit">
                        <Save size={16} aria-hidden="true" /> Salva modifiche
                      </button>
                    </div>
                  </form>

                  <div className="admin-actions">
                    <form action={updateEventStatus}>
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="status" value="pending" />
                      <button className="small-button pending" type="submit">
                        Pending
                      </button>
                    </form>
                    <form action={updateEventStatus}>
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button className="small-button approve" type="submit">
                        <Check size={16} aria-hidden="true" /> Approva
                      </button>
                    </form>
                    <form action={updateEventStatus}>
                      <input type="hidden" name="id" value={event.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button className="small-button reject" type="submit">
                        <X size={16} aria-hidden="true" /> Rifiuta
                      </button>
                    </form>
                    <form action={deleteEvent}>
                      <input type="hidden" name="id" value={event.id} />
                      <button className="small-button reject" type="submit">
                        <Trash2 size={16} aria-hidden="true" /> Elimina
                      </button>
                    </form>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="admin-card">
            <h2>Categorie</h2>
            {typedCategories.map((category) => (
              <form action={saveCategory} className="form-grid pending-event" key={category.id}>
                <input type="hidden" name="id" value={category.id} />
                <div className="form-row">
                  <label className="field">
                    Slug
                    <input name="slug" defaultValue={category.slug} required />
                  </label>
                  <label className="field">
                    Colore
                    <input name="color" type="color" defaultValue={category.color} required />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    Nome IT
                    <input name="name_it" defaultValue={category.name_it} required />
                  </label>
                  <label className="field">
                    Nome EN
                    <input name="name_en" defaultValue={category.name_en} required />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    Ordine
                    <input name="sort_order" defaultValue={category.sort_order} />
                  </label>
                  <label className="field">
                    Attiva
                    <input name="is_active" type="checkbox" defaultChecked={category.is_active} />
                  </label>
                </div>
                <button className="small-button save" type="submit">
                  <Save size={16} aria-hidden="true" /> Salva categoria
                </button>
              </form>
            ))}
          </section>

          <section className="admin-card">
            <h2>Città</h2>
            {typedCities.map((city) => (
              <form action={saveCity} className="form-grid pending-event" key={city.id}>
                <input type="hidden" name="id" value={city.id} />
                <div className="form-row">
                  <label className="field">
                    Nome
                    <input name="name" defaultValue={city.name} required />
                  </label>
                  <label className="field">
                    Slug
                    <input name="slug" defaultValue={city.slug} required />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    Paese
                    <input name="country_code" defaultValue={city.country_code} required />
                  </label>
                  <label className="field">
                    Raggio km
                    <input name="radius_km" defaultValue={city.radius_km} required />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    Latitudine centro
                    <input name="latitude" defaultValue={city.latitude} required />
                  </label>
                  <label className="field">
                    Longitudine centro
                    <input name="longitude" defaultValue={city.longitude} required />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    Sud
                    <input name="south" defaultValue={city.bbox.south} required />
                  </label>
                  <label className="field">
                    Ovest
                    <input name="west" defaultValue={city.bbox.west} required />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    Nord
                    <input name="north" defaultValue={city.bbox.north} required />
                  </label>
                  <label className="field">
                    Est
                    <input name="east" defaultValue={city.bbox.east} required />
                  </label>
                </div>
                <label className="field">
                  Attiva
                  <input name="is_active" type="checkbox" defaultChecked={city.is_active} />
                </label>
                <button className="small-button save" type="submit">
                  <Save size={16} aria-hidden="true" /> Salva città
                </button>
              </form>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
