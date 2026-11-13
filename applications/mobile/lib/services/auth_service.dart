// lib/services/auth_service.dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'session_service.dart';
import '../models/auth_response.dart';
import '../models/user_model.dart';

class AuthResult {
  final bool success;
  final AuthResponse? data;
  final String? error;

  AuthResult.success(this.data)
      : success = true,
        error = null;

  AuthResult.failure(this.error)
      : success = false,
        data = null;
}

/// Result of the password endpoints (forgot / reset / change).
class PasswordResult {
  final bool success;
  final String? message; // server message on success
  final String? error; // readable error on failure
  final int signedOutSessions; // only set by change-password

  PasswordResult.success({this.message, this.signedOutSessions = 0})
      : success = true,
        error = null;

  PasswordResult.failure(this.error)
      : success = false,
        message = null,
        signedOutSessions = 0;
}

class AuthService {
  static const bool useLocalMock = false;
  static const _keyLocalUsers = 'cp_local_users';

  // ---------------- REGISTER ----------------

  static Future<AuthResult> register({
    required String email,
    required String password,
    required String phone,
    required String role,
    String? fullName,
    String? areaId,
    String? dateOfBirth,
    String? drivingLicenceNo,
    String? licenceType,
    String? businessName,
    String? address,
    String? nationalId,
    String? passportNo,
    String? organization,
    String? badgeNumber,
  }) async {
    if (useLocalMock) {
      return _localRegister(
        email: email,
        password: password,
        phone: phone,
        role: role,
        fullName: fullName,
      );
    }

    final body = {
      'email': email,
      'password': password,
      'phone': phone,
      'role': role,
      if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
      if (areaId != null && areaId.isNotEmpty) 'area_id': areaId,
      if (dateOfBirth != null && dateOfBirth.isNotEmpty)
        'date_of_birth': dateOfBirth,
      if (drivingLicenceNo != null && drivingLicenceNo.isNotEmpty)
        'driving_licence_no': drivingLicenceNo,
      if (licenceType != null && licenceType.isNotEmpty)
        'licence_type': licenceType,
      if (businessName != null && businessName.isNotEmpty)
        'business_name': businessName,
      if (address != null && address.isNotEmpty) 'address': address,
      if (nationalId != null && nationalId.isNotEmpty)
        'national_id': nationalId,
      if (passportNo != null && passportNo.isNotEmpty)
        'passport_no': passportNo,
      if (organization != null && organization.isNotEmpty)
        'organization': organization,
      if (badgeNumber != null && badgeNumber.isNotEmpty)
        'badge_number': badgeNumber,
    };

    try {
      final response = await ApiService.post('/auth/register', body);
      debugPrint('REGISTER -> ${response.statusCode}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded =
            response.body.trim().isEmpty ? null : jsonDecode(response.body);
        final json = decoded is Map<String, dynamic>
            ? decoded
            : <String, dynamic>{};

        // The backend answers { message, user_id } (no tokens): the user
        // signs in afterwards. Only keep a session if tokens did come back,
        // otherwise an empty session would open the dashboard with no token.
        final user = User(
          id: (json['user_id'] ?? json['id'] ?? '').toString(),
          email: email,
          phone: phone,
          role: role,
          fullName: fullName,
        );
        final auth = AuthResponse(
          accessToken: (json['access_token'] ?? json['accessToken'] ?? '')
              .toString(),
          refreshToken:
              (json['refresh_token'] ?? json['refreshToken'])?.toString(),
          user: user,
        );
        if (auth.accessToken.isNotEmpty) {
          await SessionService.saveTokens(auth.accessToken, auth.refreshToken);
          await SessionService.saveSession(user, true);
        }
        return AuthResult.success(auth);
      }
      return AuthResult.failure(ApiService.extractErrorMessage(response));
    } catch (e) {
      return AuthResult.failure('Network error: could not reach server');
    }
  }

  // ---------------- LOGIN ----------------

