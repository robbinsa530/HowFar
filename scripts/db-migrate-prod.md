# Production DB migrations (Liquibase)

Run this **from your machine** after merging schema changes, before (or right after) deploying app code that needs the new schema.

## Prerequisites

- [Liquibase CLI](https://docs.liquibase.com/start/install/home.html) installed (`liquibase --version`).
- Network access to Supabase (your IP may need to be allowed under **Project Settings → Database** if restrictions are on).

## One-time setup

1. Copy the example env file:

   ```bash
   cp scripts/liquibase-prod.env.example scripts/liquibase-prod.env
   ```

2. Fill in `scripts/liquibase-prod.env` (this file is gitignored).

### From your Supabase connection URI

Supabase gives a URI like:

```text
postgresql://postgres:[PASSWORD]@db.[DB_URL].supabase.co:5432/postgres
```

Build the three variables like this:

| Variable | Value |
|----------|--------|
| `HOWFAR_PROD_LIQUIBASE_USER` | `postgres` (the username before `@`) |
| `HOWFAR_PROD_LIQUIBASE_PASSWORD` | Your real password (replace `[PASSWORD]` — no brackets) |
| `HOWFAR_PROD_LIQUIBASE_JDBC_URL` | JDBC form of the same host/db, with SSL |

**JDBC URL pattern** (replace host with yours from the URI):

```text
jdbc:postgresql://db.[DB_URL].supabase.co:5432/postgres?sslmode=require
```

- Host: the part after `@` up to `:5432` → `db.xxxxx.supabase.co`
- Port: `5432`
- Database: path after port → usually `postgres`
- `?sslmode=require` is required for typical Supabase connections from outside their network.

Use **single quotes** in the env file if the password contains `$`, `` ` ``, or `\`.

## Run migrations

From the repo root:

```bash
chmod +x scripts/db-migrate-prod.sh   # once
npm run db:update:prod
```

Or directly:

```bash
./scripts/db-migrate-prod.sh          # default: liquibase update
./scripts/db-migrate-prod.sh status   # pending vs applied
./scripts/db-migrate-prod.sh history  # deployment history
```

## Same URL for the Node server

Your app’s `DATABASE_URL` (or Supabase pooler URL) for `server/index.js` is the **postgresql://** URI Supabase shows — that is separate from the JDBC URL Liquibase uses, but it points at the **same** database. Keep both in env files; do not commit secrets.

## Safety

- Run `status` before `update` if you want to see what will apply.
- Take a Supabase backup or snapshot before risky changes.
- Apply migrations **before** deploying code that depends on new tables/columns.
