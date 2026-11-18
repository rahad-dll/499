// lib/services/authed_http.dart
//
// Authenticated GET/POST/PATCH/PUT/DELETE helper with ONE automatic
// refresh-and-retry: if the backend answers 401 we call POST /auth/refresh
// once and replay the same request with the new access token.
import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_service.dart';
import 'auth_service.dart';
import 'session_expiry.dart';
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

    // shared keep-alive client (see ApiService.client)
    final client = ApiService.client;
    final Future<http.Response> future;
    switch (method) {
      case 'DELETE':
        future = client.delete(uri, headers: headers);
        break;
      case 'POST':
        future = client.post(uri, headers: headers, body: encoded);
        break;
      case 'PATCH':
        future = client.patch(uri, headers: headers, body: encoded);
        break;
      case 'PUT':
        future = client.put(uri, headers: headers, body: encoded);
        break;
      default:
        future = client.get(uri, headers: headers);
    }
    try {
      return await future.timeout(_timeout);
    } on TimeoutException {
      throw const ApiException(
        'The server is taking too long to answer. Please try again.',
        isNetwork: true,
      );
    } on http.ClientException {
      // no internet, DNS failure, connection dropped...
      throw const ApiException(
        'No internet connection. Check your network and try again.',
        isNetwork: true,
      );
    }
  }

  /// Answers that mean "the server is overloaded right now".
  static bool _isBusy(int statusCode) =>
      statusCode == 429 ||
      statusCode == 502 ||
      statusCode == 503 ||
      statusCode == 504;

  /// How long to wait before repeating a busy GET: the server's
  /// Retry-After (max 5 s) or 1 s, 2 s.
  static Duration _retryDelay(http.Response response, int attempt) {
    final header = int.tryParse(response.headers['retry-after'] ?? '');
    if (header != null && header > 0) {
      return Duration(seconds: header > 5 ? 5 : header);
    }
    return Duration(seconds: attempt);
  }

  static Future<http.Response> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    var response = await _once(method, path, body);

    // A busy server (429 / 502 / 503 / 504) usually recovers in a moment.
    // Only GET is repeated: it changes nothing, so repeating it is safe;
    // a POST / PATCH / DELETE could run twice.
    if (method == 'GET') {
      for (var attempt = 1; attempt <= 2 && _isBusy(response.statusCode); attempt++) {
        await Future<void>.delayed(_retryDelay(response, attempt));
        response = await _once(method, path, body);
      }
    }

    if (response.statusCode == 401) {
      final refreshed = await AuthService.refresh();
      if (refreshed) {
        response = await _once(method, path, body);
      } else if (AuthService.lastRefreshRejected) {
        // The server refused the refresh token: this login is over
        // (revoked on another device, password reset, or expired).
        SessionExpiry.notify();
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

  /// True when the request never got an answer (offline / timeout).
  final bool isNetwork;

  const ApiException(this.message, {this.statusCode, this.isNetwork = false});

  bool get isUnauthorized => statusCode == 401;
  bool get isConflict => statusCode == 409;

  /// Builds the exception from a failed response with the server message.
  factory ApiException.fromResponse(http.Response response) {
    if (response.statusCode == 401) {
      // Not every 401 is a dead login: the backend also answers 401 with
      // its own reason (e.g. "Payments are not configured"). Only the
      // plain "Unauthorized" of the token check means the session ended.
      final message = ApiService.extractErrorMessage(response);
      final lower = message.toLowerCase();
      final isTokenError =
          lower == 'unauthorized' || lower.startsWith('something went wrong');
      return ApiException(
        isTokenError ? 'Session expired. Please sign in again.' : message,
        statusCode: 401,
      );
    }
    if (response.statusCode == 429) {
      return const ApiException(
        'Too many requests. Please wait a moment and try again.',
        statusCode: 429,
      );
    }
    final text = ApiService.extractErrorMessage(response);
    // 5xx without a readable JSON message (e.g. the host's HTML error page)
    if (response.statusCode >= 500 &&
        (text.startsWith('Something went wrong') ||
            text.toLowerCase() == 'internal server error')) {
      return ApiException(
        'The server is busy right now. Please try again in a moment.',
        statusCode: response.statusCode,
      );
    }
    return ApiException(text, statusCode: response.statusCode);
  }

  @override
  String toString() => message;
}
