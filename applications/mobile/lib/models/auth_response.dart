import 'user_model.dart';

class AuthResponse {
  final String accessToken;
  final String? refreshToken;
  final User user;

  AuthResponse({
    required this.accessToken,
    this.refreshToken,
    required this.user,
  });

  // NOTE: backend response key names are assumed as accessToken/refreshToken/user
  // (common NestJS convention). If the real response uses different keys,
  // check the actual JSON (print response.body in auth_service.dart) and
  // adjust the keys below.
  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'] ?? json['data']?['user'] ?? {};
    return AuthResponse(
      accessToken: json['accessToken'] ??
          json['access_token'] ??
          json['token'] ??
          '',
      refreshToken: json['refreshToken'] ?? json['refresh_token'],
      user: User.fromJson(Map<String, dynamic>.from(userJson)),
    );
  }
}