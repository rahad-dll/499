// user_model.dart
class User {
  final String id;
  final String email;
  final String role;
  final String? fullName;
  final List<String> permissions;
  final DateTime createdAt;
  
  User({
    required this.id,
    required this.email,
    required this.role,
    this.fullName,
    this.permissions = const [],
    required this.createdAt,
  });
  
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      role: json['role'],
      fullName: json['fullName'],
      permissions: List<String>.from(json['permissions'] ?? []),
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role,
      'fullName': fullName,
      'permissions': permissions,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
