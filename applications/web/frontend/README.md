# CityPulse Web Frontend

Responsive Next.js application for the CityPulse intelligent parking and traffic-control platform. It includes the public landing and authentication flows, a parking-owner portal, and a traffic-authority command center.

Live Link : https://499-ab-frontend.vercel.app/

## Features

- Public CityPulse landing page with light and dark themes; every figure on it comes from the project repository (see `components/landing/data.ts`)
- Registration and sign-in for drivers, parking owners, and traffic authorities
- JWT-backed sessions with automatic access-token refresh
- Role-aware dashboard routing
- Parking-owner dashboard with live lots, AI slot status, cameras, and today's revenue
- Parking-lot registration with an OpenStreetMap location picker and photo upload
- Camera management with an AI occupancy check (`POST /spaces/:id/infer`)
- Revenue history from `GET /bookings` with filters, cancel, and CSV export
- Facility settings: edit, relocate, photos, hourly rate, and delete
- Editable owner/authority profiles with signed-in device management
- Traffic-authority command center on a live OpenStreetMap of Dhaka
- Zones, enforcement, and analytics derived from live AI occupancy data
- Responsive desktop, tablet, and mobile navigation
- Network-aware loading indicators and loader demos

## Tech Stack

- Next.js 16.2 using the App Router
- React 19.2 and TypeScript 5
- Tailwind CSS 4
- shadcn/ui components built on Radix UI primitives
- Class Variance Authority, `clsx`, and `tailwind-merge` for component variants
- Framer Motion and Lucide React
- Leaflet + React Leaflet with free OpenStreetMap tiles (no API key)
- Native `fetch` for API requests
- Node's built-in test runner for unit tests

## Prerequisites

- Node.js 20.9 or newer
- npm
- A CityPulse API instance when testing local backend changes

## Getting Started

From `applications/web/frontend`:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign-in uses NextAuth, which needs a secret to encrypt its session cookie. Add one to `.env.local` (and to the hosting environment, e.g. Vercel):

```dotenv
NEXTAUTH_SECRET=<output of: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

The application uses the deployed CityPulse API by default. To use a local backend, create or update `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Then start the backend from a second terminal:

```bash
cd ../backend
npm install
npm run start:dev
```

Restart the frontend development server after changing environment variables.


## Application Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/login` | Account sign-in |
| `/signup` | Role-based account registration |
| `/forgot-password` | Password-reset request UI |
| `/reset-password` | Password-reset form |
| `/dashboard` | Authenticated role gateway |
| `/owner` | Parking-owner dashboard and registered lots |
| `/owner/spaces/new` | Register a parking lot |
| `/owner/cameras` | Owner camera-management view |
| `/owner/revenue` | Owner revenue-history view |
| `/owner/settings` | Owner facility configuration |
| `/admin` | Admin overview: parking-lot approvals and user roles |
| `/command-center` | Traffic-authority operations dashboard |
| `/command-center/zones` | Zone management |
| `/command-center/enforcement` | Enforcement logs |
| `/command-center/analytics` | Traffic analytics |
| `/loader`, `/loader-demo` | Loading-state demos for development |

## Project Structure

```text
frontend/
|-- app/
|   |-- (auth)/                 # Login, signup, and password-reset routes
|   |-- command-center/         # Traffic-authority portal
|   |-- dashboard/              # Authenticated role gateway
|   |-- owner/                  # Parking-owner portal
|   |-- loader/                 # Loading-state demo
|   |-- loader-demo/            # Network-aware loader demo
|   |-- globals.css             # Tailwind import and CityPulse design tokens
|   `-- layout.tsx              # Root metadata, theme initialization, auth provider
|-- components/
|   |-- loading/                # Heartbeat and network-aware loaders
|   |-- maps/                   # OpenStreetMap (Leaflet) live map and location picker
|   |-- portal/                 # Owner and authority navigation shells
|   `-- ui/                     # shadcn/ui components and shared UI primitives
|-- context/AuthContext.tsx     # Client authentication state
|-- lib/
|   |-- api/                    # API client (timeout/retry pipeline) and shared query cache
|   |-- admin/                  # Admin API repository and types
|   |-- auth/                   # Auth contracts, NextAuth options and repository, route access rules
|   |-- bookings/               # Bookings API repository, types, and hook
|   |-- insights/               # Pure metrics: occupancy, stress, alerts, revenue
|   `-- spaces/                 # Parking-space API repository, types, and live-data hooks
|-- docs/                       # Supporting project documentation
|-- ml/                         # Parking-detection research and experiments
|-- public/                     # Static assets
|-- components.json             # shadcn/ui configuration
`-- package.json
```

