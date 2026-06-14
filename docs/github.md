# GitHub e versionamento

## Primo setup

```bash
git init
git add .
git commit -m "Initial HereNow app"
git branch -M main
git remote add origin git@github.com:TUO-UTENTE/herenow.git
git push -u origin main
```

## Flusso consigliato

```bash
git checkout -b feature/event-map
git add .
git commit -m "Add event map filters"
git push -u origin feature/event-map
```

Apri una Pull Request su GitHub e collega Vercel alla branch per preview automatiche.

## Regole pratiche

- Una branch per feature.
- Commit piccoli ma completi.
- Non committare `.env.local`, dump database o backup storage.
- Tieni SQL migrations e seed in `supabase/`.
- Prima della PR esegui `npm run typecheck` e `npm run build`.
