// lib/services/routing_service.dart
//
// Turn-by-turn routing.
//   1. Google Routes API (traffic-aware, real maneuvers)  -> primary
//   2. OSRM public server                                 -> free fallback
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../config/env.dart';
import '../models/route_models.dart';
import '../utils/geo_utils.dart';

class RoutingService {
  static const String _userAgent = 'CityPulseApp/1.0 (NSU CSE499 capstone)';

  http.Client? _client;
  DateTime? _googleBackoffUntil;

  bool get _googleOk =>
      AppEnv.useGoogleServices &&
      (_googleBackoffUntil == null ||
          DateTime.now().isAfter(_googleBackoffUntil!));

  /// Best route origin -> destination, or null when nothing worked.
  /// [headingDeg] (when moving) stops the router from sending the driver
  /// "turn around" instructions after a reroute.
  Future<RouteInfo?> route(
    LatLng origin,
    LatLng destination, {
    double? headingDeg,
  }) async {
    _client?.close();
    final client = http.Client();
    _client = client;

    try {
      if (_googleOk) {
        try {
          final r = await _google(client, origin, destination, headingDeg);
          if (r != null) return r;
        } catch (e) {
          debugPrint('Google Routes failed, falling back to OSRM: $e');
        }
      }
      return await _osrm(client, origin, destination);
    } catch (e) {
      debugPrint('Routing failed: $e');
      return null;
    } finally {
      if (identical(_client, client)) _client = null;
      client.close();
    }
  }

  // -------------------------------------------------------------------------
  // Google Routes API
  // -------------------------------------------------------------------------

