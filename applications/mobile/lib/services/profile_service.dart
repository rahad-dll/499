// lib/services/profile_service.dart
//
// GET   /profiles/me  -> { id, email, full_name, phone, avatar_url, role,
//                          profile: { driving_licence_no, licence_type,
//                                     date_of_birth, vehicle_classes } }
// PATCH /profiles/me  -> send ONLY the fields to change; returns the same
//                        shape as GET. Driver may change: full_name, phone,
//                        area_id, driving_licence_no, licence_type,
//                        date_of_birth (YYYY-MM-DD), vehicle_classes.
//                        Another role's field → 400, phone in use → 409.
//                        Changing phone marks it as not verified.
import '../models/user_model.dart';
import 'authed_http.dart';
import 'session_service.dart';

class ProfileService {
  /// Fields a driver is allowed to send (others answer 400).
  static const Set<String> driverFields = {
    'full_name',
    'phone',
    'area_id',
    'driving_licence_no',
    'licence_type',
    'date_of_birth',
    'vehicle_classes',
  };

  /// BRTA licence classes accepted by the backend.
  static const List<String> vehicleClasses = ['H', 'M', 'L', 'C', 'T', 'P', 'X'];

  static const List<String> licenceTypes = ['professional', 'non_professional'];

  /// Bangladeshi mobile number, same rule as the backend.
  static final RegExp phonePattern = RegExp(r'^01[3-9]\d{8}$');

  Future<Map<String, dynamic>> getProfile() async {
    final response = await AuthedHttp.get('/profiles/me');
    if (AuthedHttp.isOk(response)) {
      final data = AuthedHttp.decode(response);
      if (data is Map<String, dynamic>) {
        await _syncSession(data);
        return data;
      }
      throw const ApiException('Unexpected response from server');
    }
    throw ApiException.fromResponse(response);
  }

  /// PATCH /profiles/me with only the given fields. Unknown keys are
  /// dropped here so the server never answers "Not a driver field".
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final body = <String, dynamic>{};
    data.forEach((key, value) {
      if (driverFields.contains(key)) body[key] = value;
    });
    if (body.isEmpty) {
      throw const ApiException('Nothing to update');
    }

    final response = await AuthedHttp.patch('/profiles/me', body);
    if (AuthedHttp.isOk(response)) {
      final decoded = AuthedHttp.decode(response);
      if (decoded is Map<String, dynamic>) {
        await _syncSession(decoded);
        return decoded;
      }
      // Some builds answer with an empty body -> read it back.
      return getProfile();
    }
    throw ApiException.fromResponse(response);
  }

  /// Keeps the locally saved user (name / phone / licence) in step with the
  /// server so other screens show the same values.
  Future<void> _syncSession(Map<String, dynamic> data) async {
    try {
      final current = await SessionService.getSession();
      final profile = data['profile'] is Map
          ? Map<String, dynamic>.from(data['profile'] as Map)
          : <String, dynamic>{};

      final user = (current ??
              User(
                id: data['id']?.toString() ?? '',
                email: data['email']?.toString() ?? '',
                role: data['role']?.toString() ?? 'driver',
              ))
          .copyWith(
        id: data['id']?.toString(),
        email: data['email']?.toString(),
        role: data['role']?.toString(),
        fullName: data['full_name']?.toString(),
        phone: data['phone']?.toString(),
        drivingLicenceNo: profile['driving_licence_no']?.toString(),
        licenceType: profile['licence_type']?.toString(),
        dateOfBirth: profile['date_of_birth']?.toString(),
        isLoggedIn: true,
      );

      final remember = await SessionService.getRememberMe();
      await SessionService.saveSession(user, remember);
    } catch (_) {
      // local cache only — never break the screen for it
    }
  }
}
