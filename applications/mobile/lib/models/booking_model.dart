// lib/models/booking_model.dart
//
// Field names + toJson()/fromJson() are written in the same snake_case
// shape as the Spaces API (space_id, start_time, total_price, ...), so
// when the real /bookings endpoints exist you only need to change
// BookingService (below) — this model won't need to change.

enum BookingStatus { pending, confirmed, active, completed, cancelled }

BookingStatus bookingStatusFromString(String value) {
  switch (value) {
    case 'pending':
      return BookingStatus.pending;
    case 'active':
      return BookingStatus.active;
    case 'completed':
      return BookingStatus.completed;
    case 'cancelled':
      return BookingStatus.cancelled;
    case 'confirmed':
    default:
      return BookingStatus.confirmed;
  }
}

String bookingStatusToString(BookingStatus status) => status.name;

class BookingModel {
  final String id;
  final String spaceId;
  final String spaceName;
  final String spaceAddress;
  final double latitude;
  final double longitude;
  final DateTime startTime;
  final int durationHours;
  final double pricePerHour;
  final double totalPrice;
  final BookingStatus status;
  final String? vehiclePlate;
  final DateTime createdAt;

  const BookingModel({
    required this.id,
    required this.spaceId,
    required this.spaceName,
    required this.spaceAddress,
    required this.latitude,
    required this.longitude,
    required this.startTime,
    required this.durationHours,
    required this.pricePerHour,
    required this.totalPrice,
    required this.status,
    this.vehiclePlate,
    required this.createdAt,
  });

  DateTime get endTime => startTime.add(Duration(hours: durationHours));

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'].toString(),
      spaceId: json['space_id']?.toString() ?? '',
      spaceName: json['space_name'] ?? '',
      spaceAddress: json['space_address'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      startTime: DateTime.parse(json['start_time']),
      durationHours: json['duration_hours'] ?? 1,
      pricePerHour: (json['price_per_hour'] ?? 0.0).toDouble(),
      totalPrice: (json['total_price'] ?? 0.0).toDouble(),
      status: bookingStatusFromString(json['status'] ?? 'confirmed'),
      vehiclePlate: json['vehicle_plate'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'space_id': spaceId,
      'space_name': spaceName,
      'space_address': spaceAddress,
      'latitude': latitude,
      'longitude': longitude,
      'start_time': startTime.toIso8601String(),
      'duration_hours': durationHours,
      'price_per_hour': pricePerHour,
      'total_price': totalPrice,
      'status': bookingStatusToString(status),
      'vehicle_plate': vehiclePlate,
      'created_at': createdAt.toIso8601String(),
    };
  }

  BookingModel copyWith({BookingStatus? status}) {
    return BookingModel(
      id: id,
      spaceId: spaceId,
      spaceName: spaceName,
      spaceAddress: spaceAddress,
      latitude: latitude,
      longitude: longitude,
      startTime: startTime,
      durationHours: durationHours,
      pricePerHour: pricePerHour,
      totalPrice: totalPrice,
      status: status ?? this.status,
      vehiclePlate: vehiclePlate,
      createdAt: createdAt,
    );
  }
}