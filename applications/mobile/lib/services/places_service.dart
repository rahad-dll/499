// lib/services/places_service.dart
//
// Real location search (Places Autocomplete + Details) এবং real
// navigation route (Directions polyline) — সব এখানে। GoogleMapsApiKey
// AppEnv থেকে আসে, কোথাও hardcode নাই।

import 'dart:convert';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import '../config/env.dart';

class PlaceSuggestion {
  final String placeId;
  final String description;
  PlaceSuggestion({required this.placeId, required this.description});
}

class PlaceLocation {
  final double lat;
  final double lng;
  final String name;
  final String address;
  PlaceLocation({
    required this.lat,
    required this.lng,
    required this.name,
    required this.address,
  });
}

class DirectionsResult {
  final List<LatLng> points;
  DirectionsResult({required this.points});
}

class PlacesService {
  static const String _base = 'https://maps.googleapis.com/maps/api';
  String get _key => AppEnv.mapsApiKey;

  Future<List<PlaceSuggestion>> autocomplete(String input, {LatLng? bias}) async {
    if (input.trim().isEmpty || _key.isEmpty) return [];
    final biasParam = bias != null ? '&location=${bias.latitude},${bias.longitude}&radius=30000' : '';
    final uri = Uri.parse(
      '$_base/place/autocomplete/json?input=${Uri.encodeComponent(input)}$biasParam&key=$_key',
    );
    final res = await http.get(uri);
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body);
    if (data['status'] != 'OK') return [];
    final predictions = data['predictions'] as List;
    return predictions
        .map((p) => PlaceSuggestion(
              placeId: p['place_id'],
              description: p['description'],
            ))
        .toList();
  }

  Future<PlaceLocation?> getPlaceDetails(String placeId) async {
    if (_key.isEmpty) return null;
    final uri = Uri.parse(
      '$_base/place/details/json?place_id=$placeId&fields=geometry,name,formatted_address&key=$_key',
    );
    final res = await http.get(uri);
    if (res.statusCode != 200) return null;
    final data = jsonDecode(res.body);
    if (data['status'] != 'OK') return null;
    final result = data['result'];
    final loc = result['geometry']['location'];
    return PlaceLocation(
      lat: (loc['lat'] as num).toDouble(),
      lng: (loc['lng'] as num).toDouble(),
      name: result['name'] ?? '',
      address: result['formatted_address'] ?? '',
    );
  }

  Future<DirectionsResult?> getDirections(LatLng origin, LatLng destination) async {
    if (_key.isEmpty) return null;
    final polylinePoints = PolylinePoints();
    final result = await polylinePoints.getRouteBetweenCoordinates(
      googleApiKey: _key,
      request: PolylineRequest(
        origin: PointLatLng(origin.latitude, origin.longitude),
        destination: PointLatLng(destination.latitude, destination.longitude),
        mode: TravelMode.driving,
      ),
    );
    if (result.points.isEmpty) return null;
    final points = result.points.map((p) => LatLng(p.latitude, p.longitude)).toList();
    return DirectionsResult(points: points);
  }
}