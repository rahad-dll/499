# CityPulse Web Frontend

Responsive Next.js application for the CityPulse intelligent parking and traffic-control platform. It includes the public landing and authentication flows, a parking-owner portal, and a traffic-authority command center.

Live Link : https://499-ab-frontend.vercel.app/

## Features

- Public CityPulse landing page with light and dark themes
- Registration and sign-in for drivers, parking owners, and traffic authorities
- JWT-backed sessions with automatic access-token refresh
- Role-aware dashboard routing
- Parking-owner dashboard with live parking-lot data from the CityPulse API
- Parking-lot registration, camera, revenue, and facility-settings views
- Traffic-authority command center with zones, enforcement, and analytics views
- Responsive desktop, tablet, and mobile navigation
- Network-aware loading indicators and loader demos

## Tech Stack

- Next.js 16.2 using the App Router
- React 19.2 and TypeScript 5
- Tailwind CSS 4
- shadcn/ui components built on Radix UI primitives
- Class Variance Authority, `clsx`, and `tailwind-merge` for component variants
- Framer Motion and Lucide React
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
|   |-- portal/                 # Owner and authority navigation shells
|   `-- ui/                     # shadcn/ui components and shared UI primitives
|-- context/AuthContext.tsx     # Client authentication state
|-- lib/
|   |-- api/                    # API client and transport errors
|   |-- auth/                   # Auth contracts, JWT sessions, and HTTP repository
|   `-- spaces/                 # Parking-space API repository and types
|-- docs/                       # Supporting project documentation
|-- ml/                         # Parking-detection research and experiments
|-- public/                     # Static assets
|-- components.json             # shadcn/ui configuration
`-- package.json
```

## Authentication and API Flow

The active authentication repository communicates with the NestJS API. Registration calls `/auth/register`, and sign-in calls `/auth/login`. Access and refresh tokens are stored under `cp:api-session`:

- normal sessions use `sessionStorage`;
- sessions created with **Remember me** use `localStorage`;
- access tokens are refreshed when they are within 30 seconds of expiring;
- logout calls the API and always clears the local session.

Authenticated requests to `/spaces` include the access token as a Bearer token. The owner portal loads registered parking lots from this endpoint and uses it to create new lots.

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

## Current Limitations

- The current API adapter does not expose password-reset endpoints, so the forgot/reset-password pages report that the feature is unavailable.
- The driver-specific dashboard is not implemented yet.
- Several camera, revenue, analytics, and command-center visualizations currently use demonstration data.
- Social sign-in, notifications, search, and some landing-page links are UI placeholders.

## Part of CityPulse

CityPulse is an intelligent parking and traffic-control platform that connects drivers, parking owners, and traffic authorities.
