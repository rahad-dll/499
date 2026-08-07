class User {
  final String id;
  final String email;
  final String? phone;
  final String role; // driver, owner, authority
  final String? fullName;
  final String? areaId;
  final String? dateOfBirth;
  final String? drivingLicenceNo;
  final String? licenceType;
  final String? businessName;
  final String? address;
  final String? nationalId;
  final String? passportNo;
  final String? organization;
  final String? badgeNumber;
  final DateTime? createdAt;
  final bool isLoggedIn;

  User({
    required this.id,
    required this.email,
    this.phone,
    required this.role,
    this.fullName,
    this.areaId,
    this.dateOfBirth,
    this.drivingLicenceNo,
    this.licenceType,
    this.businessName,
    this.address,
    this.nationalId,
    this.passportNo,
    this.organization,
    this.badgeNumber,
    this.createdAt,
    this.isLoggedIn = false,
  });

  /// kept for any old UI code that referred to `user.userType`
  String get userType => role;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      email: json['email'] ?? '',
      phone: json['phone'],
      role: json['role'] ?? 'driver',
      fullName: json['full_name'] ?? json['fullName'],
      areaId: json['area_id'],
      dateOfBirth: json['date_of_birth'],
      drivingLicenceNo: json['driving_licence_no'],
      licenceType: json['licence_type'],
      businessName: json['business_name'],
      address: json['address'],
      nationalId: json['national_id'],
      passportNo: json['passport_no'],
      organization: json['organization'],
      badgeNumber: json['badge_number'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
      isLoggedIn: true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'phone': phone,
      'role': role,
      'full_name': fullName,
      'area_id': areaId,
      'date_of_birth': dateOfBirth,
      'driving_licence_no': drivingLicenceNo,
      'licence_type': licenceType,
      'business_name': businessName,
      'address': address,
      'national_id': nationalId,
      'passport_no': passportNo,
      'organization': organization,
      'badge_number': badgeNumber,
      'created_at': createdAt?.toIso8601String(),
      'isLoggedIn': isLoggedIn,
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? phone,
    String? role,
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
    DateTime? createdAt,
    bool? isLoggedIn,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      fullName: fullName ?? this.fullName,
      areaId: areaId ?? this.areaId,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      drivingLicenceNo: drivingLicenceNo ?? this.drivingLicenceNo,
      licenceType: licenceType ?? this.licenceType,
      businessName: businessName ?? this.businessName,
      address: address ?? this.address,
      nationalId: nationalId ?? this.nationalId,
      passportNo: passportNo ?? this.passportNo,
      organization: organization ?? this.organization,
      badgeNumber: badgeNumber ?? this.badgeNumber,
      createdAt: createdAt ?? this.createdAt,
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
    );
  }
}