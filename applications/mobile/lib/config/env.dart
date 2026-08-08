// lib/config/env.dart
//
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
}