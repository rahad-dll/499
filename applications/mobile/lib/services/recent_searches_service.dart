// lib/services/recent_searches_service.dart
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'places_service.dart';

/// Last few places the driver searched for (shown when the search box is
/// focused and empty). Stored locally only.
class RecentSearchesService {
  static const String _key = 'recent_places_v1';
  static const int _max = 6;

  Future<List<PlaceSuggestion>> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getStringList(_key) ?? const [];
      final out = <PlaceSuggestion>[];
      for (final s in raw) {
        final j = jsonDecode(s);
        if (j is Map<String, dynamic>) {
          final p = PlaceSuggestion.fromJson(j);
          if (p != null) out.add(p);
        }
      }
      return out;
    } catch (_) {
      return const [];
    }
  }

  Future<void> add(PlaceSuggestion place) async {
    if (place.location == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final current = await load();
      final next = <PlaceSuggestion>[
        place,
        ...current.where((p) =>
            p.primary != place.primary || p.secondary != place.secondary),
      ].take(_max).toList();
      await prefs.setStringList(
        _key,
        next.map((p) => jsonEncode(p.toJson())).toList(),
      );
    } catch (_) {}
  }

  Future<void> clear() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_key);
    } catch (_) {}
  }
}
