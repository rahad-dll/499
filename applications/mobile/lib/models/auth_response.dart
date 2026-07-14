// auth_response.dart
class AuthResponse {
  final User user;
  final String accessToken;
  final String refreshToken;
  
  AuthResponse({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });
  
  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      user: User.fromJson(json['user']),
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
    );
  }
}