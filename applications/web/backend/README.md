# CityPulse - API Backend

NestJS backend service for the CityPulse platform. Handles API requests for the parking owner portal and traffic authority dashboard.

## Tech Stack

- NestJS 11
- TypeScript

## Getting Started

```bash
npm install
npm run start:dev
```

Server runs at [http://localhost:3000](http://localhost:3000) by default.

## Project Structure

```
backend/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
├── nest-cli.json
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

**Structure Updated:** 2026-07-04

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start development server (watch mode) |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |

## Part of

CityPulse: Intelligent Parking & Traffic Control Platform

---

**README Updated:** 2026-07-04
