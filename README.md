# 🏃 UltraBalaton Tracker (Cloud)

**Valós idejű váltófutás-követő.** Nincs saját backend szerver, nincs proxy, nincs natív app (egyelőre).
Frontend a böngészőben fut, az adatok közvetlenül egy **Supabase** Postgres DB-be mennek.

- **Admin** létrehoz egy versenyt, kap egy 6-jegyű **race code**-ot (pl. `UB2HX9`) és egy **admin PIN**-t
- **Futók** megnyitják a linket telefonon, választanak nevet, tap START → GPS küldés
- **TV / Dashboard**: a kód bárkinek megmutatható, csak olvas
- **Admin oldal**: PIN-es védelem, onnan kezeled a futókat és a versenyt

---

## 🚀 Teljes beállítás 0-ról

### 1. lépés — Supabase projekt létrehozása (5 perc, ingyenes)

1. Menj a [supabase.com](https://supabase.com)-ra, regisztrálj egy ingyenes fiókot
2. **New project** → adj neki nevet (pl. `ub-tracker`), régió: `Central EU (Frankfurt)`, erős DB jelszó
3. Várd meg ~2 percet amíg a projekt provisioning-el
4. Menj a **SQL Editor**-ba (bal oldali menü) → **New query**
5. **3 SQL script-et futtass le sorban** (mindegyiknél külön Run gomb):
   - `supabase-schema.sql` — fő séma (races, runners, position_history, RPC-k)
   - `supabase-schema-gps-token.sql` — GPSLogger token támogatás
   - `supabase-schema-storage.sql` — profilkép upload bucket
6. Menj a **Settings → API**-ba → jegyezd fel:
   - `Project URL`         (pl. `https://xxxxx.supabase.co`)
   - `anon public` API key  (egy hosszú `eyJ…` szöveg)

> 💡 Az `anon` kulcs **publikus** — bele kerül a frontend build-be, ez rendben van.
> A sor-szintű biztonságot (RLS) a séma már beállította: a race code a „jelszó".

### 2. lépés — Frontend lokálisan

```bash
# Frontend könyvtárba
cd ub-tracker-cloud

# Másold le a .env sablont
cp .env.example .env

# Nyisd meg és töltsd ki:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGc...

npm install
npm run dev     # → http://localhost:5173
```

### 3. lépés — Teszt lokálban

1. Menj a `http://localhost:5173`-ra
2. **Új verseny létrehozása** → adj meg egy nevet, mentsd el a **race code**-ot + **admin PIN**-t
3. A success képernyőn kattints **Admin oldal** → PIN bevitel → adj hozzá 2-3 futót
4. Nyiss egy új tab-ot, ugyanazon a gépen: `http://localhost:5173/race/KÓDOD/run` → válassz futót → START
5. Menj vissza a race oldalra → látnod kell a GPS-t élőben mozogni 🎉

### 4. lépés — Publikus deploy (Vercel, ingyen, 3 perc)

Hogy a futók is elérjék telefonról:

1. Push-old a repo-t GitHub-ra (ha még nincs)
2. [vercel.com](https://vercel.com) → regisztrálj (GitHub-bal), **Add New Project**
3. Válaszd ki a repo-t, **Root Directory**: a frontend mappa (ha nem root)
4. **Environment Variables**:
   - `VITE_SUPABASE_URL` = a Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = az anon key
5. **Deploy** → ~1 perc múlva kapsz egy URL-t, pl. `https://ub-tracker-xxx.vercel.app`

Ezt az URL-t + a race code-ot osztod meg a csapattal.

**Alternatíva:** Netlify, Cloudflare Pages, GitHub Pages — mind működnek.

---

## 🗺️ URL struktúra

| URL | Ki látja | Mire való |
|-----|----------|-----------|
| `/` | Bárki | Landing — kód beírása, új verseny |
| `/new` | Bárki | Új verseny létrehozása |
| `/race/UB2HX9` | Akinek van kód | Dashboard: térkép, aktív futó, team progress |
| `/race/UB2HX9/tv` | Akinek van kód | TV nézet nagy kijelzőre |
| `/race/UB2HX9/run` | Futók | GPS küldő oldal (iOS + Android böngésző) |
| `/race/UB2HX9/admin` | Csak PIN-nel | Futók CRUD + verseny start/stop |

---

## 📱 Mit csinálnak a futók

1. **Az admin** küldi nekik a linket: `https://your-app.vercel.app/race/UB2HX9/run`
2. Chrome megnyitja, **engedélyezik a GPS-t** amikor kéri
3. Választják magukat a listából (ha még nincsenek hozzáadva, az admin elvégzi)
4. **Hozzáadás a kezdőképernyőhöz** (opcionális, de ajánlott — úgy viselkedik mint egy app)
5. Tap **START GPS** → a képernyő ébren marad (Wake Lock), 15 mp-enként küld adatot

### ⚠️ Zárolt képernyő probléma

A böngésző GPS-t **NEM** küld zárolt képernyővel. Ez a webes technológia korlátja.
Megoldások (válaszd majd, ezután beépítjük):
- Képernyő ébren tartása (Wake Lock, már be van építve — de akkor is látnod kell a képernyőt)
- **Capacitor natív Android wrapper** (ajánlott 210 km-es versenyre)
- **GPSLogger** nevű külső app + Supabase Edge Function

Ezeknek külön dokumentáció jön.

---

## 🔐 Mi véd a kódod?

- A **race code** 6 karakter, `A-Z2-9` = 32⁶ = ~1 milliárd kombináció → gyakorlatilag kitalálhatatlan
- Az **admin PIN** 4-10 karakter, a Supabase DB-ben tárolva, csak hash-elve lekérdezhető RPC-n át
- Az `anon` Supabase kulcs publikus, de az **RLS policy** szabályozza mit lát
- **Fontos limitáció** az aktuális sémában: aki tudja a kódot, a DB adatait módosíthatja is (pl. futó törlése, GPS küldés). Ha szeretnél erősebb auth-ot (Supabase Auth user fiókokkal), az másik beállítás

---

## 📂 Projekt struktúra

```
ub-tracker-cloud/
├── supabase-schema.sql    ← Futtasd Supabase SQL Editor-ben
├── .env.example
└── src/
    ├── main.tsx            Router
    ├── lib/
    │   ├── supabase.ts     Supabase kliens
    │   ├── api.ts          DB műveletek (CRUD, verify PIN)
    │   ├── hooks.ts        useRace (realtime subscription)
    │   ├── useGeolocation.ts  Browser GPS + Wake Lock
    │   └── types.ts
    ├── pages/
    │   ├── Landing.tsx       /
    │   ├── NewRace.tsx       /new
    │   ├── RaceView.tsx      /race/:code
    │   ├── TvView.tsx        /race/:code/tv
    │   ├── RunnerView.tsx    /race/:code/run
    │   └── AdminView.tsx     /race/:code/admin (PinGate-tel védve)
    └── components/
        ├── RaceMap.tsx       Leaflet térkép, polyline, marker
        ├── ActiveRunnerCard.tsx
        ├── TeamProgress.tsx
        ├── EventTimer.tsx    T- / T+ időzítő
        ├── RunnerTray.tsx
        └── PinGate.tsx       Admin PIN form
```

---

## ⚙️ Tech stack

- **React 18** + TypeScript + Vite
- **react-leaflet** — OpenStreetMap megjelenítés
- **@supabase/supabase-js** — DB + Realtime (postgres_changes)
- **lucide-react** — ikonok
- **react-router-dom** — útvonalkezelés
- Semmi más backend. Minden a böngészőben fut + Supabase Postgres.

---

## 🐛 Hibakeresés

**„Nincs ilyen kódú verseny"** — ellenőrizd hogy a `.env` fájlban a Supabase URL és key helyes, + a séma le van futtatva

**GPS nem megy** — a böngésző blokkolja? Chrome: `chrome://settings/content/location` → engedélyezd az oldalt

**„Failed to subscribe" realtime hibák** — Supabase Dashboard → Database → Replication → ellenőrizd hogy a `races` és `runners` táblák be vannak kapcsolva a `supabase_realtime` publikációhoz (a séma SQL ezt megtette, de ha nem működik, kézzel: `ALTER PUBLICATION supabase_realtime ADD TABLE runners;`)

**Supabase ingyen limit** — 500 MB DB, 2 GB bandwidth / hó, 200 egyidejű realtime kliens. Egy versenyre bőven elég.

---

## Mi jön még

Ez a webes alap működik. A **GPSLogger integráció** külön doksiban: [`GPSLOGGER-SETUP.md`](./GPSLOGGER-SETUP.md).
Azzal tudsz zárolt képernyővel, zsebben GPS-t küldeni.
