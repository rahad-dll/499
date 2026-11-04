// lib/utils/geo_utils.dart
//
// Pure geometry helpers used by routing + turn-by-turn navigation.
// No Flutter widgets in here, so it is easy to unit-test.
import 'dart:math' as math;

import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Result of snapping a GPS fix onto a route polyline.
class RouteSnap {
  const RouteSnap({
    required this.point,
    required this.offRouteM,
    required this.segmentIndex,
    required this.alongM,
  });

  /// Closest point on the route.
  final LatLng point;

  /// Distance between the GPS fix and [point] (metres).
  final double offRouteM;

  /// Index `i` of the segment `points[i] -> points[i+1]` the fix snapped to.
  final int segmentIndex;

  /// Distance travelled along the route from its start (metres).
  final double alongM;
}

class GeoUtils {
  GeoUtils._();

  static const double earthRadiusM = 6371008.8;
  static const double _mPerDegLat = earthRadiusM * math.pi / 180.0;

  static double rad(double deg) => deg * math.pi / 180.0;
  static double deg(double rad) => rad * 180.0 / math.pi;

  /// Great-circle distance in metres (haversine).
  static double distanceM(LatLng a, LatLng b) {
    final dLat = rad(b.latitude - a.latitude);
    final dLng = rad(b.longitude - a.longitude);
    final h = math.pow(math.sin(dLat / 2), 2) +
        math.cos(rad(a.latitude)) *
            math.cos(rad(b.latitude)) *
            math.pow(math.sin(dLng / 2), 2);
    return 2 * earthRadiusM * math.asin(math.min(1.0, math.sqrt(h)));
  }

  /// Initial bearing a -> b in degrees [0, 360).
  static double bearing(LatLng a, LatLng b) {
    final p1 = rad(a.latitude);
    final p2 = rad(b.latitude);
    final dl = rad(b.longitude - a.longitude);
    final y = math.sin(dl) * math.cos(p2);
    final x = math.cos(p1) * math.sin(p2) -
        math.sin(p1) * math.cos(p2) * math.cos(dl);
    return (deg(math.atan2(y, x)) + 360.0) % 360.0;
  }

  /// Point [meters] away from [from] in direction [bearingDeg].
  static LatLng offset(LatLng from, double bearingDeg, double meters) {
    final d = meters / earthRadiusM;
    final br = rad(bearingDeg);
    final p1 = rad(from.latitude);
    final l1 = rad(from.longitude);
    final p2 = math.asin(
      math.sin(p1) * math.cos(d) + math.cos(p1) * math.sin(d) * math.cos(br),
    );
    final l2 = l1 +
        math.atan2(
          math.sin(br) * math.sin(d) * math.cos(p1),
          math.cos(d) - math.sin(p1) * math.sin(p2),
        );
    return LatLng(deg(p2), ((deg(l2) + 540.0) % 360.0) - 180.0);
  }

  /// Decodes a Google/OSRM encoded polyline. [precision] is 5 for Google
  /// `encodedPolyline`, 6 for OSRM `polyline6`.
  static List<LatLng> decodePolyline(String encoded, {int precision = 5}) {
    final factor = math.pow(10, precision).toDouble();
    final points = <LatLng>[];
    var index = 0;
    var lat = 0;
    var lng = 0;

    while (index < encoded.length) {
      var shift = 0;
      var result = 0;
      int b;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < encoded.length);
      lat += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < encoded.length);
      lng += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);

      points.add(LatLng(lat / factor, lng / factor));
    }
    return points;
  }
}

/// A route polyline with cumulative distances, so we can answer
/// "how far along the route is this GPS fix?" quickly.
class RouteGeometry {
  RouteGeometry(this.points) : cum = _cumulative(points);

  final List<LatLng> points;

  /// cum[i] = metres from the start to points[i].
  final List<double> cum;

  double get totalM => cum.isEmpty ? 0.0 : cum.last;

  static List<double> _cumulative(List<LatLng> pts) {
    final out = List<double>.filled(pts.length, 0.0);
    for (var i = 1; i < pts.length; i++) {
      out[i] = out[i - 1] + GeoUtils.distanceM(pts[i - 1], pts[i]);
    }
    return out;
  }

  /// Snaps [p] onto the route. Searches a window of segments around
  /// [hintSegment] first (fast path while driving), then falls back to
  /// the whole route if the fix is far from that window.
  RouteSnap snap(LatLng p, {int hintSegment = 0, int window = 80}) {
    if (points.length < 2) {
      final only = points.isEmpty ? p : points.first;
      return RouteSnap(
        point: only,
        offRouteM: GeoUtils.distanceM(p, only),
        segmentIndex: 0,
        alongM: 0,
      );
    }

    final last = points.length - 2;
    final hint = hintSegment.clamp(0, last).toInt();
    final from = math.max(0, hint - 3);
    final to = math.min(last, hint + window);

    var best = _scan(p, from, to);
    if (best.offRouteM > 60 && (from > 0 || to < last)) {
      final full = _scan(p, 0, last);
      if (full.offRouteM < best.offRouteM) best = full;
    }
    return best;
  }

  RouteSnap _scan(LatLng p, int from, int to) {
    final mPerDegLng = GeoUtils._mPerDegLat * math.cos(GeoUtils.rad(p.latitude));

    var bestD = double.infinity;
    var bestI = from;
    var bestT = 0.0;

    for (var i = from; i <= to; i++) {
      final a = points[i];
      final b = points[i + 1];
      // Local flat-earth coordinates with the GPS fix at the origin.
      final ax = (a.longitude - p.longitude) * mPerDegLng;
      final ay = (a.latitude - p.latitude) * GeoUtils._mPerDegLat;
      final bx = (b.longitude - p.longitude) * mPerDegLng;
      final by = (b.latitude - p.latitude) * GeoUtils._mPerDegLat;
      final dx = bx - ax;
      final dy = by - ay;
      final len2 = dx * dx + dy * dy;
      final t = len2 == 0
          ? 0.0
          : (-(ax * dx + ay * dy) / len2).clamp(0.0, 1.0).toDouble();
      final px = ax + t * dx;
      final py = ay + t * dy;
      final d = math.sqrt(px * px + py * py);
      if (d < bestD) {
        bestD = d;
        bestI = i;
        bestT = t;
      }
    }

    final a = points[bestI];
    final b = points[bestI + 1];
    final snapped = LatLng(
      a.latitude + (b.latitude - a.latitude) * bestT,
      a.longitude + (b.longitude - a.longitude) * bestT,
    );
    final segLen = cum[bestI + 1] - cum[bestI];
    return RouteSnap(
      point: snapped,
      offRouteM: bestD,
      segmentIndex: bestI,
      alongM: cum[bestI] + segLen * bestT,
    );
  }
}
