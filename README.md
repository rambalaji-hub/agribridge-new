<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/51c88423-5056-4209-880a-45555438a12c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Voice input

Voice input uses the browser's `SpeechRecognition` service first. Speech recognition requires a supported browser (such as Chrome), microphone permission, and access to the browser's external speech service. If that service is unavailable or does not support the selected language, the assistant records a short utterance and sends it to the existing server-side Gemini integration for transcription. Audio is sent only for this fallback and is not stored by the application.

The fallback uses the existing `GEMINI_API_KEY` configured in `.env.local` (or `.env`) on the server; no key is exposed to the browser and no additional dependency is needed. Gemini transcription uses the same API account and may incur additional usage charges. Voice fallback recordings are limited to 45 seconds.

## MySQL-backed procurement API

The existing React/Vite frontend and Express server are retained. The Express process serves the frontend and `/api` routes; database credentials and the JWT signing key are server-only. Backed procurement data for live API accounts is loaded from MySQL, not browser storage. The one-click persona selector remains a demo-only UI mode and does not authenticate to the API.

The real MySQL-backed scope in this integration is farmer authentication, centre/crop/booking data, queue operations, quality/weigh-slip records, and procurement payments. Buyer marketplace orders, grievance tickets, assisted e-KYC, simulated notifications, and offline-sync demonstrations remain demo UI features and are not represented as persisted MySQL records. Assisted farmer lookup and token issuance do use the API for previously registered farmers.

### Prerequisites and setup

- Node.js 20 or newer
- MySQL 8.0 or newer

1. Install dependencies with `npm install`.
2. Inspect the target MySQL instance first. Back up any existing database before setup. The initialization script is additive and contains only `CREATE DATABASE/TABLE IF NOT EXISTS` and `INSERT IGNORE`; it does not drop tables or delete rows. It does not automatically alter an existing table. Review and reconcile any pre-existing schema differences before running it.
3. The `agribridge` database and tables are already present in this local setup. Do not rerun the initialization script when preserving existing data. Only initialize a separately verified empty database after review:

   ```sh
   mysql -u root -p < database/init.sql
   ```

   `agribridge_db` is a separate schema with a different layout and is not the database selected by this backend.
4. Copy `.env.example` to `.env.local` only if you do not already have a local env file. Keep the file out of source control. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `HOST`, and a unique random `JWT_SECRET` of at least 32 characters. Set `CORS_ORIGIN` to the exact browser origins. `GEMINI_API_KEY` remains server-side.

   MySQL currently has no `agribridge_app` account; the configured app account therefore fails authentication. For local-only development without account/grant changes, you may use the already-authorized `root@localhost` account: privately set `DB_USER=root` and `DB_PASSWORD` to the root password in `.env.local`, leave `DB_NAME=agribridge`, and keep `HOST=127.0.0.1`. The server binds to loopback by default in development so the root-backed API is not exposed to other machines. Root has broad administrative privileges: this is only a trusted-machine development workaround, not a production configuration. Do not put the password in source, frontend variables, terminal commands, or chat.

   If you do not want the application to use root, stop here and ask your MySQL administrator to provide an already-authorized application account with `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `agribridge.*`. If none exists, administrator approval is required to create a dedicated account and grant those database-scoped privileges. Do not try to use `GRANT` as a substitute for creating a MySQL 8 account; your administrator must approve/provision it through the standard process.

### Google Maps for Farmer Procurement Centres

The existing Farmer Dashboard → Procurement Centre view reads centre records from `GET /api/centres`. The map deliberately plots only records with non-null latitude and longitude; the initialization script's sample centre records have no coordinates and are not assigned guessed locations. Populate `procurement_centres.latitude` and `procurement_centres.longitude` only with coordinates verified by your procurement-centre administrator. No database migration is required because those columns already exist.

1. In Google Cloud, enable billing and enable **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, and **Routes API**.
2. Create two API keys:
   - Browser key: restrict by HTTP referrer for the development origins you use (for example `http://localhost:3000/*` and `http://localhost:5173/*`) and restrict APIs to Maps JavaScript API and Places API (New). This key is necessarily visible in the web page; referrer/API restrictions are required.
   - Server key: restrict to the server's outbound IP address and Geocoding API and Routes API. Keep it server-side; never prefix it with `VITE_`.
3. Add both keys to the existing `.env.local` without replacing your database or authentication variables:

   ```dotenv
   VITE_GOOGLE_MAPS_API_KEY=your-referrer-restricted-browser-key
   GOOGLE_MAPS_SERVER_API_KEY=your-server-restricted-key
   ```

