// lib/config/env.dart
//
<<<<<<< HEAD
// Central place for API keys / environment values. Nothing here should
// ever be committed with a real key in a public repo — for a capstone
// team repo this hardcoded value is fine, but if you push this to a
// public GitHub later, switch to --dart-define and read it via
// String.fromEnvironment instead.

class AppEnv {
  // Same Google Maps API key you already have in
  // android/app/src/main/AndroidManifest.xml (com.google.android.geo.API_KEY).
  // Places Autocomplete + Directions need it here too because those are
  // plain REST calls, not the native map widget.
  static const String mapsApiKey = 'AIzaSyDUZluioZrDAGqMQsZormAVCrUFKEEyerg';
=======
// API key কখনো hardcode হবে না। Run/build করার সময় --dart-define দিয়ে
// পাস করবে, তাই key কোনো .dart file এ বা git এ থাকবে না।
//
// Run:   flutter run --dart-define=MAPS_API_KEY=তোমার_key
// Build: flutter build apk --dart-define=MAPS_API_KEY=তোমার_key
class AppEnv {
  static const String mapsApiKey = String.fromEnvironment(
    'MAPS_API_KEY',
    defaultValue: '',
  );
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
}