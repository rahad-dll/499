# CityPulse map upgrade (mobile)

## What changed
| Area | Before | Now |
|---|---|---|
| Place search | Nominatim (1 req/s limit, slow, not meant for autocomplete) | Google Places API (New) autocomplete + Photon free fallback, 220 ms debounce, request cancel, 5 min cache, session tokens, recent searches |
| Parking search | filtered after a 400 ms debounce | instant, local, shown above place results |
| Routing | public OSRM, polyline only, then opened Google Maps app | Google Routes API (traffic-aware, real maneuvers) + OSRM fallback |
| Navigation | none in-app | in-app turn-by-turn: maneuver banner, ETA/remaining, route snapping, auto reroute, arrival card, heading-up camera |
| Map look | default Google map + default pins | custom light/dark style (follows app theme), custom pins showing free slots |
| Extras | - | long-press to drop a pin, traffic layer toggle, recenter button |

## One-time setup
1. Google Cloud console -> same project as your Maps key -> enable
   **Places API (New)** and **Routes API** (billing must be on).
2. If the key is restricted to "Android apps", REST calls from Dart are
   rejected (403). The app then silently falls back to Photon + OSRM.
   To use Google for search/routing, restrict the key by **API** instead,
   or proxy these two calls through your backend (recommended for release).
3. Free-only mode (no Google billing for search/routing):
   `flutter run --dart-define=USE_GOOGLE_SERVICES=false`
4. `flutter pub get`

## Security
`env.dart` and `AndroidManifest.xml` contain a Google key that is committed
to a public repo. Rotate it in Google Cloud and restrict it (Android package
+ SHA-1 for the Maps SDK, API restrictions for the rest).

## Not included (good next steps)
- Voice guidance (flutter_tts) and keep-screen-awake (wakelock_plus)
- Background navigation (needs an Android foreground service)
- Marker clustering for very dense areas
- Live-traffic ETA refresh during a trip
