import Link from "next/link";

export default function EventNotFound() {
  return (
    <main className="event-page">
      <section className="event-detail-card">
        <div className="event-detail-body">
          <Link href="/" className="event-back-link">
            Torna alla mappa
          </Link>
          <h1>Evento non trovato</h1>
          <p className="event-popup-description">
            Potrebbe essere stato rimosso, scaduto o non più pubblico.
          </p>
        </div>
      </section>
    </main>
  );
}
