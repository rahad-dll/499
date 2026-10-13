// lib/services/parking_api_service.dart
import 'dart:convert';

import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../models/parking_model.dart';

/// `/spaces/nearby` endpoint-এর wrapper।
/// TODO(499B security): baseUrl পরে environment config এ সরাবে।
class ParkingApiService {
  static const String baseUrl = 'https://four99-b6wg.onrender.com';

  http.Client? _client;

  /// কাছের parking আনে, দূরত্ব অনুযায়ী sort করে।
  /// Non-200 হলে খালি list। Network error হলে exception ছোড়ে।
  Future<List<ParkingModel>> fetchNearby(LatLng center) async {
    _client?.close();
    final client = http.Client();
    _client = client;

    try {
      final url = Uri.parse(
        '$baseUrl/spaces/nearby?lat=${center.latitude}&lng=${center.longitude}',
      );

      final response = await client
          .get(url, headers: {'Content-Type': 'application/json'})
          .timeout(const Duration(seconds: 20));

      if (response.statusCode != 200) return [];

      final data = jsonDecode(response.body);
      List<dynamic> spaces = [];
      if (data is List) {
        spaces = data;
      } else if (data is Map && data['data'] is List) {
        spaces = data['data'] as List<dynamic>;
      }

      final parkings = spaces
          .whereType<Map<String, dynamic>>()
          .map((json) => ParkingModel.fromJson(json))
          .toList();
      parkings.sort((a, b) => a.distance.compareTo(b.distance));
      return parkings;
    } finally {
      client.close();
      if (identical(_client, client)) _client = null;
    }
  }

  void dispose() {
    _client?.close();
    _client = null;
  }
}