  static Future<AuthResult> login({
    required String email,
    required String password,
    String? deviceName,
    bool rememberMe = false,
  }) async {
    if (useLocalMock) {
      return _localLogin(email: email, password: password, rememberMe: rememberMe);
    }

    final body = {
      'email': email,
      'password': password,
      if (deviceName != null && deviceName.isNotEmpty)
        'device_name': deviceName,
    };

    try {
      final response = await ApiService.post('/auth/login', body);
      debugPrint('LOGIN -> ${response.statusCode}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final tokens = AuthResponse.fromJson(json);
        if (tokens.accessToken.isEmpty) {
          return AuthResult.failure('Login failed: no access token received');
        }
        await SessionService.saveTokens(tokens.accessToken, tokens.refreshToken);

        // POST /auth/login only returns tokens -> load the real user from
        // GET /profiles/me so the session has id / name / role.
        final user = await _loadUser(email) ?? tokens.user;
        final safeUser = user.email.isEmpty ? user.copyWith(email: email) : user;
        await SessionService.saveSession(safeUser, rememberMe);
        return AuthResult.success(
          AuthResponse(
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: safeUser,
          ),
        );
      }
      return AuthResult.failure(ApiService.extractErrorMessage(response));
    } catch (e) {
      return AuthResult.failure('Network error: could not reach server');
    }
  }

  /// GET /profiles/me right after login. Null when it can't be loaded.
  static Future<User?> _loadUser(String email) async {
    try {
      final response = await ApiService.get('/profiles/me');
      if (response.statusCode != 200) return null;
      final data = jsonDecode(response.body);
      if (data is! Map<String, dynamic>) return null;
      final profile = data['profile'] is Map
          ? Map<String, dynamic>.from(data['profile'] as Map)
          : <String, dynamic>{};
      return User(
        id: data['id']?.toString() ?? '',
        email: data['email']?.toString() ?? email,
        phone: data['phone']?.toString(),
        role: data['role']?.toString() ?? 'driver',
        fullName: data['full_name']?.toString(),
        drivingLicenceNo: profile['driving_licence_no']?.toString(),
        licenceType: profile['licence_type']?.toString(),
        dateOfBirth: profile['date_of_birth']?.toString(),
        isLoggedIn: true,
      );
    } catch (_) {
      return null;
    }
  }

  // ---------------- REFRESH ----------------

  static Future<bool> refresh() async {
    if (useLocalMock) return true;

    final refreshToken = await SessionService.getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final response = await ApiService.post(
        '/auth/refresh',
        {'refresh_token': refreshToken},
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final newAccess = json['accessToken'] ?? json['access_token'];
        final newRefresh = json['refreshToken'] ?? json['refresh_token'];
        if (newAccess != null) {
          await SessionService.saveTokens(
            newAccess.toString(),
            (newRefresh ?? refreshToken).toString(),
          );
          return true;
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> logout() async {
    if (!useLocalMock) {
      try {
        await ApiService.post('/auth/logout', {}, withAuth: true);
      } catch (_) {
        // ignore network errors on logout — clear local session regardless
      }
    }
    await SessionService.clearSession();
  }

  // ---------------- PASSWORD (NEW 08 Nov) ----------------

  static String? _messageOf(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map && decoded['message'] != null) {
        return decoded['message'].toString();
      }
    } catch (_) {}
    return null;
  }

  /// POST /auth/forgot-password
  /// Emails a 6-digit reset code (valid 15 min). The backend ALWAYS answers
  /// 200 with the same message, whether or not the email has an account, and
  /// ignores a new request within 1 minute of the previous one.
  static Future<PasswordResult> forgotPassword({required String email}) async {
    if (useLocalMock) {
      return PasswordResult.success(
        message: 'If an account exists for this email, a reset code has been sent.',
      );
    }
    try {
      final response =
          await ApiService.post('/auth/forgot-password', {'email': email});
      if (response.statusCode == 200 || response.statusCode == 201) {
        return PasswordResult.success(
          message: _messageOf(response.body) ??
              'If an account exists for this email, a reset code has been sent.',
        );
      }
      return PasswordResult.failure(ApiService.extractErrorMessage(response));
    } catch (_) {
      return PasswordResult.failure('Network error: could not reach server');
    }
  }

  /// POST /auth/reset-password
  /// [code] is the 6-digit code from the email (sent as `token`).
  /// New password must be 8-72 chars. On success the backend signs out every
  /// session of the account, so the user has to sign in again. Five wrong
  /// codes cancel the code -> a new one must be requested.
  static Future<PasswordResult> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    if (useLocalMock) {
      return PasswordResult.success(
        message: 'Password has been reset. Please sign in with the new password.',
      );
    }
    try {
      final response = await ApiService.post('/auth/reset-password', {
        'email': email,
        'token': code,
        'new_password': newPassword,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        return PasswordResult.success(
          message: _messageOf(response.body) ??
              'Password has been reset. Please sign in with the new password.',
        );
      }
      return PasswordResult.failure(ApiService.extractErrorMessage(response));
    } catch (_) {
      return PasswordResult.failure('Network error: could not reach server');
    }
  }

  /// POST /auth/change-password  (signed-in user)
  /// Other devices are signed out, this device stays signed in.
  /// A wrong current password answers 400 (NOT 401) so it is shown as a form
  /// error and does not look like an expired session.
  static Future<PasswordResult> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    if (useLocalMock) return PasswordResult.success(message: 'Password changed');

    final body = {
      'current_password': currentPassword,
      'new_password': newPassword,
    };

    try {
      var response =
          await ApiService.post('/auth/change-password', body, withAuth: true);

      // Access token expired -> refresh once and replay.
      if (response.statusCode == 401 && await refresh()) {
        response =
            await ApiService.post('/auth/change-password', body, withAuth: true);
      }

      if (response.statusCode == 200 || response.statusCode == 201) {
        int signedOut = 0;
        String? message;
        try {
          final json = jsonDecode(response.body);
          if (json is Map) {
            message = json['message']?.toString();
            final n = json['signed_out_sessions'];
            if (n is num) signedOut = n.toInt();
          }
        } catch (_) {}
        return PasswordResult.success(
          message: message ?? 'Password changed',
          signedOutSessions: signedOut,
        );
      }
      if (response.statusCode == 401) {
        return PasswordResult.failure('Session expired. Please sign in again.');
      }
      return PasswordResult.failure(ApiService.extractErrorMessage(response));
    } catch (_) {
      return PasswordResult.failure('Network error: could not reach server');
    }
  }

