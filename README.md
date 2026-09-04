# StudFlow

Eine All-in-one Uni-App: zentrales Dashboard, Buddy-Matching & SkillSwap, Jobs & Praktika, Community.

Eigenständiges Konzept und eigenes Design (dunkles Indigo + Koralle als Markenfarben) — keine Kopie eines bestehenden Produkts.

## Features

- **Dashboard** – Schnellzugriff auf Moodle, Campus-Portal, Mail, Bibliothek, Mensaplan, Noten + heutiger Stundenplan
- **Buddys & SkillSwap** – Matching-Profile mit Skill-Angebot/-Gesuch, Suche/Filter, Match-Score
- **Jobs & Praktika** – Gefilterte Stellenanzeigen (Werkstudent, Praktikum, Minijob)
- **Community** – Feed für Lerngruppen, Fragen, Ankündigungen

Das Backend speichert den gemeinsamen Datenstand standardmäßig lokal in `data/db.json`. Mit Supabase kann derselbe Datenstand dauerhaft in der Cloud gespeichert werden.

## Tech-Stack

- **Expo (React Native) + TypeScript** — funktioniert nativ auf iOS und Android aus einer Codebasis
- React Navigation (Bottom Tabs)
- Express + Socket.IO Backend für gemeinsame Live-Daten
- Supabase-Cloudspeicher optional, lokales JSON als Fallback

## Lokal starten

```bash
npm install
npx expo start
```

### Supabase-Cloudspeicher aktivieren

1. Erstelle ein Supabase-Projekt.
2. Öffne den SQL Editor und führe [`supabase.sql`](supabase.sql) aus.
3. Kopiere [`.env.example`](.env.example) nach `.env` und trage `SUPABASE_URL` sowie den serverseitigen `SUPABASE_SERVICE_ROLE_KEY` ein. Der Service-Key darf niemals in die App oder ins Frontend gelangen.
4. Starte das Backend neu:

   ```bash
   npm run server
   ```

Der Backend-Health-Endpunkt zeigt dann `storage: "supabase"`. Ohne diese Variablen bleibt `data/db.json` als lokaler Fallback aktiv.

Dann `i` drücken für den iOS-Simulator (braucht Xcode, nur auf macOS) oder den QR-Code mit der **Expo Go**-App auf deinem iPhone scannen.

## Als echte App für den App Store bauen

Du brauchst dafür einen Mac mit Xcode und ein **Apple Developer Account** (99 $/Jahr).

1. **EAS CLI installieren**
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. **Build-Konfiguration erzeugen**
   ```bash
   eas build:configure
   ```
3. **iOS-Build erstellen** (baut in der Cloud, kein lokales Xcode nötig)
   ```bash
   eas build --platform ios
   ```
4. **An App Store Connect senden**
   ```bash
   eas submit --platform ios
   ```
5. In **App Store Connect** (appstoreconnect.apple.com) Metadaten, Screenshots, Datenschutzangaben und Preis festlegen, dann zur Review einreichen.

Alternativ: `App.tsx` lokal in Xcode öffnen (`npx expo prebuild` erzeugt den nativen `ios/`-Ordner) und klassisch über Xcode archivieren/hochladen.

## Nächste Schritte, die noch fehlen für einen echten Launch

- **Supabase-Deployment** und produktive Umgebungsvariablen für echte Cloud-Nutzung
- **Authentifizierung** (z. B. Uni-E-Mail-Verifizierung)
- **Push-Benachrichtigungen** (Expo Notifications) für neue Jobs/Matches
- **Datenschutzerklärung, Impressum, AGB** — Pflicht für den App-Store-Eintrag
- Eigenes App-Icon & Splash-Screen (aktuell Platzhalter in `app.json`)
- Bundle-Identifier in `app.json` auf deine eigene Domain anpassen (`com.deinefirma.studflow`)

## Projektstruktur

```
StudFlow/
├── App.tsx
├── app.json
├── src/
│   ├── components/     # Card, BuddyCard, JobCard, QuickLinkTile, SectionHeader
│   ├── data/           # Mock-Daten
│   ├── navigation/     # Bottom-Tab-Navigator
│   ├── screens/        # Dashboard, Buddy, Jobs, Community
│   ├── theme/          # Farben, Typografie, Spacing
│   └── types/          # TypeScript-Typen
```
