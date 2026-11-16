// lib/services/parking_api_service.dart
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../models/parking_model.dart';

/// `/spaces/nearby` endpoint-এর wrapper।
/// TODO(499B security): baseUrl পরে environment config এ সরাবে।
class ParkingApiService {
  static const String baseUrl = 'https://four99-b6wg.onrender.com';

  http.Client? _client;

  /// Most lots drawn at once. A dense area can return hundreds of lots;
  /// that many map pins and cards make the map stutter on normal phones.
  /// The nearest ones are kept.
  static const int maxLots = 100;

  /// Bodies larger than this are decoded off the UI thread.
  static const int _isolateThreshold = 100 * 1024;

  /// কাছের parking আনে, দূরত্ব অনুযায়ী sort করে।
  /// Server error (non-200) বা network error হলে exception ছোড়ে, যাতে
  /// dashboard আগের pin গুলো রেখে দেয় (খালি map দেখায় না)।
  /// [radiusKm] is the search radius the driver picked (backend default 5).
  Future<List<ParkingModel>> fetchNearby(
    LatLng center, {
    double radiusKm = 5,
  }) async {
    _client?.close();
    final client = http.Client();
    _client = client;

    try {
      final url = Uri.parse(
        '$baseUrl/spaces/nearby?lat=${center.latitude}&lng=${center.longitude}'
        '&radiusKm=$radiusKm',
      );

      final response = await client
          .get(url, headers: {'Content-Type': 'application/json'})
          .timeout(const Duration(seconds: 20));

      // A failing / overloaded server must not look like "no parking here":
      // throwing lets the dashboard keep the pins it already has.
      if (response.statusCode != 200) {
        throw Exception('GET /spaces/nearby -> ${response.statusCode}');
      }

      // Every lot comes with all of its slots, so the body can be large.
      // Decoding a large body on the UI thread freezes the map for a
      // moment, so it is done in a background isolate.
      final body = response.body;
      final dynamic data = body.length > _isolateThreshold
          ? await compute(jsonDecode, body)
          : jsonDecode(body);
      List<dynamic> spaces = [];
      if (data is List) {
        spaces = data;
      } else if (data is Map && data['data'] is List) {
        spaces = data['data'] as List<dynamic>;
      }

      // /spaces/nearby also returns pending / inactive lots. A driver can't
      // open (GET /spaces/{id} → 404) or book them, so only approved
      // (status "active") lots are shown.
      final parkings = <ParkingModel>[];
      for (final row in spaces) {
        if (row is! Map) continue;
        try {
          final p = ParkingModel.fromJson(Map<String, dynamic>.from(row));
          if (p.status == 'active' && p.id.isNotEmpty) parkings.add(p);
        } catch (e) {
          // one broken row must not hide every other lot
          debugPrint('Skipped a /spaces/nearby row: $e');
        }
      }
      parkings.sort((a, b) => a.distance.compareTo(b.distance));
      return parkings.length > maxLots
          ? parkings.sublist(0, maxLots)
          : parkings;
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