// lib/services/device_session_service.dart
//
// GET    /auth/sessions        -> list of active (not revoked/expired) sessions
// DELETE /auth/sessions/{id}   -> revoke one of them
import 'dart:convert';

import '../models/device_session_model.dart';
import 'api_service.dart';
import 'authed_http.dart';

class DeviceSessionService {
  Future<List<DeviceSession>> fetchSessions() async {
    final response = await AuthedHttp.get('/auth/sessions');

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);

      List<dynamic> rows = const [];
      if (data is List) {
        rows = data;
      } else if (data is Map && data['data'] is List) {
        rows = data['data'] as List;
      }

      return rows
          .whereType<Map<String, dynamic>>()
          .map(DeviceSession.fromJson)
          .where((s) => s.id.isNotEmpty)
          .toList();
    }
    if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    }
    throw Exception(
      '${ApiService.extractErrorMessage(response)} (HTTP ${response.statusCode})',
    );
  }

  Future<void> revoke(String sessionId) async {
    final response = await AuthedHttp.delete('/auth/sessions/$sessionId');
    if (response.statusCode == 200 || response.statusCode == 204) return;
    if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    }
    throw Exception(
      '${ApiService.extractErrorMessage(response)} (HTTP ${response.statusCode})',
    );
  }
}
