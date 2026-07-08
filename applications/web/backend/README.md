# CityPulse - API Backend

NestJS backend service for the CityPulse platform. Handles API requests for the parking owner portal, driver mobile app, and traffic authority dashboard.

## Tech Stack

- NestJS 11
- TypeScript
- Prisma 7 (ORM)
- PostgreSQL (via Supabase or local)

## Getting Started

```bash
npm install
npm run start:dev
```

Server runs at [http://localhost:3001](http://localhost:3001).

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── generated/prisma/   # auto-generated Prisma client
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── prisma.config.ts
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

**Structure Updated:** 2026-07-08

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start development server (watch mode) |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |

## Prisma

```bash
npx prisma generate          # regenerate client after schema change
npx prisma migrate dev       # create and apply a new migration
npx prisma migrate deploy    # apply migrations in production
```

Copy `.env.example` to `.env` and fill in `DATABASE_URL` before running.

## Part of

CityPulse: Intelligent Parking & Traffic Control Platform

---

**README Updated:** 2026-07-08
