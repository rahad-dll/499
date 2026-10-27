// lib/models/device_session_model.dart
//
// One row of GET /auth/sessions. Real backend shape (auth.service.ts
// getSessions): { id, device_name, ip_address, created_at, expires_at }.
// Only sessions that are NOT revoked and NOT expired are returned.

class DeviceSession {
  final String id;
  final String deviceName;
  final String? ipAddress;
  final DateTime? createdAt;
  final DateTime? expiresAt;

  const DeviceSession({
    required this.id,
    required this.deviceName,
    this.ipAddress,
    this.createdAt,
    this.expiresAt,
  });

  factory DeviceSession.fromJson(Map<String, dynamic> json) {
    DateTime? parse(dynamic v) =>
        v == null ? null : DateTime.tryParse(v.toString())?.toLocal();

    final name = (json['device_name'] ?? '').toString().trim();
    final ip = json['ip_address']?.toString().trim();

    return DeviceSession(
      id: json['id']?.toString() ?? '',
      deviceName: name.isEmpty ? 'Unknown device' : name,
      ipAddress: (ip == null || ip.isEmpty) ? null : ip,
      createdAt: parse(json['created_at']),
      expiresAt: parse(json['expires_at']),
    );
  }
}
