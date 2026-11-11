// lib/services/authed_http.dart
//
// Authenticated GET/POST/DELETE helper with ONE automatic refresh-and-retry:
// if the backend answers 401 we call POST /auth/refresh once and replay
// the same request with the new access token.
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_service.dart';
import 'auth_service.dart';
import 'session_service.dart';

class AuthedHttp {
  AuthedHttp._();

  // Render free tier cold start can take 30-60s on the first request.
  static const Duration _timeout = Duration(seconds: 60);

  static Future<http.Response> get(String path) => _send('GET', path);

  static Future<http.Response> delete(String path) => _send('DELETE', path);

  /// POST with a JSON body (pass null / omit for an empty body).
  static Future<http.Response> post(String path, [Map<String, dynamic>? body]) =>
      _send('POST', path, body: body);

  static Future<http.Response> _once(
    String method,
    String path,
    Map<String, dynamic>? body,
  ) async {
    final token = await SessionService.getAccessToken();
    final uri = Uri.parse('${ApiService.baseUrl}$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };

    final Future<http.Response> future;
    switch (method) {
      case 'DELETE':
        future = http.delete(uri, headers: headers);
        break;
      case 'POST':
        future = http.post(
          uri,
          headers: headers,
          body: jsonEncode(body ?? <String, dynamic>{}),
        );
        break;
      default:
        future = http.get(uri, headers: headers);
    }
    return future.timeout(_timeout);
  }

  static Future<http.Response> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    var response = await _once(method, path, body);
    if (response.statusCode == 401) {
      final refreshed = await AuthService.refresh();
      if (refreshed) {
        response = await _once(method, path, body);
      }
    }
    return response;
  }
}