## Authentication and API Flow

Sessions are managed by NextAuth (`lib/auth/nextauth-options.ts`, served at `/api/auth/*`). Registration calls the NestJS API's `/auth/register` from the browser. Sign-in goes through NextAuth's Credentials provider, which forwards the email and password to the API's `/auth/login` and keeps the returned tokens in an encrypted, httpOnly session cookie:

- the browser receives only the short-lived access token (from `/api/auth/session`, held in memory); the refresh token never leaves the server;
- sessions created with **Remember me** last 30 days, other sessions end 24 hours after sign-in;
- the server refreshes the access token when it is within 30 seconds of expiring;
- only one refresh runs at a time, across tabs too (the API rotates refresh tokens, so a second parallel refresh would sign the user out);
- logout clears the session cookie first and then tells the API, without waiting for it.

`proxy.ts` (Next.js 16's name for Middleware) reads the role from the session cookie before a page renders: `/admin`, `/owner` and `/command-center` open only for their own role, signed-out visitors are sent to `/login` and returned afterwards, and signed-in users skip `/login` and `/signup`. The rules are in `lib/auth/access.ts`. Admin accounts cannot be created from the signup page.

Authenticated requests to `/spaces` include the access token as a Bearer token. The owner portal loads registered parking lots from this endpoint and uses it to create new lots.

Set `NEXT_PUBLIC_AUTH_BACKEND=local` to sign up and sign in with a browser-only store instead (for UI demos while the API is asleep; portal data still comes from the API, and `proxy.ts` steps aside so the pages guard themselves). The `dev-local-auth` entry in `.claude/launch.json` starts the dev server that way on port 3007.

## Data Loading

API data goes through a shared cache in `lib/api/query-store.ts`, used from components with `useQuery` (`lib/api/use-query.ts`):

- pages that need the same data share one copy and one request, and moving between portal pages reuses data younger than 60 s;
- live occupancy is polled every 30 s only while a page shows it, pauses in hidden tabs, and backs off after failures;
- Dhaka scan points that return no lots are re-checked every 5 minutes instead of on every poll;
- repository writes (create, update, delete, photos) mark the cached lots stale, so pages reload them;
- the cache is cleared on sign-in and sign-out.

`apiRequest` (`lib/api/client.ts`) times reads out after 60 s and retries them twice (after 1 s and 3 s) on network errors and 502/503/504, which covers a sleeping Render instance waking up. Writes are never retried.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run API, session, and phone-number unit tests with coverage |

Before submitting frontend changes, run:

```bash
npm run lint
npm run test:unit
npm run build
```

## Data Sources

| Feature | API |
| --- | --- |
| Owner lots, settings, cameras | `GET/POST/PATCH/DELETE /spaces`, `GET /spaces/:id` |
| Lot photos | `POST /spaces/:id/photos`, `DELETE /spaces/:id/photos/:photoId`, `GET .../presign` |
| AI occupancy check | `POST /spaces/:id/infer` |
| Revenue | `GET /bookings`, `PATCH /bookings/:id/cancel` |
| Profiles and devices | `GET/PATCH /profiles/me`, `GET /auth/sessions`, `DELETE /auth/sessions/:id` |
| Command center, zones, analytics, enforcement | Public `GET /spaces/nearby` (polled every 30 s across Dhaka; empty areas every 5 min) |

The API has no alerts, enforcement, or analytics endpoints, so `lib/insights/metrics.ts` derives them from live slot data. Unbooked occupancy (an occupied slot with no booking) is shown as an enforcement incident.

## Current Limitations

- The current API adapter does not expose password-reset endpoints, so the forgot/reset-password pages report that the feature is unavailable.
- The driver-specific dashboard is not implemented yet.
- Warden dispatch, tickets, evidence images, occupancy history charts, surge pricing, payouts, and notifications need backend endpoints that do not exist yet.
- The API stores one camera per parking lot (`rtsp_url` on `PATCH /spaces/:id`).
- Social sign-in, notifications, and search are UI placeholders.

## Part of CityPulse

CityPulse is an intelligent parking and traffic-control platform that connects drivers, parking owners, and traffic authorities.
