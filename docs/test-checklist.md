# Checklist finale di test

## UI mobile-first

- La homepage appare su sfondo crema caldo.
- Titolo grande e leggibile senza sovrapporsi ai bottoni.
- Bottoni principali blu navy, azioni corallo, pill molto arrotondate.
- Selettore città compatto.
- Mappa con bordi molto arrotondati e ombra morbida.
- Nessuna lista lunga di eventi sotto la mappa.
- Menu categorie si apre verticalmente e mostra dot colorati.

## Mappa ed eventi

- Milano è selezionata di default.
- Cambio città centra la mappa sui bounds corretti.
- Marker evento usa il colore categoria.
- Popup mostra titolo, categoria, data, luogo, descrizione e immagine quando presente.
- Filtro categoria riduce i marker.
- Gli eventi fuori dal bounding box città non vengono mostrati.

## Auth e creazione

- Login email/password funziona.
- Magic link reindirizza a `/auth/callback`.
- Utente autenticato può proporre evento.
- Evento creato dall'utente è `pending`.
- Immagine oltre 3MB viene rifiutata.
- Utente non autenticato viene mandato a login.

## Admin

- `/admin` richiede login.
- Utente non-admin non vede il pannello.
- Admin vede eventi pending.
- Admin può modificare campi evento.
- Admin può approvare o rifiutare.
- Evento approvato appare sulla mappa.
- Admin può aggiornare categorie e città.

## Database e sicurezza

- RLS è attiva su tutte le tabelle applicative.
- Lettura pubblica mostra solo eventi approvati.
- Utente normale non può approvare eventi.
- Utente normale non può cambiare il proprio ruolo in admin.
- Indice GiST `events_location_gix` esiste.
- Bucket `event-images` accetta solo immagini e massimo 3MB.

## Deploy

- `npm run typecheck` passa.
- `npm run build` passa.
- Variabili Vercel configurate.
- Callback Supabase include URL locale e produzione.
- Primo admin promosso via SQL.
