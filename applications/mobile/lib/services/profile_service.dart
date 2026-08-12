// lib/services/profile_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';
import 'session_service.dart';
import 'auth_service.dart';

class ProfileService {
  static const String _baseUrl = 'https://four99-b6wg.onrender.com';

  Future<Map<String, dynamic>> getProfile() async {
    try {
      final token = await SessionService.getAccessToken();
      if (token == null) {
        throw Exception('No access token found');
      }

      final response = await http.get(
        Uri.parse('$_baseUrl/profiles/me'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else if (response.statusCode == 401) {
        // Try to refresh token
        final refreshed = await AuthService.refresh();
        if (refreshed) {
          // Retry with new token
          return getProfile();
        }
        throw Exception('Session expired. Please login again.');
      } else {
        throw Exception('Failed to load profile: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    try {
      final token = await SessionService.getAccessToken();
      if (token == null) {
        throw Exception('No access token found');
      }

      final response = await http.patch(
        Uri.parse('$_baseUrl/profiles/me'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(data),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else if (response.statusCode == 401) {
        final refreshed = await AuthService.refresh();
        if (refreshed) {
          return updateProfile(data);
        }
        throw Exception('Session expired. Please login again.');
      } else {
        throw Exception('Failed to update profile: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
}