4. Restart the development server so Vite and Express reload their environment.
5. Run `npm run db:check` before testing the dashboard. Then run `npm run dev` and open `http://localhost:3000`.
6. Sign in to a Farmer account, open **Procurement Centre**, search for a place or allow current-location access, and select a 5/10/25/50 km radius. Road distance and travel time require the Routes API and a configured server key. Without that service the screen explicitly reports route data unavailable and distinguishes its straight-line fallback.

The map's location and availability data come from the MySQL-backed centre API; last-updated time is shown after a successful API read. Slot availability reflects the backend's remaining slots for today. Map/API data and live routing have not been verified until Google Cloud keys are configured and these calls succeed.

5. Test actual database connectivity (this runs `SELECT 1`; it does not modify the database):

   ```sh
   npm run db:check
   ```

   For existing databases, apply the additive profile editor schema update before using profile edits:

   ```sh
   npm run db:migrate:profile
   ```

   It only adds missing nullable profile columns (`avatar_data`, `gstin`, `trade_category`, `csc_kiosk_id`, `gov_cadre`) and preserves existing rows.

6. After the health check passes, create an initial application administrator only if needed with `npm run admin:create`; it inserts a user record. The password input is hidden.
7. Start the combined backend/frontend development server with `npm run dev` (default `http://localhost:3000`). For a separate Vite frontend, run the API server on port 3000 and configure `CORS_ORIGIN` to the Vite origin.
8. For production, use a dedicated least-privilege MySQL account provisioned by an administrator—not root—set `NODE_ENV=production`, build with `npm run build`, then run `npm start`. Production defaults to binding `0.0.0.0`; terminate TLS at a trusted reverse proxy and restrict MySQL network access to the application server.

### API coverage

- `POST /api/auth/register` (farmer only) and `POST /api/auth/login`
- `GET /api/centres`
- Farmer-authenticated `POST /api/maps/geocode` (server-side Google Geocoding API)
- Farmer-authenticated `POST /api/maps/routes` (server-side Google Routes API)
- Authenticated `GET/POST /api/crops`
- Authenticated `GET/POST /api/bookings`, plus booking status lookup and authorized status updates
- Officer/admin/assisted operations to record quality assessments and weigh slips; officer/admin payment processing
- Authenticated `GET /api/transactions`
- Admin-only user provisioning and procurement-centre creation
- `GET /api/health` checks the live MySQL connection and returns HTTP 503 if MySQL is unavailable

Protected endpoints require an `Authorization: Bearer <token>` header. Farmer accounts can only access their own bookings/crops/transactions. Passwords are stored as bcrypt hashes, request payloads are validated, and SQL statements use placeholders. The UI login stores its short-lived token in memory (not `localStorage`); reload requires sign-in again.

### Smoke testing

After MySQL setup and a successful `npm run db:check`, run `npm run dev` and verify:

1. `curl -i http://localhost:3000/api/health` returns HTTP 200 and `"database":"connected"`.
2. Register a farmer in the Farmer Portal, then sign out and sign back in with that mobile/ID and password.
3. From the farmer dashboard, load procurement centres and submit a slot booking; verify its token and queue position appear in the UI.
4. Sign in with an officer account created by an admin and assign the officer to the selected centre (`assignedCentreId`, e.g. the seeded Taraori centre ID `11111111-1111-4111-8111-111111111111`). Record a weigh slip and quality assessment for that booking; verify the farmer booking status reflects persisted API state.
5. Test invalid registration/booking data and a request without a bearer token; the API should return explicit 4xx errors without writing records.

Payment processing currently creates a `Processing` transaction record; actual bank/DBT settlement requires a separately integrated payment provider and must not be represented as a completed transfer.

### Crop photo credits

Groundnut, mustard, and sugarcane crop cards use optimized local photos. The files are resized web copies of these Wikimedia Commons photographs:

- Groundnut: [Arachis hypogaea 006.JPG](https://commons.wikimedia.org/wiki/File:Arachis_hypogaea_006.JPG), H. Zell, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0).
- Indian mustard: [Mustard Flower-1.jpg](https://commons.wikimedia.org/wiki/File:Mustard_Flower-1.jpg), Trikutdas, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0).
- Sugarcane: [Sugarcane field in Salem.jpg](https://commons.wikimedia.org/wiki/File:Sugarcane_field_in_Salem.jpg), Thamizhpparithi Maari, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0).

The resized photo assets retain the source files' respective licenses. These are sourced photographs, not AI-generated images.
