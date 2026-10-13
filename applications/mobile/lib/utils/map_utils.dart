// lib/utils/map_utils.dart
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// কিছু point-এর চারপাশে ১২% padding সহ bounds বের করে।
LatLngBounds boundsFromPoints(List<LatLng> points) {
  double minLat = points.first.latitude, maxLat = points.first.latitude;
  double minLng = points.first.longitude, maxLng = points.first.longitude;

  for (final p in points) {
    minLat = p.latitude < minLat ? p.latitude : minLat;
    maxLat = p.latitude > maxLat ? p.latitude : maxLat;
    minLng = p.longitude < minLng ? p.longitude : minLng;
    maxLng = p.longitude > maxLng ? p.longitude : maxLng;
  }

  final latPadding = (maxLat - minLat) * 0.12;
  final lngPadding = (maxLng - minLng) * 0.12;

  return LatLngBounds(
    southwest: LatLng(minLat - latPadding, minLng - lngPadding),
    northeast: LatLng(maxLat + latPadding, maxLng + lngPadding),
  );
}