  Future<RouteInfo?> _google(
    http.Client client,
    LatLng o,
    LatLng d,
    double? headingDeg,
  ) async {
    final originLocation = <String, dynamic>{
      'latLng': {'latitude': o.latitude, 'longitude': o.longitude},
    };
    if (headingDeg != null && headingDeg.isFinite) {
      originLocation['heading'] = headingDeg.round() % 360;
    }

    final body = {
      'origin': {'location': originLocation},
      'destination': {
        'location': {
          'latLng': {'latitude': d.latitude, 'longitude': d.longitude},
        },
      },
      'travelMode': 'DRIVE',
      'routingPreference': 'TRAFFIC_AWARE',
      'polylineQuality': 'HIGH_QUALITY',
      'languageCode': 'en-US',
      'units': 'METRIC',
    };

    final res = await client
        .post(
          Uri.https('routes.googleapis.com', '/directions/v2:computeRoutes'),
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': AppEnv.mapsApiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,'
                'routes.distanceMeters,routes.polyline.encodedPolyline,'
                'routes.legs.steps.distanceMeters,'
                'routes.legs.steps.staticDuration,'
                'routes.legs.steps.navigationInstruction',
          },
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 8));

    if (res.statusCode != 200) {
      debugPrint('Routes API HTTP ${res.statusCode}: ${res.body}');
      if (res.statusCode == 401 ||
          res.statusCode == 403 ||
          res.statusCode == 429) {
        _googleBackoffUntil = DateTime.now().add(const Duration(minutes: 3));
      }
      return null;
    }

    final data = jsonDecode(res.body);
    final routes = (data is Map ? data['routes'] : null) as List?;
    if (routes == null || routes.isEmpty) return null;
    final r = routes.first as Map;

    final encoded = r['polyline']?['encodedPolyline']?.toString();
    if (encoded == null || encoded.isEmpty) return null;
    final points = GeoUtils.decodePolyline(encoded);
    if (points.length < 2) return null;

    final steps = <RouteStep>[];
    for (final leg in (r['legs'] as List? ?? const [])) {
      for (final s in (leg['steps'] as List? ?? const [])) {
        final nav = s['navigationInstruction'];
        final text = nav is Map ? nav['instructions']?.toString() : null;
        final man = _googleManeuver(nav is Map ? nav['maneuver']?.toString() : null);
        steps.add(RouteStep(
          instruction: (text == null || text.isEmpty) ? 'Continue' : text,
          maneuver: man,
          distanceM: (s['distanceMeters'] as num?)?.toDouble() ?? 0,
          durationS: _seconds(s['staticDuration']),
        ));
      }
    }
    _markLastAsArrival(steps);

    return RouteInfo(
      points: points,
      distanceM: (r['distanceMeters'] as num?)?.toDouble() ??
          RouteGeometry(points).totalM,
      durationS: _seconds(r['duration']),
      steps: steps,
      source: 'google',
      trafficAware: true,
    );
  }

  static Maneuver _googleManeuver(String? m) {
    switch (m) {
      case 'TURN_SLIGHT_LEFT':
        return Maneuver.slightLeft;
      case 'TURN_SHARP_LEFT':
        return Maneuver.sharpLeft;
      case 'TURN_LEFT':
        return Maneuver.left;
      case 'TURN_SLIGHT_RIGHT':
        return Maneuver.slightRight;
      case 'TURN_SHARP_RIGHT':
        return Maneuver.sharpRight;
      case 'TURN_RIGHT':
        return Maneuver.right;
      case 'UTURN_LEFT':
        return Maneuver.uTurnLeft;
      case 'UTURN_RIGHT':
        return Maneuver.uTurnRight;
      case 'ROUNDABOUT_LEFT':
        return Maneuver.roundaboutLeft;
      case 'ROUNDABOUT_RIGHT':
        return Maneuver.roundaboutRight;
      case 'MERGE':
        return Maneuver.merge;
      case 'FORK_LEFT':
        return Maneuver.forkLeft;
      case 'FORK_RIGHT':
        return Maneuver.forkRight;
      case 'RAMP_LEFT':
        return Maneuver.rampLeft;
      case 'RAMP_RIGHT':
        return Maneuver.rampRight;
      case 'DEPART':
        return Maneuver.depart;
      default:
        return Maneuver.straight;
    }
  }

  /// "123s" / "45.5s" -> 123.0
  static double _seconds(dynamic v) {
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v.replaceAll('s', '')) ?? 0;
    return 0;
  }

  /// Google has no explicit "arrive" step, so the final step's text is
  /// kept but the banner shows a flag-style arrival entry after it.
  void _markLastAsArrival(List<RouteStep> steps) {
    steps.add(const RouteStep(
      instruction: 'You have arrived',
      maneuver: Maneuver.arrive,
      distanceM: 0,
      durationS: 0,
    ));
  }

  // -------------------------------------------------------------------------
  // OSRM fallback
  // -------------------------------------------------------------------------

  Future<RouteInfo?> _osrm(http.Client client, LatLng o, LatLng d) async {
    final url = Uri.parse(
      'https://router.project-osrm.org/route/v1/driving/'
      '${o.longitude},${o.latitude};${d.longitude},${d.latitude}'
      '?overview=full&geometries=polyline6&steps=true',
    );

    final res = await client
        .get(url, headers: {'User-Agent': _userAgent})
        .timeout(const Duration(seconds: 12));
    if (res.statusCode != 200) {
      debugPrint('OSRM HTTP ${res.statusCode}: ${res.body}');
      return null;
    }

    final data = jsonDecode(res.body);
    if (data is! Map || data['code'] != 'Ok') return null;
    final routes = data['routes'] as List?;
    if (routes == null || routes.isEmpty) return null;
    final r = routes.first as Map;

    final points =
        GeoUtils.decodePolyline(r['geometry'].toString(), precision: 6);
    if (points.length < 2) return null;

    final steps = <RouteStep>[];
    for (final leg in (r['legs'] as List? ?? const [])) {
      for (final s in (leg['steps'] as List? ?? const [])) {
        final (man, text) = _osrmInstruction(s as Map);
        final name = s['name']?.toString();
        steps.add(RouteStep(
          instruction: text,
          maneuver: man,
          distanceM: (s['distance'] as num?)?.toDouble() ?? 0,
          durationS: (s['duration'] as num?)?.toDouble() ?? 0,
          street: (name == null || name.isEmpty) ? null : name,
        ));
      }
    }

    return RouteInfo(
      points: points,
      distanceM: (r['distance'] as num?)?.toDouble() ??
          RouteGeometry(points).totalM,
      durationS: (r['duration'] as num?)?.toDouble() ?? 0,
      steps: steps,
      source: 'osrm',
      trafficAware: false,
    );
  }

  static (Maneuver, String) _osrmInstruction(Map step) {
    final m = (step['maneuver'] as Map?) ?? const {};
    final type = m['type']?.toString() ?? '';
    final mod = m['modifier']?.toString() ?? '';
    final name = step['name']?.toString() ?? '';
    final road = name.isEmpty ? 'the road' : name;

    Maneuver byModifier() {
      switch (mod) {
        case 'left':
          return Maneuver.left;
        case 'right':
          return Maneuver.right;
        case 'slight left':
          return Maneuver.slightLeft;
        case 'slight right':
          return Maneuver.slightRight;
        case 'sharp left':
          return Maneuver.sharpLeft;
        case 'sharp right':
          return Maneuver.sharpRight;
        case 'uturn':
          return Maneuver.uTurnLeft;
        default:
          return Maneuver.straight;
      }
    }

    final dir = mod.isEmpty || mod == 'straight' ? 'straight' : mod;

    switch (type) {
      case 'depart':
        return (Maneuver.depart, 'Head out on $road');
      case 'arrive':
        return (Maneuver.arrive, 'You have arrived');
      case 'turn':
      case 'ramp':
      case 'on ramp':
      case 'off ramp':
        if (mod == 'uturn') {
          return (Maneuver.uTurnLeft, 'Make a U-turn onto $road');
        }
        if (dir == 'straight') {
          return (Maneuver.straight, 'Continue straight onto $road');
        }
        return (byModifier(), 'Turn $dir onto $road');
      case 'end of road':
        return (
          byModifier(),
          dir == 'straight'
              ? 'Continue onto $road'
              : 'At the end of the road, turn $dir onto $road'
        );
      case 'merge':
        return (Maneuver.merge, 'Merge onto $road');
      case 'fork':
        final left = mod.contains('left');
        return (
          left ? Maneuver.forkLeft : Maneuver.forkRight,
          'Keep ${left ? 'left' : 'right'} at the fork onto $road'
        );
      case 'roundabout':
      case 'rotary':
      case 'roundabout turn':
        final exit = m['exit'];
        return (
          Maneuver.roundaboutRight,
          exit == null
              ? 'Enter the roundabout and continue onto $road'
              : 'At the roundabout, take exit $exit onto $road'
        );
      case 'exit roundabout':
      case 'exit rotary':
        return (Maneuver.straight, 'Exit the roundabout onto $road');
      case 'new name':
      case 'continue':
        return (
          dir == 'straight' ? Maneuver.straight : byModifier(),
          'Continue onto $road'
        );
      default:
        return (byModifier(), 'Continue on $road');
    }
  }

  void dispose() {
    _client?.close();
    _client = null;
  }
}
