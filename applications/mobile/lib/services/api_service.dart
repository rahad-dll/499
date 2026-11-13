import 'dart:convert';
import 'package:http/http.dart' as http;
import 'session_service.dart';

class ApiService {
  // Live backend confirmed by team lead (Rahad)
  static const String baseUrl = 'https://four99-b6wg.onrender.com';

  static Uri _uri(String path) => Uri.parse('$baseUrl$path');

  // Render free tier cold start can take 30-60s; never wait forever.
  static const Duration _timeout = Duration(seconds: 60);

  static Future<Map<String, String>> _headers({bool withAuth = false}) async {
    final headers = {'Content-Type': 'application/json'};
    if (withAuth) {
      final token = await SessionService.getAccessToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  static Future<http.Response> post(
    String path,
    Map<String, dynamic> body, {
    bool withAuth = false,
  }) async {
    return http
        .post(
          _uri(path),
          headers: await _headers(withAuth: withAuth),
          body: jsonEncode(body),
        )
        .timeout(_timeout);
  }

  static Future<http.Response> get(String path, {bool withAuth = true}) async {
    return http
        .get(_uri(path), headers: await _headers(withAuth: withAuth))
        .timeout(_timeout);
  }

  static Future<http.Response> patch(
    String path,
    Map<String, dynamic> body, {
    bool withAuth = true,
  }) async {
    return http
        .patch(
          _uri(path),
          headers: await _headers(withAuth: withAuth),
          body: jsonEncode(body),
        )
        .timeout(_timeout);
  }

  static Future<http.Response> delete(String path, {bool withAuth = true}) async {
    return http
        .delete(_uri(path), headers: await _headers(withAuth: withAuth))
        .timeout(_timeout);
  }

  /// Pulls a readable message out of a NestJS-style error response,
  /// e.g. { "message": "Invalid credentials", "statusCode": 401 }
  /// or   { "message": ["email must be an email"], "statusCode": 400 }
  static String extractErrorMessage(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['message'] != null) {
        final msg = decoded['message'];
        if (msg is List) return msg.join(', ');
        return msg.toString();
      }
    } catch (_) {
      // response wasn't JSON, fall through
    }
    return 'Something went wrong (status ${response.statusCode})';
  }
}