# CityPulse API Backend

NestJS backend service for the CityPulse platform. It powers authentication, role-based access control, parking-space management, and database access for the web application.

## Latest Updates

The backend now includes:

- JWT-based authentication with login, refresh, logout, and session management
- Permission-aware guards for protected routes
- Parking-space CRUD operations with photo uploads
- Prisma models for geographic hierarchy and parking-domain entities
- Swagger API documentation at `/docs`
- Environment-based configuration for PostgreSQL, JWT secrets, and AI inference

## Tech Stack

- Node.js 22
- NestJS 11
- TypeScript
- Prisma 7
- PostgreSQL
- OpenAPI

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL database

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
cp .env.example .env
```

3. Update the values in `.env` with your database and JWT configuration.

4. Generate Prisma client and run migrations

```bash
npx prisma generate
npx prisma migrate dev
```

5. Start the development server

```bash
npm run start:dev
```

The API will be available at:

- http://url
- Swagger UI: http://url/docs
- OpenAPI JSON: http://url/docs-json

** Please contact team for the live URL

## API Documentation (Swagger)

The backend exposes interactive Swagger documentation through NestJS Swagger.

- Open the Swagger UI at http://ur/docs
- Review the generated OpenAPI schema at http://url/docs-json
- Use the Authorize button in Swagger UI to test protected endpoints with a Bearer token
- Authentication endpoints such as login and refresh are exposed under the `/auth` route group

This documentation is configured in the NestJS bootstrap file and supports bearer-auth setup for protected routes.

## Available Scripts

| Command               | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `npm run start:dev`   | Start the app in watch mode                                             |
| `npm run start:debug` | Start in debug mode                                                     |
| `npm run build`       | Build the NestJS application                                            |
| `npm run build:prod`  | Install dependencies, generate Prisma client, run migrations, and build |
| `npm run start:prod`  | Start the built application                                             |
| `npm run lint`        | Run ESLint                                                              |
| `npm run test`        | Run unit tests                                                          |
| `npm run test:e2e`    | Run end-to-end tests                                                    |

## Environment Variables

The backend reads the following values from `.env`:

- `DATABASE_URL` – PostgreSQL connection string
- `DIRECT_URL` – direct database URL for Prisma migrations
- `JWT_SECRET` – access token signing secret
- `JWT_REFRESH_SECRET` – refresh token signing secret
- `JWT_EXPIRES_IN` – access token lifetime
- `AI_INFERENCE_URL` – base URL of the AI inference service
- `AI_API_TOKEN` – bearer token used when calling the AI service
- `CORS_ORIGINS` – allowed origins for CORS
- `PORT` – server port (defaults to `3001`)

## Prisma

Useful commands:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

## Project Structure

```text
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── auth/                # auth controllers, services, DTOs, guards
│   ├── spaces/              # parking-space CRUD and photo handling
│   ├── prisma/              # Prisma module/service
│   ├── generated/prisma/    # generated Prisma client
│   ├── app.module.ts
│   └── main.ts
├── uploads/                 # uploaded space photos
├── .env.example
├── package.json
└── tsconfig.json
```

## Part of

CityPulse: Intelligent Parking & Traffic Control Platform

---

**README Updated:** 2026-07-31
