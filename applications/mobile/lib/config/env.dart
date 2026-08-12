// lib/config/env.dart
//
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
}