# 📱 GPSLogger integráció — zárolt képernyős GPS-küldés

Ez a doksi azt írja le, hogyan töltsd be a telefonon a GPSLoggert, hogy **zárolt képernyővel,**
**zsebben, 20 másodpercenként** küldjön GPS adatot a UB Tracker rendszerednek.

---

## Miért ez és nem a böngésző?

| | Böngésző (PWA) | GPSLogger |
|---|---|---|
| Zárolt képernyővel fut | ❌ Chrome ~1 perc után leöli | ✅ Android foreground service |
| Képernyő kikapcsolva | ❌ | ✅ |
| Akkumulátor fogyasztás | közepes (képernyő ég) | **kiváló** (csak GPS chip) |
| Telepítés | 0 perc | ~3 perc (egyszer) |

210 km-es versenyhez, ahol a futó zsebre teszi a telefont és csak fut — a GPSLogger az egyetlen értelmes megoldás.

---

## 🔧 Szervezői oldal: Edge Function deploy (egyszer)

A Supabase-ben telepítened kell egy **Edge Function**-t, ami fogadja a GPSLogger HTTP POST-jait.

### 1. Futtasd le a token migrációt

Supabase Dashboard → SQL Editor → New query → bemásolod a `supabase-schema-gps-token.sql` tartalmát → Run.

Ez hozzáad minden futóhoz egy egyedi `gps_token`-t (12 karakteres véletlen szöveg) amit a GPSLogger az URL-ben küld. Ez **futónként** egyedi — így nem kell jelszót beírni, csak egy URL-t.

### 2. Telepítsd a Supabase CLI-t

```bash
# macOS / Linux
brew install supabase/tap/supabase

# Windows (Scoop)
scoop install supabase

# vagy minden platformon npm-ből
npm install -g supabase
```

Ellenőrzés:
```bash
supabase --version
```

### 3. Linkeld a projektedet

```bash
cd ub-tracker-cloud

# Belépés (megnyit egy böngésző tab-ot, bejelentkezel)
supabase login

# Csatold a projekthez. A PROJECT_ID-t Dashboard → Settings → General → "Reference ID" adja
supabase link --project-ref <YOUR_PROJECT_ID>
```

### 4. Deploy-old az Edge Function-t

```bash
supabase functions deploy gps-ingest --no-verify-jwt
```

> 💡 A `--no-verify-jwt` **fontos** — azt jelzi, hogy az auth-ot mi magunk végezzük a token-alapján,
> nem kell a Supabase JWT-t a kérésben. Ezért a GPSLogger (aminek csak 1 Authorization header slotja
> van) tud fejtés nélkül küldeni.

### 5. Teszteld

```bash
# Kapsz egy response-t: {"status":"ok","service":"ub-tracker gps-ingest"}
curl https://<YOUR_PROJECT>.supabase.co/functions/v1/gps-ingest

# Teszt POST valódi token-nel (szerezd be az admin UI-ból)
curl -X POST "https://<YOUR_PROJECT>.supabase.co/functions/v1/gps-ingest?token=abc123" \
  -H "Content-Type: application/json" \
  -d '{"lat":46.9097,"lon":17.8895}'
```

Siker esetén: `{"ok":true,"runner_id":"...","delta_km":0,"received":{"lat":...,"lon":...}}`

---

## 📱 Futó oldala: GPSLogger beállítása

### 1. Telepítés

