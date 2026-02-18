# Knowager

App SvelteKit privata (static deploy) con Supabase Auth + Postgres RLS.

## Stack

- SvelteKit + TypeScript
- `@sveltejs/adapter-static` con fallback `404.html`
- Supabase (`@supabase/supabase-js`)
- Deploy su GitHub Pages via GitHub Actions

## Configurazione locale

1. Installa dipendenze:

```bash
npm install
```

2. Crea `.env`:

```bash
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
BASE_PATH=
```

3. Avvia:

```bash
npm run dev
```

## Setup Supabase

1. Crea un progetto Supabase.
2. In **Authentication > URL Configuration** imposta:
   - Site URL: URL GitHub Pages (es. `https://<user>.github.io/<repo>`)
   - Redirect URLs:
     - `http://localhost:5173/app`
     - `https://<user>.github.io/<repo>/app`
3. Esegui SQL nell'ordine:
   - `supabase/sql/01_schema.sql`
   - `supabase/sql/02_rls.sql`
4. Inserisci whitelist iniziale (SQL editor):

```sql
insert into public.allowed_emails (email, is_admin)
values
  ('admin@example.com', true),
  ('friend@example.com', false)
on conflict (email) do update
set is_admin = excluded.is_admin;
```

## Note RLS

- L'app usa solo `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY` lato client.
- Le policy si basano su `auth.jwt()->>'email'` per whitelist/admin (`is_allowed_user`, `is_admin_user`).
- `profiles_public` è una vista con campi minimi (`id`, `first_name`, `last_name`, `avatar_id`) per homepage, evitando esposizione di `birth_date` ad altri utenti.

## Deploy GitHub Pages

Workflow: `.github/workflows/deploy.yml`

- Trigger su push in `main`
- Node 20
- `npm install` + `npm run build`
- `upload-pages-artifact` + `deploy-pages`

### Secrets richiesti

Nel repository GitHub, **Settings > Secrets and variables > Actions**:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

### BASE_PATH

Nel workflow è impostato automaticamente a `/${{ github.event.repository.name }}`.

Se devi pubblicare su dominio custom/root path, cambia `BASE_PATH` nel workflow (ad esempio stringa vuota).

## Struttura principale

- `src/routes/login`: login magic link
- `src/routes/app`: area protetta
- `src/routes/app/profile`: profilo utente
- `src/routes/app/admin`: gestione closures + warning homepage
- `supabase/sql`: schema e RLS
