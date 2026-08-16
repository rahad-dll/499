# CityPulse — Mobile Application

**Branch:** `feature/mobile` · **Module:** `applications/mobile/` · **Project:** CSE499A/B Capstone — Intelligent Parking & Traffic Control Platform, North South University

This document describes the Flutter mobile client of CityPulse: what it is, what has been built on this branch so far, how the codebase is organized, and how to get it running locally. It is meant to be read by a teammate, a supervisor, or a future version of the author who needs to pick the project back up without any prior context.

---

## 1. What This App Is

CityPulse is a smart parking and traffic management platform built as a monorepo, with separate applications for AI/computer vision, a web portal, and this mobile app. The mobile app is the **driver-facing client**: the surface a commuter uses to sign up, sign in, find nearby parking on a live map, and manage bookings.

This branch (`feature/mobile`) contains only the Flutter application, isolated from the rest of the monorepo (`applications/ai`, `applications/web`, `applications/support`). It talks to the shared backend (NestJS API + FastAPI AI service) that the rest of the team owns.

---

## 2. Current State of the Branch

The app is functional end-to-end for the core driver flow: **landing → sign up / sign in → live map with nearby parking → booking creation and management → profile**. It is wired to the real, deployed backend rather than mock data.

### 2.1 Screens & Flows Implemented

