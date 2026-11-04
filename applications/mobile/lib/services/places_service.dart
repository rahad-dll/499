// lib/services/places_service.dart
//
// Place search ("where do you want to park?").
//
//   1. Google Places API (New) autocomplete  -> fast, great Bangladesh data
//   2. Photon (OSM, built for type-ahead)    -> free fallback, returns
//                                               coordinates immediately
//
// Speed tricks: request cancellation, 5-minute LRU cache, session tokens
// (cheaper Google billing), automatic back-off when Google rejects a key.
import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../config/env.dart';
import '../utils/geo_utils.dart';

enum PlaceSource { google, photon, recent }

class PlaceSuggestion {
  const PlaceSuggestion({
    required this.id,
    required this.primary,
    this.secondary = '',
    this.location,
    this.distanceM,
    this.source = PlaceSource.photon,
  });

  /// Google place id, or an OSM id for Photon results.
  final String id;

  /// "Gulshan 2 Circle"
  final String primary;

  /// "Dhaka, Dhaka Division"
  final String secondary;

  /// Known immediately for Photon / recent items; Google fills it in
  /// later through [PlacesService.resolve].
  final LatLng? location;
  final double? distanceM;
  final PlaceSource source;

  String get description => secondary.isEmpty ? primary : '$primary, $secondary';

  PlaceSuggestion withLocation(LatLng l, {PlaceSource? source}) =>
      PlaceSuggestion(
        id: id,
        primary: primary,
        secondary: secondary,
        location: l,
        distanceM: distanceM,
        source: source ?? this.source,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'primary': primary,
        'secondary': secondary,
        'lat': location?.latitude,
        'lng': location?.longitude,
      };

  static PlaceSuggestion? fromJson(Map<String, dynamic> j) {
    final lat = (j['lat'] as num?)?.toDouble();
    final lng = (j['lng'] as num?)?.toDouble();
    if (lat == null || lng == null) return null;
    return PlaceSuggestion(
      id: j['id']?.toString() ?? '',
      primary: j['primary']?.toString() ?? '',
      secondary: j['secondary']?.toString() ?? '',
      location: LatLng(lat, lng),
      source: PlaceSource.recent,
    );
  }
}

class _CacheEntry {
  _CacheEntry(this.items) : at = DateTime.now();
  final List<PlaceSuggestion> items;
  final DateTime at;
}

class PlacesService {
  static const Duration _cacheTtl = Duration(minutes: 5);
  static const int _cacheMax = 80;
  static const String _userAgent = 'CityPulseApp/1.0 (NSU CSE499 capstone)';

  final Map<String, _CacheEntry> _cache = {};
  http.Client? _client;
  String _sessionToken = _newToken();
  DateTime? _googleBackoffUntil;

  bool get _googleOk =>
      AppEnv.useGoogleServices &&
      (_googleBackoffUntil == null ||
          DateTime.now().isAfter(_googleBackoffUntil!));

  // -------------------------------------------------------------------------
  // Autocomplete
  // -------------------------------------------------------------------------

  /// Returns suggestions for [input]. Calling it again cancels the previous
  /// in-flight request (the cancelled call returns an empty list — callers
  /// should also ignore stale results with their own sequence number).
  Future<List<PlaceSuggestion>> autocomplete(
    String input, {
    LatLng? bias,
  }) async {
    final q = input.trim();
    if (q.length < 2) return const [];

    final biasKey = bias == null
        ? '-'
        : '${bias.latitude.toStringAsFixed(2)},${bias.longitude.toStringAsFixed(2)}';
    final key = '${q.toLowerCase()}|$biasKey';

    final hit = _cache[key];
    if (hit != null && DateTime.now().difference(hit.at) < _cacheTtl) {
      return hit.items;
    }

    _client?.close();
    final client = http.Client();
    _client = client;

    try {
      List<PlaceSuggestion>? out;
      if (_googleOk) out = await _googleAutocomplete(client, q, bias);
      out ??= await _photonAutocomplete(client, q, bias);
      if (out.isNotEmpty) _cachePut(key, out);
      return out;
    } catch (e) {
      // Includes "request cancelled" when a newer keystroke closed us.
      debugPrint('Place search cancelled/failed: $e');
      return const [];
    } finally {
      if (identical(_client, client)) _client = null;
      client.close();
    }
  }

  void _cachePut(String key, List<PlaceSuggestion> items) {
    _cache.remove(key);
    _cache[key] = _CacheEntry(items);
    while (_cache.length > _cacheMax) {
      _cache.remove(_cache.keys.first);
    }
  }

  // ---- Google Places API (New) -------------------------------------------

