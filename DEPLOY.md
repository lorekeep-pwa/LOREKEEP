# Pubblicazione gratuita di LOREKEEP su GitHub + Cloudflare

LOREKEEP utilizza esclusivamente servizi del **piano gratuito** di Cloudflare:
- **Cloudflare Pages** per ospitare la PWA statica (`dist/`) con deploy automatico da GitHub.
- **Cloudflare Workers** (`worker/src/index.ts`) per il proxy API verso **IGDB** (fonte primaria) e **SteamGridDB** (fallback / artwork alternativi), custodendo tutte le chiavi nei **Secrets** del Worker.
- **Architettura Local-First invariata**: documenti, giochi, raccolte, tag e copertine scaricate continuano a risiedere localmente su **IndexedDB** e funzionano anche offline.

---

## 1. Collega il progetto a GitHub

Prima del primo commit, verifica che `.env.local` e `worker/.dev.vars` siano ignorati da `.gitignore` (non devono mai essere caricati su GitHub).

```bash
git init
git add .
git status   # verifica che NON compaiano .env.local o worker/.dev.vars
git commit -m "Initial LOREKEEP PWA + Cloudflare Worker setup"
git branch -M main
git remote add origin https://github.com/<tuo-utente>/<tuo-repo>.git
git push -u origin main
```

---

## 2. Pubblica il backend su Cloudflare Workers (piano Free)

Accedi a Cloudflare tramite Wrangler (non serve installarlo globalmente) e distribuisci il Worker:

```bash
npx wrangler login
npx wrangler deploy --config worker/wrangler.toml
```

Al termine, Cloudflare ti restituirà l'URL pubblico del Worker, ad esempio:
`https://lorekeep-covers-api.<tuo-subdomain>.workers.dev`

### Imposta i Secrets del Worker (mai esposti nel frontend)

```bash
npx wrangler secret put IGDB_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put IGDB_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put STEAMGRIDDB_API_KEY --config worker/wrangler.toml
```

*(Puoi impostare gli stessi Secrets anche da Cloudflare Dashboard → **Workers & Pages** → `lorekeep-covers-api` → **Settings** → **Variables and Secrets** → **Add** → tipo **Secret**.)*

---

## 3. Pubblica la PWA su Cloudflare Pages (piano Free)

1. Apri la **Cloudflare Dashboard** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Seleziona il repository GitHub di **LOREKEEP**.
3. Imposta la configurazione di build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. In **Environment variables (Production & Preview)** aggiungi una sola variabile pubblica (non è una chiave segreta):
   - **Nome**: `VITE_COVER_API_BASE`
   - **Valore**: `https://lorekeep-covers-api.<tuo-subdomain>.workers.dev` *(senza `/` finale)*
5. Avvia il deploy (**Save and Deploy**). Ogni futuro `git push` aggiornerà automaticamente la PWA.

---

## 4. Restringi CORS al tuo dominio Pages (consigliato)

Dopo il primo deploy su Cloudflare Pages (es. `https://lorekeep.pages.dev`), aggiorna `ALLOWED_ORIGIN` in `worker/wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGIN = "https://lorekeep.pages.dev"
```

Quindi ridistribuisci il Worker:

```bash
npm run deploy:worker
```

---

## Verifica rapida post-deploy

- Apri `https://lorekeep-covers-api.<tuo-subdomain>.workers.dev/api/covers/status`: deve rispondere JSON con lo stato delle fonti configurate senza esporre alcuna chiave.
- Apri la tua PWA su `https://<tuo-sito>.pages.dev`, crea un gioco con **Find cover**, salva una copertina e verifica in DevTools → Application → IndexedDB che la copertina sia salvata localmente e visibile anche attivando la modalità **Offline**.
