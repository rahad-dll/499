// lib/services/space_service.dart
//
// GET /spaces/{id}                         -> full space details
// GET /spaces/{id}/photos/{photoId}/presign -> short-lived photo URL
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../models/space_detail_model.dart';
import 'api_service.dart';
import 'authed_http.dart';

class SpaceService {
  Future<SpaceDetailModel> getSpace(String spaceId) async {
    final response = await AuthedHttp.get('/spaces/$spaceId');

    // Debug: shows up in the `flutter run` terminal so the real backend
    // response can be inspected (remove once the shape is confirmed).
    debugPrint('GET /spaces/$spaceId -> ${response.statusCode}');
    debugPrint('BODY: ${response.body}');

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        return SpaceDetailModel.fromJson(data);
      }
      throw Exception('Unexpected response from server');
    }
    if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    }
    throw Exception(
      '${ApiService.extractErrorMessage(response)} (HTTP ${response.statusCode})',
    );
  }

  /// Returns a temporary image URL, or null if it can't be resolved.
  /// The response key isn't documented in Swagger, so a few spellings are
  /// tried; a plain-string body is accepted too.
  Future<String?> presignPhoto(String spaceId, String photoId) async {
    try {
      final response =
          await AuthedHttp.get('/spaces/$spaceId/photos/$photoId/presign');
      if (response.statusCode != 200) return null;

      final body = response.body.trim();
      if (body.startsWith('http')) return body;

      final data = jsonDecode(body);
      if (data is String && data.startsWith('http')) return data;
      if (data is Map) {
        final inner = data['data'] is Map ? data['data'] as Map : data;
        for (final key in const [
          'url',
          'presigned_url',
          'presignedUrl',
          'signed_url',
          'signedUrl',
        ]) {
          final v = inner[key]?.toString();
          if (v != null && v.startsWith('http')) return v;
        }
      }
    } catch (_) {
      // fall through -> null
    }
    return null;
  }
}