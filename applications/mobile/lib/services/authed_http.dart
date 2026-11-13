// lib/services/authed_http.dart
//
// Authenticated GET/POST/PATCH/PUT/DELETE helper with ONE automatic
// refresh-and-retry: if the backend answers 401 we call POST /auth/refresh
// once and replay the same request with the new access token.
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

  /// PATCH with a JSON body (pass null / omit for an empty body).
  static Future<http.Response> patch(String path, [Map<String, dynamic>? body]) =>
      _send('PATCH', path, body: body);

  /// PUT with a JSON body.
  static Future<http.Response> put(String path, [Map<String, dynamic>? body]) =>
      _send('PUT', path, body: body);

  /// Builds "path?key=value&..." skipping null / empty values.
  static String withQuery(String path, Map<String, String?> query) {
    final parts = <String>[];
    query.forEach((key, value) {
      if (value != null && value.isNotEmpty) {
        parts.add(
          '${Uri.encodeQueryComponent(key)}=${Uri.encodeQueryComponent(value)}',
        );
      }
    });
    if (parts.isEmpty) return path;
    return '$path?${parts.join('&')}';
  }

  static Future<http.Response> _once(
    String method,
    String path,
    Map<String, dynamic>? body,
  ) async {
    final token = await SessionService.getAccessToken();
    final uri = Uri.parse('${ApiService.baseUrl}$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final encoded = jsonEncode(body ?? <String, dynamic>{});

    final Future<http.Response> future;
    switch (method) {
      case 'DELETE':
        future = http.delete(uri, headers: headers);
        break;
      case 'POST':
        future = http.post(uri, headers: headers, body: encoded);
        break;
      case 'PATCH':
        future = http.patch(uri, headers: headers, body: encoded);
        break;
      case 'PUT':
        future = http.put(uri, headers: headers, body: encoded);
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

  /// Decodes a JSON body, returning null when it is empty or not JSON.
  static dynamic decode(http.Response response) {
    final body = response.body.trim();
    if (body.isEmpty) return null;
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }

  static bool isOk(http.Response response) =>
      response.statusCode >= 200 && response.statusCode < 300;
}

/// Error thrown by the API services. [statusCode] lets the UI react to a
/// specific answer (e.g. 409 = conflict / already done).
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  const ApiException(this.message, {this.statusCode});

  bool get isUnauthorized => statusCode == 401;
  bool get isConflict => statusCode == 409;

  /// Builds the exception from a failed response with the server message.
  factory ApiException.fromResponse(http.Response response) {
    if (response.statusCode == 401) {
      return const ApiException(
        'Session expired. Please sign in again.',
        statusCode: 401,
      );
    }
    return ApiException(
      ApiService.extractErrorMessage(response),
      statusCode: response.statusCode,
    );
  }

  @override
  String toString() => message;
}