| Area | Status | Notes |
|---|---|---|
| Landing page | ✅ Done | Full marketing/entry screen with hero, feature, portal, impact, and footer sections; navigates into Sign In |
| Sign In | ✅ Done | Connected to the live `/auth/login` endpoint |
| Sign Up | ✅ Done | Connected to the live `/auth/register` endpoint, with role mapping and date-of-birth picker |
| Session persistence | ✅ Done | Auto-login on app relaunch via stored session, `AuthWrapper` decides Landing vs Dashboard on cold start |
| Dashboard (map + nearby parking) | ✅ Functional | Live Google Map with real device location and nearby parking spaces |
| Booking creation | ✅ Functional | Wired to the real `POST /bookings` endpoint |
| Booking list / details / cancellation | ✅ Functional | Wired to real endpoints, replacing earlier placeholder buttons |
| Profile | ✅ Functional | Displays account data, logout |
| Settings | ⚠️ **Placeholder file, currently empty** | `settings_screen.dart` exists but has no content yet — see [Known Gaps](#5-known-gaps--next-steps) |
| Dashboard internal structure | ⚠️ Partially refactored | `dashboard_screen.dart` still carries most of the dashboard logic in one file; a split into smaller widgets (top bar, stats ribbon, parking cards, etc.) has been designed and partially delivered but is not fully reflected in this branch yet |
| Theming (light/dark) | ✅ Done | App-wide `ThemeProvider`, consistent light/dark palettes across all screens |
| Responsive layout | ✅ Done | Mobile / tablet / desktop breakpoints via `lib/utils/responsive.dart` |

### 2.2 Backend Integration

The app is connected to the team's live backend rather than running against mocks:

- **Base URL:** configured in `lib/services/api_service.dart`
- **Auth endpoints in use:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, session endpoints under `/auth/sessions`
- **Booking endpoints in use:** `POST /bookings`, `GET /bookings`, booking detail/cancel endpoints
- **Auth model:** session/JWT-based; tokens and session state persisted on-device with `shared_preferences`

There is a `useLocalMock`-style toggle pattern in some services (a holdover from a period where the backend's `role` seeding was broken) — this is currently switched **off**, meaning the app talks to the real API. It's left in the code as a convenience for offline UI development, not as the default mode.

---

## 3. Project Structure

```
applications/mobile/
├── lib/
│   ├── main.dart                          # App entry point, ThemeProvider, AuthWrapper (session check → Landing/Dashboard)
│   │
│   ├── config/
│   │   └── env.dart                       # Environment values (e.g. Maps API key) — see Security Note below
│   │
│   ├── theme/
│   │   ├── app_theme.dart                 # Light & dark ThemeData, Material 3 setup
│   │   ├── app_colors.dart                # Semantic color tokens (light/dark)
│   │   └── map_style.dart                 # Custom Google Map styling
│   │
│   ├── utils/
│   │   ├── responsive.dart                # Breakpoints, responsive padding/spacing/fonts
│   │   └── currency_formatter.dart        # BDT currency formatting helper
│   │
│   ├── models/
│   │   ├── user_model.dart                # User entity + JSON (de)serialization
│   │   ├── auth_response.dart             # Auth API response wrapper
│   │   ├── booking_model.dart             # Booking entity
│   │   └── parking_model.dart             # Parking space entity
│   │
│   ├── services/
│   │   ├── api_service.dart               # Low-level HTTP wrapper, base URL, request helpers
│   │   ├── auth_service.dart              # Register / login / logout / session refresh logic
│   │   ├── session_service.dart           # SharedPreferences-backed session persistence
│   │   ├── booking_service.dart           # Booking CRUD against the live API
│   │   ├── deleted_bookings_service.dart  # Local tracking of removed bookings
│   │   ├── location_service.dart          # Device location access via geolocator
│   │   ├── places_service.dart            # Places/autocomplete + directions (Google Places REST)
│   │   └── profile_service.dart           # Profile fetch/update
│   │
│   ├── widgets/
│   │   ├── landing/                       # Landing page sections: hero, features, portals, impact, footer, header
│   │   ├── dashboard/
│   │   │   └── app_bottom_nav.dart        # Shared bottom navigation bar with active-tab highlighting
│   │   ├── common/
│   │   │   └── app_icon.dart              # Shared icon widget
│   │   └── responsive_widgets.dart        # Reusable responsive components (theme toggle, status pills)
│   │
│   └── screens/
│       ├── auth/
│       │   ├── sign_in_screen.dart        # Login form, validation, API-wired
│       │   └── sign_up_screen.dart        # Registration form, validation, API-wired
│       └── dashboard/
│           ├── dashboard_shell.dart       # Shell/scaffold hosting the dashboard tabs
│           ├── dashboard_screen.dart      # Map + nearby parking + booking flow (large file, see Known Gaps)
│           ├── bookings_screen.dart       # User's bookings list
│           ├── booking_details_screen.dart# Single booking detail/cancel view
│           ├── new_booking_sheet.dart     # Bottom sheet for creating a booking
│           ├── profile_screen.dart        # Account info + logout
│           └── settings_screen.dart       # (currently empty, see Known Gaps)
│
├── assets/
│   ├── icons/                             # App and in-app icons
│   └── images/                            # Illustrations, placeholders for portal/marketing imagery
│
├── android/, ios/, linux/, macos/, windows/, web/   # Flutter platform scaffolding
├── pubspec.yaml                           # Package manifest and dependencies
└── analysis_options.yaml                  # Lint configuration
```

---

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Flutter (Dart SDK `>=3.0.0 <4.0.0`) |
| State management | `provider` (`ChangeNotifier`-based `ThemeProvider`) |
| Local storage | `shared_preferences` (session, tokens, local booking cache) |
| Networking | `http` |
| Typography | `google_fonts` (Inter family, no bundled TTFs — keeps repo size down) |
| Maps & location | `google_maps_flutter`, `geolocator`, `location`, `permission_handler`, `flutter_polyline_points` |
| Formatting/i18n | `intl` |
| Linting | `flutter_lints` |
| App icon generation | `flutter_launcher_icons` |
| Target platforms | Android (primary, tested), iOS/Web/Windows/Linux/macOS scaffolding present |

Full dependency versions are in [`pubspec.yaml`](applications/mobile/pubspec.yaml).

---

## 5. Known Gaps & Next Steps

Being transparent about what's unfinished, since this README is meant to represent the real state of the branch:

- **`settings_screen.dart` is an empty file.** It's referenced in navigation but has no UI yet. Planned contents: theme toggle, notification preferences, privacy settings, about/version info.
- **`dashboard_screen.dart` is large (~1,800+ lines)** and mixes map handling, booking state, and UI in one file. A breakdown into smaller widgets (top bar, stats ribbon, route banner, parking strip, map view, parking card/detail sheets, dialogs) has been scoped out but is not fully merged into this branch — expect this file to shrink significantly once that refactor lands.
- **No automated test coverage beyond the default `widget_test.dart` scaffold.** Auth, booking, and location logic are currently untested.
- **`AppEnv.mapsApiKey` in `lib/config/env.dart` is a hardcoded key**, acceptable for an internal capstone repo but flagged in the file itself as something to move to `--dart-define` / environment injection before any public release.
- **Social login buttons on Sign In are UI-only** (they exist visually but are not wired to any provider).
- **Local-mock fallback code paths still exist** in `auth_service.dart` and `booking_service.dart` (from when the backend's role-seeding was temporarily broken). They're inert (`useLocalMock = false`) but not yet removed.

---

## 6. Getting Started

### Prerequisites
- Flutter SDK installed and available on `PATH`
- Android Studio / an Android emulator (this branch has been developed and tested primarily on a Pixel-class emulator, API level 37.1) or a physical device
- A Google Maps API key with the Maps SDK, Places API, and Directions API enabled (needed for the dashboard map and search)

### Setup

```bash
# From the repo root
cd applications/mobile

# Confirm you're on the right branch
git checkout feature/mobile
git pull origin development

# Install dependencies
flutter pub get

# Run on a connected device/emulator
flutter run
```

If you're on Android and testing location/search features, make sure your emulator or device has location services enabled and grant the location permission when prompted.

### Environment / API Key

`lib/config/env.dart` holds the Google Maps API key used for the native map widget and the Places/Directions REST calls. Replace it with your own key for local development if you don't have access to the shared one, and see the note in that file about moving this to `--dart-define` for anything beyond internal team use.

---

## 7. Backend Dependency

This app is a client only — it has no backend logic of its own. It expects the CityPulse backend (NestJS API) to be reachable at the URL configured in `lib/services/api_service.dart`. If the backend is down or the URL changes, authentication and booking features will fail even though the UI still renders.

Relevant endpoints this app currently consumes:
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET/DELETE /auth/sessions[/{id}]`
- `POST/GET /bookings`, plus per-booking detail/cancel routes

---

## 8. Git Workflow (for this branch)

- Branch chain: `main` ← `development` ← `feature/mobile`
- Commit message format: `type: subject` (e.g. `feat: add sign up screen`, `fix: dashboard booking count refresh`, `chore: update pubspec`)
- All work merges into `development` via pull request, not directly into `main`
- Pull from `development` regularly to stay in sync with backend/API contract changes made by the rest of the team

---

*This README describes the mobile application only. For the AI service, web portal, or overall system architecture, see the corresponding folders under `applications/` and the documents under `others/`.*
