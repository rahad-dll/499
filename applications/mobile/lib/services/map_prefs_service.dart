// lib/services/map_prefs_service.dart
//
// What the driver chose on the map, kept on this phone so the map opens
// the same way next time: saved (favourite) parking lots, map type, search
// radius and the two overlay switches.
import 'package:shared_preferences/shared_preferences.dart';

class MapPrefs {
  const MapPrefs({
    this.savedLots = const <String>{},
    this.mapType = 'normal',
    this.radiusKm = 5,
    this.glowOn = true,
    this.ringOn = true,
  });

  /// Ids of the lots the driver saved.
  final Set<String> savedLots;

  /// normal | satellite | hybrid | terrain
  final String mapType;

  /// Search radius sent to GET /spaces/nearby?radiusKm=
  final double radiusKm;

  /// Coloured availability glow under each lot.
  final bool glowOn;

  /// Ring that shows the searched area.
  final bool ringOn;
}

class MapPrefsService {
  static const String _keySaved = 'map_saved_lots_v1';
  static const String _keyMapType = 'map_type_v1';
  static const String _keyRadius = 'map_radius_km_v1';
  static const String _keyGlow = 'map_glow_v1';
  static const String _keyRing = 'map_ring_v1';

  /// Radii the driver can pick (km).
  static const List<double> radii = [1, 2, 5, 10];

  Future<MapPrefs> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final radius = prefs.getDouble(_keyRadius) ?? 5;
      return MapPrefs(
        savedLots: (prefs.getStringList(_keySaved) ?? const <String>[]).toSet(),
        mapType: prefs.getString(_keyMapType) ?? 'normal',
        radiusKm: radii.contains(radius) ? radius : 5,
        glowOn: prefs.getBool(_keyGlow) ?? true,
        ringOn: prefs.getBool(_keyRing) ?? true,
      );
    } catch (_) {
      return const MapPrefs();
    }
  }

  Future<void> setSavedLots(Set<String> ids) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_keySaved, ids.toList());
    } catch (_) {}
  }

  Future<void> setMapType(String type) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyMapType, type);
    } catch (_) {}
  }

  Future<void> setRadiusKm(double km) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setDouble(_keyRadius, km);
    } catch (_) {}
  }

  Future<void> setGlow(bool on) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_keyGlow, on);
    } catch (_) {}
  }

  Future<void> setRing(bool on) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_keyRing, on);
    } catch (_) {}
  }

  /// Saved lots belong to the account: forget them at logout.
  Future<void> clearSaved() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keySaved);
    } catch (_) {}
  }
}
