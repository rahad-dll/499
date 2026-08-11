// lib/services/places_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class PlaceSuggestion {
  final String placeId;
  final String description;

  PlaceSuggestion({required this.placeId, required this.description});

  factory PlaceSuggestion.fromJson(Map<String, dynamic> json) {
    return PlaceSuggestion(
      placeId: json['place_id'] ?? '',
      description: json['description'] ?? '',
    );
  }
}

class PlaceDetails {
  final String name;
  final String address;
  final double lat;
  final double lng;

  PlaceDetails({
    required this.name,
    required this.address,
    required this.lat,
    required this.lng,
  });
}

class PlacesService {
  static const String _apiKey = 'AIzaSyDUZluioZrDAGqMQsZormAVCrUFKEEyerg';
  static const String _baseUrl = 'https://maps.googleapis.com/maps/api/place';

  Future<List<PlaceSuggestion>> autocomplete(
    String input, {
    LatLng? bias,
  }) async {
    if (input.trim().isEmpty) return [];

    final url = Uri.parse(
      '$_baseUrl/autocomplete/json?input=$input&key=$_apiKey'
      '${bias != null ? '&location=${bias.latitude},${bias.longitude}&radius=50000' : ''}'
    );

    try {
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'OK' || data['status'] == 'ZERO_RESULTS') {
          final predictions = data['predictions'] as List? ?? [];
          return predictions
              .map((json) => PlaceSuggestion.fromJson(json))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Places autocomplete error: $e');
      return [];
    }
  }

  Future<PlaceDetails?> getPlaceDetails(String placeId) async {
    final url = Uri.parse(
      '$_baseUrl/details/json?place_id=$placeId&key=$_apiKey'
    );

    try {
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'OK') {
          final result = data['result'];
          final location = result['geometry']['location'];
          return PlaceDetails(
            name: result['name'] ?? '',
            address: result['formatted_address'] ?? '',
            lat: location['lat'] ?? 0.0,
            lng: location['lng'] ?? 0.0,
          );
        }
      }
      return null;
    } catch (e) {
      debugPrint('Place details error: $e');
      return null;
    }
  }

  Future<List<LatLng>> getDirections(LatLng origin, LatLng destination) async {
    final url = Uri.parse(
      'https://maps.googleapis.com/maps/api/directions/json?'
      'origin=${origin.latitude},${origin.longitude}'
      '&destination=${destination.latitude},${destination.longitude}'
      '&key=$_apiKey'
    );

    try {
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'OK') {
          final route = data['routes'][0];
          final overviewPolyline = route['overview_polyline']['points'];
          return _decodePolyline(overviewPolyline);
        }
      }
      return [];
    } catch (e) {
      debugPrint('Directions error: $e');
      return [];
    }
  }

  List<LatLng> _decodePolyline(String encoded) {
    List<LatLng> points = [];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return points;
  }
}
