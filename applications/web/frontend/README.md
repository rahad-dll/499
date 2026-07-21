# CityPulse - Web Frontend

Next.js web application for the CityPulse platform. Serves the parking owner registration portal and the traffic authority monitoring dashboard.

## Tech Stack

- Next.js 16
- TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Requires the backend running at `http://localhost:3001` (configurable via `NEXT_PUBLIC_API_URL` in `.env.local`).

## Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/            # Split-panel login page
│   │   ├── signup/           # Role selection + account details
│   │   ├── forgot-password/  # Reset link request
│   │   └── reset-password/   # New password form (?token=...)
│   ├── dashboard/            # Post-login placeholder
│   ├── globals.css           # CityPulse design tokens (light/dark) + components
│   ├── layout.tsx            # Theme init + Geist font
│   └── page.tsx
├── components/               # Logo, BrandPanel, ThemeToggle, fields, icons
├── lib/api.ts                # Backend API client + token storage
├── public/
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

Pages are responsive (desktop split layout ≥1024px, tablet/mobile centered card) and support light/dark themes via the toggle (persisted in `localStorage`, defaults to system).

**Structure Updated:** 2026-07-10

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Part of

CityPulse: Intelligent Parking & Traffic Control Platform

---

**README Updated:** 2026-07-03
