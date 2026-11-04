// lib/config/env.dart
//
// Central place for API keys / environment values. Nothing here should
// ever be committed with a real key in a public repo — for a capstone
// team repo this hardcoded value is fine, but if you push this to a
// public GitHub later, switch to --dart-define and read it via
// String.fromEnvironment instead.

class AppEnv {
  /// Build with `--dart-define=USE_GOOGLE_SERVICES=false` to run on the free
  /// Photon (search) + OSRM (routing) stack only — no Google billing at all.
  static const bool preferGoogle =
      bool.fromEnvironment('USE_GOOGLE_SERVICES', defaultValue: true);

  /// Google Places (New) + Routes API are used only when this is true.
  /// Both services automatically fall back to Photon / OSRM when a Google
  /// call fails (quota, billing, restricted key, offline backend...).
  static bool get useGoogleServices => preferGoogle && mapsApiKey.isNotEmpty;

  // Same Google Maps API key you already have in
  // android/app/src/main/AndroidManifest.xml (com.google.android.geo.API_KEY).
  // Places Autocomplete + Directions need it here too because those are
  // plain REST calls, not the native map widget.
  static const String mapsApiKey = 'AIzaSyDUZluioZrDAGqMQsZormAVCrUFKEEyerg';
}