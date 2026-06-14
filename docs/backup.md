# Backup Supabase

## Strategia

- Database: dump giornaliero con `pg_dump` o Supabase CLI.
- Storage: sync periodico del bucket `event-images`.
- Conservazione: almeno 7 backup giornalieri, 4 settimanali, 3 mensili.
- Verifica: ripristino di prova mensile su progetto Supabase separato.

## Database

Imposta `SUPABASE_DB_URL` in locale o nel runner sicuro:

```bash
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file "backup/herenow-$(date +%Y%m%d-%H%M).dump"
```

## Storage immagini

Supabase Storage supporta API S3 compatibile. Configura endpoint e credenziali S3 del progetto, poi esegui un sync con un tool compatibile, per esempio AWS CLI:

```bash
aws s3 sync \
  "s3://event-images" \
  "backup/storage/event-images" \
  --endpoint-url "$SUPABASE_S3_ENDPOINT"
```

## Script incluso

Usa `scripts/backup-supabase.sh` come base per backup locale o cron. Prima:

```bash
chmod +x scripts/backup-supabase.sh
```

Poi:

```bash
SUPABASE_DB_URL="postgresql://..." ./scripts/backup-supabase.sh
```
