class User {
  final String id;
  final String email;
  final String fullName;
  final String userType; // 'driver', 'owner', 'authority'
  final DateTime createdAt;
  final bool isLoggedIn;

  User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.userType,
    required this.createdAt,
    this.isLoggedIn = false,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'fullName': fullName,
    'userType': userType,
    'createdAt': createdAt.toIso8601String(),
    'isLoggedIn': isLoggedIn,
  };

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'],
    email: json['email'],
    fullName: json['fullName'],
    userType: json['userType'],
    createdAt: DateTime.parse(json['createdAt']),
    isLoggedIn: json['isLoggedIn'] ?? false,
  );

  User copyWith({
    String? id,
    String? email,
    String? fullName,
    String? userType,
    DateTime? createdAt,
    bool? isLoggedIn,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      userType: userType ?? this.userType,
      createdAt: createdAt ?? this.createdAt,
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
    );
  }
}