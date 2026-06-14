# Deploy su Vercel

## 1. Prepara Supabase

1. Crea un progetto Supabase.
2. Apri SQL Editor.
3. Esegui `supabase/schema.sql`.
4. Esegui `supabase/seed.sql`.
5. In Authentication abilita email/password e magic link.
6. In Authentication > URL Configuration aggiungi:
   - `http://localhost:3000/auth/callback`
   - `https://TUO-DOMINIO.vercel.app/auth/callback`

## 2. Variabili ambiente Vercel

Imposta in Project Settings > Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://TUO-DOMINIO.vercel.app
```

Non mettere `SUPABASE_SERVICE_ROLE_KEY` nelle variabili pubbliche client. Usala solo per script server/backup controllati.

## 3. Deploy

1. Collega il repository GitHub a Vercel.
2. Framework preset: Next.js.
3. Build command: `npm run build`.
4. Output: default Next.js.
5. Deploy.

## 4. Admin iniziale

1. Crea un account dall'app o da Supabase Auth.
2. In Supabase SQL Editor promuovi quell'utente:

```sql
update public.profiles
set role = 'admin'
where id = 'USER_UUID';
```

3. Apri `/admin`.

## 5. Verifiche post deploy

- Homepage visibile su mobile.
- Mappa caricata e centrata su Milano.
- Cambio città centra la mappa.
- Menu categorie filtra marker.
- Login funziona.
- Evento creato da utente normale entra in `pending`.
- Admin può approvare e l'evento appare in homepage.
