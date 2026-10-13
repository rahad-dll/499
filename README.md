<div align="center">

<img src="../499/applications/mobile/assets/icons/logo.png" alt="CityPulse Logo" width="110"/>

# CityPulse Mobile

**Driver app for the CityPulse Intelligent Parking & Traffic Control Platform**

Flutter · Provider · Google Maps · NestJS backend

`CSE499A / CSE499B — Section 15 — Project Group 03`

</div>

---

> **Scope of this document:** this README covers only the **mobile application**
> (`applications/mobile/`) on the `feature/mobile` branch. The backend
> (`applications/web/backend`), web frontend (`applications/web/frontend`) and AI
> services (`applications/ai`) are maintained by other team members and are only
> described here where the mobile app depends on them.
> For the whole-project overview see the [root README](../../README.md), and for
> the Git workflow see [TEAM_WORKFLOW.md](../../TEAM_WORKFLOW.md).

## Table of Contents

1. [What the app does](#1-what-the-app-does)
2. [Screenshots](#2-screenshots)
3. [Feature status](#3-feature-status)
4. [Tech stack](#4-tech-stack)
5. [Project structure](#5-project-structure)
6. [Architecture](#6-architecture)
7. [App flow and navigation](#7-app-flow-and-navigation)
8. [Backend API used by the app](#8-backend-api-used-by-the-app)
9. [Data models](#9-data-models)
10. [Services reference](#10-services-reference)
11. [Screens and widgets reference](#11-screens-and-widgets-reference)
12. [Theming and design tokens](#12-theming-and-design-tokens)
13. [Getting started](#13-getting-started)
14. [Platform notes](#14-platform-notes)
15. [Known issues and technical debt](#15-known-issues-and-technical-debt)
16. [Roadmap](#16-roadmap)
17. [Git workflow for this branch](#17-git-workflow-for-this-branch)

---

## 1. What the app does

CityPulse Mobile is the **driver-facing** client of the platform. Illegal roadside
parking is a major cause of congestion in Dhaka; this app helps drivers find
legitimate, AI-monitored parking and reserve it before they arrive.

A driver can:

- **Discover** parking spaces near their live GPS location, or near any searched place, on a Google Map.
- **See real-time availability** (available / occupied / unknown slots) that the backend derives from the AI occupancy model running on owners' CCTV cameras.
- **Navigate** to a space: an in-app route preview plus a hand-off to Google Maps turn-by-turn navigation.
- **Book** a space for a chosen date, time and duration, with an optional vehicle plate.
- **Manage bookings**: view details and timeline, cancel, or remove from the list.
- **Manage their account**: sign up, sign in, view profile, switch light/dark theme, sign out.

The mobile app talks to the same NestJS backend as the web platform, so accounts,
spaces and bookings are shared across all clients.

## 2. Screenshots

Captured on a physical Android device during CSE499A (dark theme).
Source images are in [`docs/images for CSE499A running project/`](<docs/images for CSE499A running project>),
and a screen recording is in [`docs/video for cse499A running project/`](<docs/video for cse499A running project>).

| Landing | Landing | Sign in | Sign up |
| :---: | :---: | :---: | :---: |
| <img src="docs/images%20for%20CSE499A%20running%20project/3.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/2.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/6.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/7.jpeg" width="170"/> |

| Map and search | Parking details | New booking | Booking confirmed |
| :---: | :---: | :---: | :---: |
| <img src="docs/images%20for%20CSE499A%20running%20project/9.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/10.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/11.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/12.jpeg" width="170"/> |

| My bookings | Booking details | Cancel dialog | Profile |
| :---: | :---: | :---: | :---: |
| <img src="docs/images%20for%20CSE499A%20running%20project/13.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/14.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/15.jpeg" width="170"/> | <img src="docs/images%20for%20CSE499A%20running%20project/18.jpeg" width="170"/> |

## 3. Feature status

| Area | Feature | Status |
| --- | --- | --- |
| Onboarding | Landing page (hero, features, portals, impact, footer) | Done (static content) |
| Auth | Email + password sign up (always `driver` role) | Done |
| Auth | Email + password sign in, JWT access and refresh tokens | Done |
| Auth | Session restore on app start | Done |
| Auth | Forgot password | Placeholder ("coming soon" snackbar) |
| Auth | Google sign-in | Placeholder ("coming soon" snackbar) |
| Map | Live location, nearby spaces, colour-coded markers | Done |
| Map | Place search (Nominatim) and local filter by name/address | Done |
| Map | Route preview (OSRM) + open Google Maps navigation | Done |
| Map | Dark map style | Done |
| Parking | Details sheet: availability, occupancy bar, rate, distance, amenities | Done |
| Booking | Create booking (date/time, 1–8 h, plate) | Done |
| Booking | List, details, timeline, cancel | Done |
| Booking | Delete from list | Partial: local only, see [known issues](#15-known-issues-and-technical-debt) |
| Profile | View profile, theme toggle, booking count, logout | Done |
| Profile | Edit profile | Service ready (`ProfileService.updateProfile`), no UI yet |
| Profile | Notifications, payment methods | Placeholder |
| Settings | `settings_screen.dart` | Empty file |
| Platforms | Android | Primary target |
| Platforms | iOS, web, macOS, Windows, Linux | Scaffolded by `flutter create`, not configured or tested |

## 4. Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Flutter (Material 3), Dart |
| State management | `provider` (only for theme) + `StatefulWidget` + static service classes |
| Networking | `http` |
| Local storage | `shared_preferences` (session, tokens) |
| Maps | `google_maps_flutter` |
| Location | `geolocator`, `permission_handler` |
| Place search | OpenStreetMap **Nominatim** (REST, no key) |
| Routing | **OSRM** public demo server (REST, no key) |
| External navigation | `url_launcher` to Google Maps directions URL |
| Fonts and formatting | `google_fonts` (Inter), `intl` |
| Backend | NestJS + Prisma, deployed on Render |

**SDK versions.** `pubspec.yaml` declares `sdk: '>=3.0.0 <4.0.0'`, but the code uses
`Color.withValues` and `PopScope.onPopInvokedWithResult`, so it needs a recent
Flutter. The committed `pubspec.lock` was produced with **Dart ≥ 3.12 / Flutter ≥ 3.44**;
use that or newer to be safe.

**Dependencies declared but not used in `lib/`:** `location`, `flutter_polyline_points`
(polyline decoding is done manually in `PlacesService`).

## 5. Project structure

```text
applications/mobile/
├── lib/                          # All Dart source code
│   ├── main.dart                 # Entry point, MyApp, AuthWrapper, ThemeProvider
│   ├── config/
│   │   └── env.dart              # AppEnv (Maps key constant, currently unused, see Known issues)
│   ├── models/
│   │   ├── auth_response.dart    # accessToken / refreshToken / user
│   │   ├── user_model.dart       # User (driver/owner/authority fields)
│   │   ├── parking_model.dart    # ParkingModel + SlotStatus, availability helpers
│   │   └── booking_model.dart    # BookingModel, BookingStatus enum, create payload
│   ├── services/
│   │   ├── api_service.dart      # Base URL, auth headers, get/post/patch/delete, error parsing
│   │   ├── auth_service.dart     # register, login, refresh, logout, sessions, local mock mode
│   │   ├── session_service.dart  # SharedPreferences: user, tokens, remember-me
│   │   ├── booking_service.dart  # list / create / cancel bookings
│   │   ├── profile_service.dart  # GET/PATCH /profiles/me with token refresh retry
│   │   ├── location_service.dart # GPS permission flow, current position, distance
│   │   ├── places_service.dart   # Nominatim search, OSRM directions, polyline decoder
│   │   └── deleted_bookings_service.dart  # In-memory "hidden bookings" set (singleton)
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── sign_in_screen.dart
│   │   │   └── sign_up_screen.dart
│   │   └── dashboard/
│   │       ├── dashboard_screen.dart       # Home: map, search, parking cards, details sheet
│   │       ├── new_booking_sheet.dart      # Booking bottom sheet
│   │       ├── bookings_screen.dart        # My Bookings list
│   │       ├── booking_details_screen.dart # Single booking, timeline, cancel/delete
│   │       ├── profile_screen.dart         # Profile, theme switch, menu, logout
│   │       ├── dashboard_shell.dart        # IndexedStack + exit dialog (currently unused)
│   │       └── settings_screen.dart        # Empty (0 bytes)
│   ├── widgets/
│   │   ├── common/app_icon.dart            # AppIcon / AppImage with placeholder fallback
│   │   ├── dashboard/app_bottom_nav.dart   # Home / Bookings / Profile bottom bar
│   │   ├── landing/                        # Landing page sections
│   │   │   ├── landing_screen.dart         # Sticky header + sections
│   │   │   ├── landing_header.dart
│   │   │   ├── hero_section.dart
│   │   │   ├── feature_section.dart
│   │   │   ├── portal_section.dart
│   │   │   ├── impact_section.dart
│   │   │   └── footer_section.dart
│   │   └── responsive_widgets.dart         # Auth-screen widgets (logo, fields, buttons, pills...)
│   ├── theme/
│   │   ├── app_colors.dart       # AppColorsLight / AppColorsDark, kBrandGradient
│   │   ├── app_theme.dart        # ThemeData light/dark (Material 3, Inter)
│   │   └── map_style.dart        # Google Maps dark style JSON
│   └── utils/
│       ├── currency_formatter.dart  # formatTaka(), formatTakaPerHour()
│       └── responsive.dart          # Breakpoints, paddings, font/spacing scaling
├── assets/
│   ├── icons/                    # Phosphor-style PNG icons, logo, waveform, Google, Roboflow
│   └── images/                   # Hero illustrations, portal previews (light/dark)
├── android/                      # Android host project (primary target)
├── ios/  macos/  windows/  linux/  web/   # Other Flutter platform scaffolds
├── docs/
│   ├── images for CSE499A running project/   # 20 device screenshots
│   └── video for cse499A running project/    # CSE499A demo recording
├── test/widget_test.dart         # Default Flutter counter test (outdated, see Known issues)
├── pubspec.yaml / pubspec.lock   # Dependencies, assets, launcher-icon config
├── analysis_options.yaml         # flutter_lints
├── create_all_files.ps1          # Legacy scaffolding script (do NOT run, see Known issues)
├── .team                         # Team notes for this folder
└── README.md                     # This file
```

### Repository context

```text
499/
├── applications/
│   ├── mobile/     ← this app (feature/mobile)
│   ├── web/        # backend (NestJS) + frontend (Next.js)
│   ├── ai/         # occupancy model, slot detection, FastAPI services
│   └── support/    # logo, colour palette, work plan (shared)
├── others/         # reports, presentations, weekly updates
├── .github/workflows/   # CI for backend and AI only (no mobile CI yet)
└── TEAM_WORKFLOW.md
```

## 6. Architecture

The app uses a deliberately simple, layered structure:

```text
 Screens / Widgets      (lib/screens, lib/widgets)
        │  call
        ▼
 Services (static or singleton)   (lib/services)
        │  use                      │ persist
        ▼                           ▼
 http → NestJS API / Nominatim / OSRM     SharedPreferences
        │  JSON
        ▼
 Models (fromJson / toJson)       (lib/models)
```

- **State management.** `provider` is used for exactly one thing: `ThemeProvider`
  (light/dark), declared in `main.dart`. Everything else is local `setState`
  inside `StatefulWidget`s, with data loaded from services.
- **Services.** Mostly static helper classes (`AuthService`, `SessionService`,
  `ApiService`) or small instances (`BookingService`, `ProfileService`).
  `LocationService` and `DeletedBookingsService` are singletons.
- **Auth.** On login/register the JWT access token and refresh token are stored
  in `SharedPreferences`. `ApiService` adds `Authorization: Bearer <token>` when
  `withAuth` is true. `ProfileService` retries once after `AuthService.refresh()`
  on a 401.
- **Local mock mode.** `AuthService.useLocalMock` (default `false`) switches
  register/login to a local SharedPreferences "database", useful for UI work
  without the backend.
- **Time zones.** The backend sends UTC; `BookingModel.fromJson` converts to local
  time once, and `createPayload` converts back to UTC when creating a booking.
- **Money.** The backend stores amounts in the smallest unit (paisa). The app
  divides space rates by 100 and shows Taka via `formatTaka()` (`৳1,250.00`).

## 7. App flow and navigation

```text
main()
  └─ ChangeNotifierProvider(ThemeProvider)
       └─ MyApp (MaterialApp, light/dark themes)
            └─ AuthWrapper ── SessionService.getSession()
                 ├─ session exists ──► DashboardScreen  (Home tab)
                 └─ no session ─────► LandingScreen
                                         └─ "Get Started" ► SignInScreen
                                                              ├─ success ► DashboardScreen (replace)
                                                              └─ "Sign Up" ► SignUpScreen ─ success ► back to Sign In
```

Bottom navigation (`AppBottomNav`) switches between three screens with
`Navigator.pushReplacement` and a 200 ms fade:

| Index | Tab | Screen |
| --- | --- | --- |
| 0 | Home | `DashboardScreen` |
| 1 | Bookings | `BookingsScreen` |
| 2 | Profile | `ProfileScreen` |

Other navigation: `DashboardScreen` opens the parking details bottom sheet and
`new_booking_sheet`; `BookingsScreen` pushes `BookingDetailsScreen`; Profile
"Sign Out" calls `SessionService.clearSession()` and returns to `LandingScreen`.

## 8. Backend API used by the app

**Base URL:** `https://four99-b6wg.onrender.com` (hard-coded in four places, see
[known issues](#15-known-issues-and-technical-debt)).
Errors follow the NestJS shape `{ "message": string | string[], "statusCode": n }`;
`ApiService.extractErrorMessage` turns them into readable text.

| Method | Endpoint | Auth | Used by | Notes |
| --- | --- | :---: | --- | --- |
| POST | `/auth/register` | no | `AuthService.register` | Sends `email`, `password`, `phone`, `role` (`driver`) and optional `full_name`, `date_of_birth`, `national_id`, `driving_licence_no`, ... |
| POST | `/auth/login` | no | `AuthService.login` | Sends `email`, `password`, `device_name` (`Flutter App`) |
| POST | `/auth/refresh` | no | `AuthService.refresh` | Body `{ refresh_token }` |
| POST | `/auth/logout` | yes | `AuthService.logout` | Failures are ignored; local session is always cleared |
| GET | `/auth/sessions` | yes | `AuthService.getSessions` | Implemented in service, no UI |
| DELETE | `/auth/sessions/:id` | yes | `AuthService.deleteSession` | Implemented in service, no UI |
| GET | `/spaces/nearby?lat=&lng=` | no | `DashboardScreen` | Backend also accepts `radiusKm` (default 5); the app does not send it |
| GET | `/bookings` | yes | `BookingService.getBookings` | Accepts a bare list or `{ data: [...] }` |
| POST | `/bookings` | yes | `BookingService.createBooking` | `{ space_id, scheduled_at (UTC ISO), duration_hours, vehicle_plate? }`; backend auto-picks a free slot |
| PATCH | `/bookings/:id/cancel` | yes | `BookingService.updateStatus` | Only cancellation is supported |
| GET | `/profiles/me` | yes | `ProfileService.getProfile` | Retries after token refresh on 401 |
| PATCH | `/profiles/me` | yes | `ProfileService.updateProfile` | Service only, no UI yet |

**External (non-backend) services**

| Service | URL | Purpose | Notes |
| --- | --- | --- | --- |
| Nominatim | `nominatim.openstreetmap.org/search` | Place autocomplete (limited to `bd`, biased around user) | Custom `User-Agent` sent; respect OSM usage policy |
| OSRM | `router.project-osrm.org/route/v1/driving/...` | Route polyline between user and space | Public demo server, not for production load |
| Google Maps | `google.com/maps/dir/?api=1&destination=...` | External turn-by-turn navigation | Opened with `url_launcher` |

## 9. Data models

### `ParkingModel` (from `GET /spaces/nearby`)

| Field | JSON key(s) | Notes |
| --- | --- | --- |
| `id`, `name`, `description`, `address` | `id`, `name`, `description`, `address` | |
| `latitude`, `longitude` | `latitude`, `longitude` | |
| `availableSpots` / `occupiedSpots` / `unknownSpots` | `available_slots`, `occupied_slots`, `unknown_slots` | From AI occupancy results |
| `totalSpots` | `total_capacity` | |
| `rate` | `rate`, `pricePerHour`, `price`, `hourlyRate`, `base_rate_unit` | Defensive multi-key; divided by 100 (paisa → BDT); may be `null` |
| `distance` | `distance_km` | Km |
| `status` | `status` | `active` / `inactive` / `pending` |
| `rating`, `amenities` | `rating`, `amenities` | Not returned by backend yet; stay `null` / `[]` |
| `photoCount`, `cameraCount`, `slotStatuses` | `photo_count`, `camera_count`, `slot_statuses` | |

UI helpers: `isOpen`, `hasAvailableSpots`, `availabilityStatus`, `availabilityColor`,
`occupancyRatio`, `formattedDistance`, `formattedRate`.

Availability rules used for markers, pills and cards:

| Condition | Label | Colour |
| --- | --- | --- |
| `status != active` | Closed | Grey |
| more than 5 free | Plenty Available | Green |
| 1 to 5 free | Limited Spots | Amber |
| 0 free | Fully Booked | Red |

### `BookingModel` (from `/bookings`)

`id`, `spaceId`, `spaceName`, `spaceAddress`, `latitude`, `longitude`, `slotId`,
`slotLabel`, `scheduledAt`, `holdExpiresAt`, `durationHours`, `pricePerHour`,
`totalPrice`, `status`, `cancellationReason`, `vehiclePlate`, `createdAt`
(snake_case on the wire). `endTime` falls back to `scheduledAt + durationHours`.

`BookingStatus`: `pending`, `confirmed`, `active`, `completed`, `cancelled`.
A booking can be cancelled only while `confirmed` or `pending`.

### `User` and `AuthResponse`

`User` carries the shared account fields plus role-specific ones
(`drivingLicenceNo`, `licenceType`, `businessName`, `nationalId`, `passportNo`,
`organization`, `badgeNumber`, ...). `AuthResponse.fromJson` accepts
`accessToken` / `access_token` / `token` and `refreshToken` / `refresh_token`.

## 10. Services reference

| Service | Responsibility | Key methods |
| --- | --- | --- |
| `ApiService` | Shared HTTP helper | `get`, `post`, `patch`, `delete`, `extractErrorMessage` |
| `AuthService` | Account lifecycle | `register`, `login`, `refresh`, `logout`, `getSessions`, `deleteSession` |
| `SessionService` | Persist session | `saveSession`, `saveTokens`, `getSession`, `getAccessToken`, `getRefreshToken`, `getRememberMe`, `isLoggedIn`, `clearSession` |
| `BookingService` | Bookings | `getBookings`, `createBooking`, `updateStatus` (cancel only), `deleteBooking` (= cancel) |
| `ProfileService` | Profile | `getProfile`, `updateProfile` |
| `LocationService` | GPS | `getCurrentLocation` (asks to enable GPS and request permission), `calculateDistance` (km), `isLocationEnabled`, `checkPermission`, `requestPermission` |
| `PlacesService` | Search and routing | `autocomplete` (Nominatim, cancels in-flight request), `getDirections` (OSRM), `dispose` |
| `DeletedBookingsService` | Hide bookings client-side | `addDeletedId`, `isDeleted`, `filterBookings`, `clearAll` |

## 11. Screens and widgets reference

### Landing (`widgets/landing/`)

Single scrollable page with a pinned header: logo, "Get Started" (opens sign-in),
theme toggle, menu button (not wired yet). Sections: **Hero** (headline, CTAs,
stats, city illustration), **Features** (Real-time Detection, AI Surveillance,
Analytics), **Portals** (Driver App, Authority Dashboard, Owner Portal),
**Impact and technologies**, **Footer** (partners, links, contact). All content is
static marketing copy.

### Auth (`screens/auth/`)

- **Sign in:** email and password validation (valid email, password of at least 6
  characters), remember-me checkbox, loading state, snackbar feedback.
- **Sign up:** full name, email, phone (10–15 digits, required), optional date of
  birth (picker), national ID and driving licence, password (min 8 characters, one
  uppercase letter, one digit), confirm password, terms checkbox. The role is
  always `driver`. On success it shows a snackbar and pops back to Sign in.
- Both use the glow-gradient background and the shared widgets in
  `responsive_widgets.dart` (`ResponsiveTextField`, `ResponsiveButton`,
  `ResponsiveSocialButton`, `ResponsiveStatusPills`, `ResponsiveThemeToggle`, ...).

### Home / Dashboard (`dashboard_screen.dart`)

- Requests location, centres the map on the user, and calls `/spaces/nearby`.
- Listens to a position stream (30 m distance filter) and reloads nearby spaces as
  the user moves; also reloads when the app returns to the foreground.
- **Search:** 400 ms debounce. Filters already-loaded spaces by name/address and
  asks Nominatim for place suggestions; picking a suggestion moves the map and
  loads spaces around that point. A clear button returns to the user's location.
- **Markers:** user location (cyan), searched place (violet), spaces coloured by
  availability. Tapping a marker or card opens the details sheet.
- **Details sheet:** status pill, available count, rate per hour, distance,
  occupancy bar, amenities, **Navigate** and **Book Now**.
- **Navigate:** draws the OSRM polyline, fits the camera, then opens Google Maps.
- **Book Now:** opens the booking sheet and, on success, a confirmation dialog
  with a shortcut to My Bookings.
- Back button shows an "Exit CityPulse?" confirmation.

### New booking sheet (`new_booking_sheet.dart`)

Duration chips (1, 2, 3, 4, 6, 8 h), date + time picker (up to 30 days ahead,
default one hour from now), optional vehicle plate, live total (`rate × hours`),
and a Confirm button that calls `BookingService.createBooking`. Booking is blocked
with a message if the space has no rate. Friendly errors for an expired session
and for a missing driver profile.

### My Bookings (`bookings_screen.dart`)

Pull-to-refresh list with loading, error and empty states. Each card shows space,
status badge, date, duration and total, with **View Details** and **Cancel**
(or **Delete** once cancelled). Swipe left to remove a booking from the list.

### Booking details (`booking_details_screen.dart`)

Header card, hourly rate, total, slot ID, vehicle plate, a timeline (created,
scheduled, ends at, cancellation reason) and the booking ID. Cancel is available
while `confirmed` or `pending`; Delete after cancellation.

### Profile (`profile_screen.dart`)

Avatar (initial fallback), name, email, role badge, stats (Parkings, Bookings,
Rating), personal information, a dark-mode switch, menu entries (Edit Profile,
Notifications, Booking History, Payment Methods) and a logout confirmation.
Edit Profile, Notifications and Payment Methods currently show "Coming Soon".

### Shared widgets

| Widget | Purpose |
| --- | --- |
| `AppIcon(name)` / `AppImage(name)` | Load `assets/icons/<name>.png` or `assets/images/<name>.png`; show a labelled placeholder if the asset is missing |
| `AppBottomNav` | Three-tab bottom bar with animated selected state |
| `Responsive` (`utils/responsive.dart`) | Breakpoints (mobile < 480, tablet < 768) and scaled padding, font and spacing helpers |

## 12. Theming and design tokens

- Light and dark `ThemeData` (Material 3, Inter via `google_fonts`) live in
  `theme/app_theme.dart`; `ThemeProvider` toggles them. The default is **light**
  and the choice is **not persisted** between launches.
- Brand colours (from `applications/support/color-palette`):

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#F7F9FC` | `#0F1728` |
| Surface / card | `#FFFFFF` | `#16223A` / `#1A2740` |
| Primary text | `#1A2B4A` | `#F7F9FC` |
| Accent teal | `#00C9B1` | `#18D6C0` |
| Accent purple | `#7C5CFF` | `#8E7CFF` |
| Border | `#E3E8F0` | `#243350` |

- `kBrandGradient` (teal to purple) is used for the primary CTAs and hero title.
- The Google Map switches to `MapStyles.dark` in dark mode.
- Colours are currently defined in `app_colors.dart`, `app_theme.dart` **and**
  inline hex values across screens; consolidating them is on the roadmap.

## 13. Getting started

### Prerequisites

- Flutter SDK, stable channel, recent enough for Dart ≥ 3.12 (see [Tech stack](#4-tech-stack))
- Android Studio or VS Code with Flutter plugins
- An Android device or emulator with **Google Play services** (required for Google Maps)
- A Google Maps SDK for Android API key (ask the team lead; do not commit it)

### Run

```bash
git clone https://github.com/rahad-dll/499.git
cd 499
git checkout feature/mobile
cd applications/mobile

flutter pub get
flutter run            # pick a connected Android device/emulator
```

The app talks to the **deployed** backend, so no local server is needed. The
hosted backend may take a moment to respond after being idle.

### Configure the Google Maps key

The key is currently read from `android/app/src/main/AndroidManifest.xml`
(`com.google.android.geo.API_KEY`). Replace it with your own restricted key for
local work and **do not push your key**. See the security note in
[known issues](#15-known-issues-and-technical-debt).

### Useful commands

```bash
flutter analyze                       # static analysis (flutter_lints)
flutter test                          # see note: the default test is outdated
flutter build apk --debug             # debug APK
flutter build apk --release           # release APK (see Android notes first)
dart run flutter_launcher_icons       # regenerate Android launcher icons
```

### Local mock mode (UI work without the backend)

Set `AuthService.useLocalMock = true` in `lib/services/auth_service.dart`. Sign up
and sign in then use a local list in SharedPreferences. Bookings, profile and
nearby spaces still call the real backend.

## 14. Platform notes

**Android (primary)**

- Application ID `com.example.citypulse`, label `CityPulse`, launcher icon `@drawable/logo`.
- Java/Kotlin target 17, Gradle Kotlin DSL.
- Release builds are currently signed with the **debug** key (template TODO).
- The `INTERNET` permission is declared only in the `debug` and `profile`
  manifests. Add `INTERNET`, `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`
  to `src/main/AndroidManifest.xml` before building a release APK.

**iOS / macOS / Windows / Linux / Web**

Generated by `flutter create` but not configured: iOS lacks the Google Maps key
initialisation and the `NSLocationWhenInUseUsageDescription` entry in
`Info.plist`, and the desktop and web targets have not been tested with the map
and location plugins.

## 15. Known issues and technical debt

Found while reviewing every file on this branch. Ordered roughly by importance.

### Security

1. **A Google Maps API key is hard-coded and committed in a public repository**, in both
   `lib/config/env.dart` and `android/app/src/main/AndroidManifest.xml`.
   Anyone can copy it. Restrict the key in Google Cloud Console (Android package
   name + SHA-1, API restrictions), rotate it, and move it out of source control
   (for example `--dart-define` for Dart code and `local.properties` / Gradle
   manifest placeholders for Android). Rotating matters because the old key stays
   in Git history. `AppEnv.mapsApiKey` is not referenced anywhere, so
   `env.dart` can simply be deleted or rewritten.
2. **Tokens in plain SharedPreferences.** Prefer `flutter_secure_storage`.
3. **Debug logging of auth responses.** `auth_service.dart` prints the full
   login/register response body (including tokens) with `print`. Remove it
   or guard with `kDebugMode`.

### Build and platform

4. Main `AndroidManifest.xml` has no `INTERNET` or location permissions (see [Platform notes](#14-platform-notes)).
5. `test/widget_test.dart` is the default counter test: it imports
   `package:mobile/main.dart` (the package is `citypulse`) and uses `MyApp`
   with a counter that does not exist, so `flutter test` fails.
6. `create_all_files.ps1` is an old scaffold script that **overwrites**
   `lib/main.dart`, `lib/theme/app_colors.dart`, `lib/theme/app_theme.dart`
   and creates a different landing screen. Do not run it; consider deleting it.
7. `flutter_launcher_icons` points to `assets/icons/app_icon_foreground.png`,
   which does not exist.
8. `pubspec.yaml` SDK constraint (`>=3.0.0`) is older than what the code needs.
   Unused dependencies: `location`, `flutter_polyline_points`.
9. `.gitignore` lists `pubspec.lock`, `*.lock` and generated files, yet
   `pubspec.lock` and `.flutter-plugins-dependencies` are committed. Decide on one policy.

### Behaviour

10. **"Delete booking" is client-side only.** The backend has no `DELETE
    /bookings/:id`; `DeletedBookingsService` keeps hidden IDs in memory, so
    deleted bookings **reappear after an app restart**. Needs a backend endpoint.
11. `DashboardShell` (tabs in an `IndexedStack`) is never used. The real tab
    navigation uses `pushReplacement`, so each tab reloads and loses state.
    Choose one approach.
12. `DashboardScreen` uses the deprecated `WillPopScope`, while `DashboardShell`
    uses `PopScope`.
13. "Remember me" is saved, but auto-login in `SignInScreen` is commented out, and
    `AuthWrapper` signs the user in whenever a session exists, regardless of that flag.
14. After sign up, `AuthService.register` already stores a session, but the
    screen pops back to Sign in instead of continuing to the dashboard.
15. Profile screen: "Parkings" and "Rating" are hard-coded (`0`, `0.0`), and the
    Bookings count calls `getBookings()` inside `build`, which refetches on every
    rebuild.
16. `BookingService.getBookings` swallows errors and returns an empty list, so
    the Bookings screen's error state is unreachable for network failures.
17. `ParkingModel.copyWith` omits `photoCount`, `cameraCount` and `slotStatuses`
    (they are reset when copying), and `toJson` omits them too.
18. `ParkingModel.rate` is divided by 100 even for the `rate`/`price` keys;
    confirm each key's unit with the backend.
19. Dark mode preference is not persisted.

### Code quality

20. The base URL is duplicated in `api_service.dart`, `booking_service.dart`,
    `profile_service.dart` and `dashboard_screen.dart`. Centralise it (e.g. in `AppEnv`).
21. `dashboard_screen.dart` is about 1,850 lines (map, search, sheets, dialogs).
    Split into widgets (`ParkingDetailsSheet`, `ParkingCard`, `SearchBar`, ...).
22. Booking-related screens mix two data-access styles (`ApiService` static
    helpers and raw `http` calls). Standardise on `ApiService`.
23. Heavy use of inline colours instead of theme tokens; `AppColors*` and
    `AppTheme` overlap.
24. `settings_screen.dart` is an empty file.
25. Mixed English/Bengali code comments; pick one language for the team.
26. Some landing page statistics (vehicles per day, "$2.4M saved") are
    placeholders, not real data.

## 16. Roadmap

Suggested next steps for CSE499B, in priority order:

- [ ] Rotate and restrict the Maps API key; move secrets out of Git
- [ ] Add release-ready Android manifest permissions and a proper application ID/signing config
- [ ] Fix `widget_test.dart` and add unit tests for models and services
- [ ] Add a mobile CI workflow (`flutter analyze`, `flutter test`, build APK) in `.github/workflows/`
- [ ] Edit profile screen using `ProfileService.updateProfile`
- [ ] Real "delete/archive booking" with a backend endpoint
- [ ] Slot-level booking (choose a slot using `slotStatuses`) instead of auto-assignment
- [ ] Push notifications for booking reminders and hold expiry
- [ ] Payment integration (bKash / Nagad / card) behind the "Payment Methods" entry
- [ ] Forgot password and Google sign-in
- [ ] Persist theme, add Bangla localisation
- [ ] Spaces filters (price, distance, open now) and ratings
- [ ] Optional: owner and authority views, or keep the mobile app driver-only
- [ ] Configure and test iOS

## 17. Git workflow for this branch

Follow [TEAM_WORKFLOW.md](../../TEAM_WORKFLOW.md):

```bash
git checkout development
git pull origin development
git checkout feature/mobile          # existing mobile branch
git pull origin development           # keep it up to date

# work, then
git add .
git commit -m "feat: add edit profile screen"
git push origin feature/mobile
```

Open a pull request **`feature/mobile` → `development`** titled
`[Mobile] Short description - fixes #issue`. Commit messages use
`<type>: <subject>` (`feat`, `fix`, `docs`, `build`, `refactor`, `test`, `style`,
`init`), imperative mood, lowercase, no trailing period, under 50 characters.

---

<div align="center">

**CityPulse** · CSE499A / CSE499B · Section 15 · Project Group 03
Made in Dhaka

</div>
