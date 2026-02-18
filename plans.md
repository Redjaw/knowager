# Knowager – Plans

## 1. Obiettivo

Realizzare una web application privata chiamata **Knowager**, accessibile solo a una whitelist di utenti, con:

- Autenticazione tramite Supabase (magic link / OTP)
- Homepage con vista settimanale selezionabile
- Pagina profilo utente
- Pagina amministratore per gestione giorni non selezionabili e warning
- Deploy statico su GitHub Pages
- Sicurezza garantita tramite RLS (Row Level Security)

Nessun backend custom.

---

## 2. Stack Tecnologico

- SvelteKit (TypeScript)
- @sveltejs/adapter-static
- @supabase/supabase-js
- Supabase (Auth + Postgres)
- GitHub Actions (deploy su GitHub Pages)
- CSS minimale (no framework CSS)

---

## 3. Vincoli Architetturali

- Applicazione completamente statica (compatibile GitHub Pages)
- Tutta la sicurezza deve essere implementata tramite RLS nel database
- Vietato usare service_role nel frontend
- Usare solo VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
- Supportare BASE_PATH per GitHub repo pages
- Gestire refresh su rotte interne tramite fallback 404.html
- UI responsive (mobile-first)

---

## 4. Architettura Logica

Frontend statico (SvelteKit)  
↓  
Supabase Auth  
↓  
Supabase Postgres con RLS  

Il frontend non contiene segreti.  
Le policy di sicurezza vivono nel database.

---

## 5. Pagine e UX

### 5.1 /login (pubblica)

- Logo/titolo in alto: Knowager
- Form email per magic link
- Messaggi di stato/errore
- Se autenticato → redirect /app

---

### 5.2 /app (protetta) – Homepage

Vista settimanale composta da 7 blocchi (giorni della settimana corrente).

Ogni blocco mostra:

- Numero e nome del giorno (es: 18 — Martedì)
- Avatar circolari degli utenti che hanno selezionato quel giorno
- Sfondo diverso se:
  - Giorno selezionato dall’utente corrente
  - Giorno non selezionabile (chiusura)

Comportamento:

- Click su giorno selezionabile → toggle selezione
- Se selezionato → inserisce riga in day_selections
- Se deselezionato → rimuove riga
- Giorni presenti in closures → non cliccabili
- Banner warning in alto se presente (da app_config)

Responsive:
- Mobile: layout verticale o griglia compatta
- Desktop: griglia leggibile su 7 colonne o equivalente

---

### 5.3 /app/profile (protetta)

Permette di modificare:

- avatar_id (scelta da set predefinito)
- first_name
- last_name
- birth_date (facoltativa)

Se il profilo non esiste → crearlo automaticamente (upsert).

---

### 5.4 /app/admin (solo admin)

Accessibile solo se is_admin = true.

Funzionalità:

- CRUD giorni non selezionabili (closures)
- Gestione warning homepage (app_config con key homepage_warning)

Utenti non admin:
- Non possono accedere (redirect /app o 403)

---

## 6. Modello Dati

### 6.1 Whitelist

```sql
create table allowed_emails (
  email text primary key,
  is_admin boolean not null default false
);
```

### 6.2 Profili

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  email text,
  first_name text,
  last_name text,
  birth_date date,
  avatar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.3 Chiusure (giorni non selezionabili)

```sql
create table closures (
  day date primary key,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
```

### 6.4 Configurazione applicazione

```sql
create table app_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
```

Chiave utilizzata:
- homepage_warning

### 6.5 Selezioni Giorni

```sql
create table day_selections (
  day date not null,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (day, user_id)
);
```

---

## 7. Sicurezza (RLS)

Abilitare RLS su tutte le tabelle dati.

Principi:

- Solo utenti presenti in allowed_emails possono usare l'app
- Solo admin possono modificare closures e app_config
- Ogni utente può modificare solo il proprio profilo
- Ogni utente può inserire/eliminare solo le proprie selezioni
- Tutti gli utenti autorizzati possono leggere:
  - closures
  - day_selections
  - dati minimi di profiles (necessari per mostrare avatar/nome)

---

## 8. Routing e Protezione

Rotte pubbliche:
- /login

Rotte protette:
- /app
- /app/profile
- /app/admin

Regole:

- Non autenticato → redirect /login
- Autenticato su /login → redirect /app
- Non admin su /app/admin → redirect /app

---

## 9. Configurazione SvelteKit

- @sveltejs/adapter-static
- fallback: "404.html"
- kit.paths.base = process.env.BASE_PATH || ''
- Usare $app/paths per costruire link interni

---

## 10. Variabili Ambiente

Richieste:

VITE_SUPABASE_URL  
VITE_SUPABASE_ANON_KEY  
BASE_PATH  

---

## 11. Deploy

- GitHub Actions
- Build statico
- Upload artifact
- Deploy su GitHub Pages
- Secrets configurati in GitHub

---

## 12. Fasi di Implementazione

1. Setup progetto + deploy funzionante
2. Auth + whitelist
3. Profile + RLS
4. Homepage settimanale + selezioni
5. Admin (closures + warning)
6. Hardening UX

---

## 13. Criteri di Accettazione

- Login via magic link funzionante
- Whitelist enforced
- Admin enforcement corretto
- Toggle selezione giorni funzionante
- Giorni non selezionabili disabilitati
- Warning homepage visibile
- Responsive su mobile
- Refresh su rotte interne non produce 404
- Nessuna violazione di RLS possibile
