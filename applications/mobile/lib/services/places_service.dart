// lib/services/places_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class PlaceSuggestion {
  final String placeId;
  final String description;
  final double lat;
  final double lng;

  PlaceSuggestion({
    required this.placeId,
    required this.description,
    required this.lat,
    required this.lng,
  });

  factory PlaceSuggestion.fromNominatim(Map<String, dynamic> json) {
    return PlaceSuggestion(
      placeId: json['place_id']?.toString() ?? '',
      description: json['display_name'] ?? '',
      lat: double.tryParse(json['lat']?.toString() ?? '') ?? 0.0,
      lng: double.tryParse(json['lon']?.toString() ?? '') ?? 0.0,
    );
  }
}

class PlacesService {
  static const String _userAgent =
      'CityPulseApp/1.0 (NSU Capstone Project CSE499)';

  // Debounce mechanism - cancel previous requests
  http.Client? _client;

  Future<List<PlaceSuggestion>> autocomplete(
    String input, {
    LatLng? bias,
  }) async {
    if (input.trim().isEmpty) return [];

    // Cancel previous request if any
    _client?.close();
    _client = http.Client();

    final params = <String, String>{
      'format': 'json',
      'q': input.trim(),
      'limit': '6',
      'addressdetails': '0',
      'countrycodes': 'bd',
    };

    if (bias != null) {
      const delta = 0.6;
      params['viewbox'] =
          '${bias.longitude - delta},${bias.latitude + delta},'
          '${bias.longitude + delta},${bias.latitude - delta}';
      params['bounded'] = '0';
    }

    final url = Uri.https('nominatim.openstreetmap.org', '/search', params);

    try {
      // Use timeout to prevent hanging
      final response = await _client!
          .get(url, headers: {'User-Agent': _userAgent})
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data
            .map((json) => PlaceSuggestion.fromNominatim(json))
            .toList();
      }
      debugPrint(
        'Nominatim search failed — HTTP ${response.statusCode}: ${response.body}',
      );
      return [];
    } catch (e) {
      debugPrint('Nominatim search error: $e');
      return [];
    } finally {
      _client?.close();
      _client = null;
    }
  }

  Future<List<LatLng>> getDirections(LatLng origin, LatLng destination) async {
    final url = Uri.parse(
      'https://router.project-osrm.org/route/v1/driving/'
      '${origin.longitude},${origin.latitude};'
      '${destination.longitude},${destination.latitude}'
      '?overview=full&geometries=polyline',
    );

    try {
      final response = await http
          .get(url, headers: {'User-Agent': _userAgent})
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['code'] == 'Ok' &&
            (data['routes'] as List).isNotEmpty) {
          final geometry = data['routes'][0]['geometry'] as String;
          return _decodePolyline(geometry);
        }
      }
      debugPrint('OSRM directions failed — HTTP ${response.statusCode}: ${response.body}');
      return [];
    } catch (e) {
      debugPrint('OSRM directions error: $e');
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

  void dispose() {
    _client?.close();
    _client = null;
  }
}