  Future<List<PlaceSuggestion>?> _googleAutocomplete(
    http.Client client,
    String q,
    LatLng? bias,
  ) async {
    final body = <String, dynamic>{
      'input': q,
      'sessionToken': _sessionToken,
      'includedRegionCodes': ['bd'],
      'languageCode': 'en',
    };
    if (bias != null) {
      body['locationBias'] = {
        'circle': {
          'center': {'latitude': bias.latitude, 'longitude': bias.longitude},
          'radius': 35000.0,
        },
      };
      // Lets Google return distanceMeters for each prediction.
      body['origin'] = {'latitude': bias.latitude, 'longitude': bias.longitude};
    }

    final res = await client
        .post(
          Uri.https('places.googleapis.com', '/v1/places:autocomplete'),
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': AppEnv.mapsApiKey,
          },
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 6));

    if (res.statusCode != 200) {
      debugPrint('Places(New) autocomplete HTTP ${res.statusCode}: ${res.body}');
      if (res.statusCode == 401 ||
          res.statusCode == 403 ||
          res.statusCode == 429) {
        _googleBackoffUntil = DateTime.now().add(const Duration(minutes: 3));
      }
      return null;
    }

    final data = jsonDecode(res.body);
    final list = (data is Map ? data['suggestions'] : null) as List?;
    if (list == null) return const [];

    final out = <PlaceSuggestion>[];
    for (final item in list) {
      final p = item is Map ? item['placePrediction'] : null;
      if (p is! Map) continue;
      final id = p['placeId']?.toString();
      if (id == null || id.isEmpty) continue;

      final sf = p['structuredFormat'];
      final main = _nestedText(sf, 'mainText');
      final sec = _nestedText(sf, 'secondaryText');
      final full = _nestedText(p, 'text') ?? '';

      out.add(PlaceSuggestion(
        id: id,
        primary: (main == null || main.isEmpty) ? full : main,
        secondary: sec ?? '',
        distanceM: (p['distanceMeters'] as num?)?.toDouble(),
        source: PlaceSource.google,
      ));
    }
    return out;
  }

  /// parent[key]['text'] as a String, or null when anything is missing.
  static String? _nestedText(dynamic parent, String key) {
    if (parent is! Map) return null;
    final child = parent[key];
    if (child is! Map) return null;
    return child['text']?.toString();
  }

  // ---- Photon (free fallback) ----------------------------------------------

  Future<List<PlaceSuggestion>> _photonAutocomplete(
    http.Client client,
    String q,
    LatLng? bias,
  ) async {
    final params = <String, String>{
      'q': q,
      'limit': '8',
      'lang': 'en',
      // Bangladesh bounding box (minLon,minLat,maxLon,maxLat).
      'bbox': '88.0,20.5,92.8,26.7',
    };
    if (bias != null) {
      params['lat'] = bias.latitude.toStringAsFixed(5);
      params['lon'] = bias.longitude.toStringAsFixed(5);
      params['location_bias_scale'] = '0.4';
    }

    final res = await client
        .get(
          Uri.https('photon.komoot.io', '/api/', params),
          headers: {'User-Agent': _userAgent},
        )
        .timeout(const Duration(seconds: 6));

    if (res.statusCode != 200) {
      debugPrint('Photon HTTP ${res.statusCode}: ${res.body}');
      return const [];
    }

    final data = jsonDecode(res.body);
    final features = (data is Map ? data['features'] : null) as List?;
    if (features == null) return const [];

    final seen = <String>{};
    final out = <PlaceSuggestion>[];
    for (final f in features) {
      if (f is! Map) continue;
      final props = f['properties'];
      final coords = f['geometry']?['coordinates'];
      if (props is! Map || coords is! List || coords.length < 2) continue;

      final cc = props['countrycode']?.toString();
      if (cc != null && cc.isNotEmpty && cc.toUpperCase() != 'BD') continue;

      final name = props['name']?.toString();
      final street = props['street']?.toString();
      final primary = (name != null && name.isNotEmpty) ? name : street;
      if (primary == null || primary.isEmpty) continue;

      final parts = <String>[];
      void add(dynamic v) {
        final s = v?.toString().trim();
        if (s != null && s.isNotEmpty && s != primary && !parts.contains(s)) {
          parts.add(s);
        }
      }

      add(street);
      add(props['district']);
      add(props['locality']);
      add(props['city']);
      add(props['state']);
      final secondary = parts.take(3).join(', ');

      if (!seen.add('$primary|$secondary')) continue;

      final loc = LatLng(
        (coords[1] as num).toDouble(),
        (coords[0] as num).toDouble(),
      );
      out.add(PlaceSuggestion(
        id: '${props['osm_type'] ?? ''}${props['osm_id'] ?? ''}',
        primary: primary,
        secondary: secondary,
        location: loc,
        distanceM: bias == null ? null : GeoUtils.distanceM(bias, loc),
        source: PlaceSource.photon,
      ));
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Resolve a suggestion to coordinates
  // -------------------------------------------------------------------------

  /// Photon / recent suggestions already carry coordinates. Google ones need
  /// one Place Details call (this also closes the autocomplete session, so
  /// the whole search is billed as a single session).
  Future<LatLng?> resolve(PlaceSuggestion s) async {
    if (s.location != null) {
      _newSession();
      return s.location;
    }
    if (s.source == PlaceSource.google && _googleOk) {
      try {
        final res = await http
            .get(
              Uri.https(
                'places.googleapis.com',
                '/v1/places/${s.id}',
                {'sessionToken': _sessionToken},
              ),
              headers: {
                'X-Goog-Api-Key': AppEnv.mapsApiKey,
                'X-Goog-FieldMask': 'location',
              },
            )
            .timeout(const Duration(seconds: 6));
        if (res.statusCode == 200) {
          final loc = jsonDecode(res.body)['location'];
          if (loc is Map) {
            _newSession();
            return LatLng(
              (loc['latitude'] as num).toDouble(),
              (loc['longitude'] as num).toDouble(),
            );
          }
        } else {
          debugPrint('Place details HTTP ${res.statusCode}: ${res.body}');
        }
      } catch (e) {
        debugPrint('Place details error: $e');
      }
    }
    return null;
  }

  void _newSession() => _sessionToken = _newToken();

  static String _newToken() {
    final r = math.Random.secure();
    final b = List<int>.generate(16, (_) => r.nextInt(256));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    String h(int s, int e) =>
        b.sublist(s, e).map((x) => x.toRadixString(16).padLeft(2, '0')).join();
    return '${h(0, 4)}-${h(4, 6)}-${h(6, 8)}-${h(8, 10)}-${h(10, 16)}';
  }

  void dispose() {
    _client?.close();
    _client = null;
  }
}