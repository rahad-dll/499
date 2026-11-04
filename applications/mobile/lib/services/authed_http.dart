// lib/services/authed_http.dart
//
// Authenticated GET/DELETE helper with ONE automatic refresh-and-retry:
// if the backend answers 401 we call POST /auth/refresh once and replay
// the same request with the new access token.
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

  static Future<http.Response> _once(String method, String path) async {
    final token = await SessionService.getAccessToken();
    final uri = Uri.parse('${ApiService.baseUrl}$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final future = method == 'DELETE'
        ? http.delete(uri, headers: headers)
        : http.get(uri, headers: headers);
    return future.timeout(_timeout);
  }

  static Future<http.Response> _send(String method, String path) async {
    var response = await _once(method, path);
    if (response.statusCode == 401) {
      final refreshed = await AuthService.refresh();
      if (refreshed) {
        response = await _once(method, path);
      }
    }
    return response;
  }
}
