import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:citypulse/utils/format_utils.dart';
import 'package:citypulse/utils/geo_utils.dart';

void main() {
  group('GeoUtils', () {
    test('decodes the Google reference polyline', () {
      final pts = GeoUtils.decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
      expect(pts.length, 3);
      expect(pts[0].latitude, closeTo(38.5, 1e-5));
      expect(pts[0].longitude, closeTo(-120.2, 1e-5));
      expect(pts[2].latitude, closeTo(43.252, 1e-5));
      expect(pts[2].longitude, closeTo(-126.453, 1e-5));
    });

    test('0.01 deg of latitude is about 1.11 km', () {
      final d = GeoUtils.distanceM(
        const LatLng(23.80, 90.40),
        const LatLng(23.81, 90.40),
      );
      expect(d, closeTo(1111, 5));
    });

    test('bearing north and east', () {
      expect(
        GeoUtils.bearing(const LatLng(23.0, 90.0), const LatLng(23.1, 90.0)),
        closeTo(0, 0.5),
      );
      expect(
        GeoUtils.bearing(const LatLng(0.0, 90.0), const LatLng(0.0, 90.1)),
        closeTo(90, 0.5),
      );
    });

    test('offset then distance round-trips', () {
      const start = LatLng(23.80, 90.40);
      final moved = GeoUtils.offset(start, 90, 500);
      expect(GeoUtils.distanceM(start, moved), closeTo(500, 1));
    });
  });

  group('RouteGeometry', () {
    final route = RouteGeometry(const [
      LatLng(23.80, 90.40),
      LatLng(23.81, 90.40),
      LatLng(23.82, 90.40),
    ]);

    test('total length is about 2.2 km', () {
      expect(route.totalM, closeTo(2224, 10));
    });

    test('snaps a point ~10 m beside the road', () {
      final snap = route.snap(const LatLng(23.805, 90.4001));
      expect(snap.segmentIndex, 0);
      expect(snap.offRouteM, closeTo(10.2, 2));
      expect(snap.alongM, closeTo(556, 5));
    });

    test('a far point is reported as far off route', () {
      final snap = route.snap(const LatLng(23.805, 90.41));
      expect(snap.offRouteM, greaterThan(900));
    });
  });

  group('format_utils', () {
    test('distance', () {
      expect(formatDistance(480), '480 m');
      expect(formatDistance(3420), '3.4 km');
      expect(formatDistance(12800), '13 km');
    });

    test('duration', () {
      expect(formatDuration(780), '13 min');
      expect(formatDuration(4320), '1 h 12 min');
    });
  });
}