  static Future<List<dynamic>?> getSessions() async {
    if (useLocalMock) return [];
    try {
      final response = await ApiService.get('/auth/sessions');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
        if (data is Map && data['data'] is List) return data['data'] as List;
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> deleteSession(String id) async {
    if (useLocalMock) return true;
    try {
      final response = await ApiService.delete('/auth/sessions/$id');
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  // ============================================================
  // LOCAL MOCK IMPLEMENTATION
  // ============================================================

  static Future<List<Map<String, dynamic>>> _loadLocalUsers() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyLocalUsers);
    if (raw == null) return [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e)).toList();
  }

  static Future<void> _saveLocalUsers(List<Map<String, dynamic>> users) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyLocalUsers, jsonEncode(users));
  }

  static Future<AuthResult> _localRegister({
    required String email,
    required String password,
    required String phone,
    required String role,
    String? fullName,
  }) async {
    final users = await _loadLocalUsers();

    final alreadyExists = users.any(
      (u) => (u['email'] as String).toLowerCase() == email.toLowerCase(),
    );
    if (alreadyExists) {
      return AuthResult.failure('This email is already registered');
    }

    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final newUser = {
      'id': id,
      'email': email,
      'password': password,
      'phone': phone,
      'role': role,
      'full_name': fullName,
      'created_at': DateTime.now().toIso8601String(),
    };

    users.add(newUser);
    await _saveLocalUsers(users);

    final user = User.fromJson(newUser);
    final accessToken = 'local-token-$id';

    await SessionService.saveSession(user, true);
    await SessionService.saveTokens(accessToken, null);

    return AuthResult.success(
      AuthResponse(accessToken: accessToken, refreshToken: null, user: user),
    );
  }

  static Future<AuthResult> _localLogin({
    required String email,
    required String password,
    required bool rememberMe,
  }) async {
    final users = await _loadLocalUsers();

    final match = users.where(
      (u) =>
          (u['email'] as String).toLowerCase() == email.toLowerCase() &&
          u['password'] == password,
    ).toList();

    if (match.isEmpty) {
      return AuthResult.failure('Invalid email or password');
    }

    final user = User.fromJson(match.first);
    final accessToken = 'local-token-${user.id}';

    await SessionService.saveSession(user, rememberMe);
    await SessionService.saveTokens(accessToken, null);

    return AuthResult.success(
      AuthResponse(accessToken: accessToken, refreshToken: null, user: user),
    );
  }
}