// lib/services/auth_service.dart
import 'dart:convert';
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
      print('REGISTER ${response.statusCode}: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final auth = AuthResponse.fromJson(json);
        await SessionService.saveSession(auth.user, true);
        await SessionService.saveTokens(auth.accessToken, auth.refreshToken);
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
      print('LOGIN ${response.statusCode}: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final auth = AuthResponse.fromJson(json);
        await SessionService.saveSession(auth.user, rememberMe);
        await SessionService.saveTokens(auth.accessToken, auth.refreshToken);
        return AuthResult.success(auth);
      }
      return AuthResult.failure(ApiService.extractErrorMessage(response));
    } catch (e) {
      return AuthResult.failure('Network error: could not reach server');
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

  static Future<List<dynamic>?> getSessions() async {
    if (useLocalMock) return [];
    try {
      final response = await ApiService.get('/auth/sessions');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
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