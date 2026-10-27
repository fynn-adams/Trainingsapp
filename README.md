# Halbmarathon Köln 2027 – Fynn & Louisa

Private Trainings-Web-App für den Generali Köln Halbmarathon am **3. Oktober 2027**. Die App bietet:

- **Zwei adaptive Trainingspläne** (49 Wochen ab 26.10.2026), jeweils als flexibler **Wochenkorb**: Die Einheiten lassen sich an beliebigen Tagen erledigen.
- **Garmin-Upload** von `.fit`, `.zip` (Garmin „Original exportieren“), `.tcx` und `.gpx`. Läufe und Ergometer werden automatisch erkannt und der passenden Planeinheit zugeordnet.
- **Wochen-Duell**: Wer hat mehr Prozent des *eigenen* Wochenplans geschafft? Dazu kommen der Saisonverlauf, die gewonnenen Wochen und die gesamte Trainingszeit.
- Installierbar auf dem Homescreen: im Browser „Zum Home-Bildschirm hinzufügen“.

## Ziele & Trainingslogik

| | Fynn | Louisa |
|---|---|---|
| Ausgangslage | 5 km in 22:09 (4:25 /km), 12 km in 4:55 /km, VO₂max 53, Marathon 3:59 h | 10 km locker in 7:53–8:18 /km, längster Lauf 10 km, VO₂max 43 |
| HM-Form heute (geschätzt) | ≈ 4:52 /km → 1:42 h | ≈ 7:15 /km → 2:33 h |
| **Ziel** | **4:40 /km → 1:38:27 h** | **6:30 /km → 2:17:08 h** |
| Pflicht pro Woche | Qualitätslauf, langer Lauf, Rad Zone 2 | Lauf, langer Lauf, ab März zusätzlich Lauf oder Rad Z2 |
| Bonus | Rad Z2 oder lockerer Lauf | – |
| Längster langer Lauf | 115 min (≈ 20 km) | 145 min (≈ 18 km) |

- **Phasen:** Grundlage (bis Mitte März), Aufbau mit Intervallen und Schwelle (bis Anfang Juli), wettkampfspezifisch mit HM-Tempo und schnellem Finish (bis Mitte September), danach 2 Wochen Tapering und die Rennwoche.
- **Erholungswoche:** jede 4. Woche, mit etwa 25 % weniger Umfang.
- **Anpassung:** Eine vergangene Woche unter 34 % Planerfüllung, oder eine pausierte Woche, senkt das Trainingsniveau. Es folgt eine Wiedereinstiegswoche, und die restlichen Wochen werden neu verteilt. Die Steigerung ist dabei auf höchstens das 1,5-Fache des normalen Plans begrenzt.
- **Tempobereiche** werden aus der aktuellen HM-Form abgeleitet und mit dem Trainingsfortschritt jede Woche schneller. Unter *Profil* lassen sich die aktuelle Form, die Ziel-Pace und der Maximalpuls anpassen. Mit Maximalpuls zeigt die App Pulsbereiche in bpm an.
- **Planerfüllung:** geschaffte Zeit der Pflicht-Einheiten geteilt durch die geplante Zeit, höchstens 100 %. Eine Einheit zählt ab 85 % der geplanten Dauer als erledigt.

Die Logik steckt in `src/lib/plan.ts`. Die Zielzeiten und die Startform stehen in `src/config.ts`.

## Einrichtung

### 1. Supabase (gemeinsame Datenbank)

1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen (Region z. B. Frankfurt).
2. **SQL Editor** öffnen, den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen.
3. **Authentication → Users → Add user**: zwei Nutzer anlegen (Fynn und Louisa, jeweils mit E-Mail und Passwort, „Auto Confirm“ an).
4. **Authentication → Sign In / Providers**: „Allow new users to sign up“ **ausschalten**. So kommen nur eure beiden Accounts an die Daten.
5. Unter **Project Settings → API** die *Project URL* und den *anon public key* kopieren.

Ohne Supabase läuft die App im **lokalen Modus**. Die Daten liegen dann nur im jeweiligen Browser, gut zum Ausprobieren.

### 2. Hosting auf Vercel

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden → *Add New Project* → dieses Repository wählen. Vercel erkennt Vite automatisch.
2. Unter *Environment Variables* eintragen:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
3. *Deploy*. Die URL dann auf beiden Handys öffnen und zum Home-Bildschirm hinzufügen.

### Lokal entwickeln

```bash
npm install
cp .env.example .env.local   # optional, sonst lokaler Modus
npm run dev
npm test                     # Plan-, Zuordnungs- und Parser-Tests
npm run build
```

## Garmin-Export

In Garmin Connect im Browser (connect.garmin.com, geht auch am Handy) die Aktivität öffnen. Dann oben rechts das Zahnrad → **„Original exportieren“** wählen und die ZIP direkt in der App hochladen. Mehrere Dateien auf einmal sind möglich. Doppelte Uploads werden erkannt. Wenn die Uhr mal leer war, lässt sich eine Einheit auch manuell eintragen.