- **F-Droid** (ajánlott, nyílt forráskód): [https://f-droid.org/packages/com.mendhak.gpslogger/](https://f-droid.org/packages/com.mendhak.gpslogger/)
- **Play Store**: GPSLogger by mendhak

### 2. Engedélyek

Az első indításkor kérni fog:
- ✅ **Helyadatok engedélyezése** → **„Mindig engedélyezve"** (nem csak app használatakor!)
- ✅ „Ne optimalizáld az akkumulátort ennél az appnál" → engedélyezd

Ha ezeket nem adod meg, akkor zárolt képernyővel nem fog működni.

### 3. Alapbeállítások — `General options`

| Beállítás | Érték |
|---|---|
| Start on bootup | ✅ bekapcsolva |
| Start on app launch | ✅ bekapcsolva |

### 4. Teljesítmény — `Performance`

| Beállítás | Érték |
|---|---|
| Logging interval | **20 seconds** |
| Distance filter | 0 m (minden pontot küldjön) |
| Accuracy filter | 25 m (zárj ki rossz pontokat) |
| Keep GPS on between fixes | ❌ kikapcsolva (battery saver) |

### 5. Logging details

| Beállítás | Érték |
|---|---|
| Log to GPX | ❌ kikapcsolva |
| Log to KML | ❌ kikapcsolva |
| **Log to custom URL** | ✅ **bekapcsolva** |

Amint bekapcsolod a „Log to custom URL"-t, átvált a beállítási képernyőre:

### 6. `Log to custom URL` mezők

**→ Az admin oldalon kattints a futó melletti 📱 (Smartphone) ikonra — ott egyből megkapod
a QR-kódot és a kitöltendő értékeket. Vagy itt kézzel:**

| Mező | Érték |
|---|---|
| **URL** | `https://<YOUR_PROJECT>.supabase.co/functions/v1/gps-ingest?token=<GPS_TOKEN>` |
| **HTTP Body** | `{"lat":%LAT,"lon":%LON}` |
| **HTTP Headers** | `Content-Type: application/json` |
| **HTTP Method** | `POST` |
| **Allow auto sending** | ❌ kikapcsolva (küldi real-time-ban) |
| **Log to custom URL** | ✅ bekapcsolva |

> A `%LAT` és `%LON` változók — a GPSLogger helyettesíti őket mérés előtt.

### 7. SSL validálás

A mezők alatt megjelenik egy „Validate SSL Certificate" gomb. **Mindenképp nyomd meg!**
Egy dialóg feljön, erősítsd meg, és onnantól bízik a Supabase certificate-ben.

### 8. Start!

Menj vissza a főképernyőre → **nagy zöld Start gomb**.
Az értesítés-sávban megjelenik egy tartós ikon ami jelzi hogy fut.
Most zárolhatod a képernyőt, zsebre vágthatod — **megy tovább.**

### 9. Ellenőrzés

Menj vissza az admin UI-ra a számítógépen → a futó után pár másodperccel látnod kell hogy
mozog a térképen és nő a `logged_dist`.

---

## 🆘 Hibakeresés

### A GPSLogger „Connection failed"-et mutat

1. Tapintsd meg a GPSLogger fő képernyőt → „Status" → látod mi a baj
2. Leggyakoribb: rossz token az URL-ben. Ellenőrizd az admin oldalon az URL-t és a futó tokent
3. Nyomd meg a „Validate SSL Certificate"-et újra

### „401 invalid_token"

A `gps_token` érvénytelen vagy nem ehhez a futóhoz tartozik. Az admin UI-ban (📱 ikon)
megmutatja az aktuális tokent — másold le pontosan.

### Nem jön pont zárolt képernyővel

- Ellenőrizd a **„Mindig engedélyezve" helyadat engedélyt** (nem elég a „csak használatkor")
- Android beállítások → Akkumulátor → Akkumulátor optimalizálás → GPSLogger → **„Ne optimalizáld"**
- Egyes gyártók (Xiaomi, Huawei, OnePlus) külön „auto-start" engedélyt kérnek — keresd meg az app beállításaiban

### Sokszor ugyanaz a pont jön

Ez normális ha a futó áll (pl. váltózóban vár). A szerver **20 m-en belüli mozgásokat
automatikusan kiszűr** (nem növeli a `logged_dist`-et). Ha zavar, a `Performance`-ban állítsd
magasabbra a **Distance filter**-t (pl. 10 m).

### Akku gyorsan fogy

- `Performance` → `Keep GPS on between fixes` → **kikapcsolva**
- `Logging interval` → 20s vagy több
- Telepítsd a legújabb GPSLogger verziót (az energia-kezelés folyamatosan javul)

---

## 🎯 Mikor melyik megoldás?

- **Csak böngészős trackelés** (képernyő bekapcsolva, futó kezében): a `/race/CODE/run` oldal jó
- **Komoly zárolt képernyős trackelés**: **GPSLogger**, ez a doksi
- **Az aktív futó átvált egy másikra a stafétán**: az admin beállítja őt aktívnak,
  **a GPSLogger token NEM változik** — a token futóhoz tartozik nem pedig állapothoz.
  Tehát a stafétánál egyszerűen leállítják az egyik GPSLoggert, megnyitja a következő futó az övét.

---

## 🔒 Biztonság

- Mindegyik futónak **saját** `gps_token`-je van. Ha valaki ellopja az egyiket, csak azt az egy
  futót tudja hamisítani — a többit nem
- A token nem látható a race code-dal — csak az **admin** oldalon (ami PIN mögött van)
- Ha gyanítod hogy a token kiszivárgott, az admin oldalon szerkeszted a futót,
  és a DB-ben újra generálod neki: `UPDATE runners SET gps_token = generate_gps_token() WHERE id = '...';`
