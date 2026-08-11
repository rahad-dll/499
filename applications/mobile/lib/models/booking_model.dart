// lib/models/booking_model.dart
import 'package:flutter/material.dart';

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
  final String slotId;
  final String spaceName;
  final String spaceAddress;
  final double latitude;
  final double longitude;
  final DateTime scheduledAt;  // startTime এর পরিবর্তে scheduledAt
  final int durationHours;
  final double pricePerHour;
  final double totalPrice;
  final BookingStatus status;
  final String? vehiclePlate;
  final DateTime createdAt;

  const BookingModel({
    required this.id,
    required this.spaceId,
    required this.slotId,
    required this.spaceName,
    required this.spaceAddress,
    required this.latitude,
    required this.longitude,
    required this.scheduledAt,
    required this.durationHours,
    required this.pricePerHour,
    required this.totalPrice,
    required this.status,
    this.vehiclePlate,
    required this.createdAt,
  });

  // startTime getter for backward compatibility
  DateTime get startTime => scheduledAt;
  
  DateTime get endTime => scheduledAt.add(Duration(hours: durationHours));

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id']?.toString() ?? '',
      spaceId: json['space_id']?.toString() ?? '',
      slotId: json['slot_id']?.toString() ?? '',
      spaceName: json['space_name'] ?? json['spaceName'] ?? '',
      spaceAddress: json['space_address'] ?? json['spaceAddress'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      scheduledAt: DateTime.parse(json['scheduled_at'] ?? json['start_time'] ?? DateTime.now().toIso8601String()),
      durationHours: json['duration_hours'] ?? json['durationHours'] ?? 1,
      pricePerHour: (json['price_per_hour'] ?? json['pricePerHour'] ?? 0.0).toDouble(),
      totalPrice: (json['total_price'] ?? json['totalPrice'] ?? 0.0).toDouble(),
      status: bookingStatusFromString(json['status'] ?? 'confirmed'),
      vehiclePlate: json['vehicle_plate'] ?? json['vehiclePlate'],
      createdAt: DateTime.tryParse(json['created_at'] ?? json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'space_id': spaceId,
      'slot_id': slotId,
      'space_name': spaceName,
      'space_address': spaceAddress,
      'latitude': latitude,
      'longitude': longitude,
      'scheduled_at': scheduledAt.toIso8601String(),
      'duration_hours': durationHours,
      'price_per_hour': pricePerHour,
      'total_price': totalPrice,
      'status': bookingStatusToString(status),
      'vehicle_plate': vehiclePlate,
      'created_at': createdAt.toIso8601String(),
    };
  }

  Map<String, dynamic> toCreatePayload() {
    return {
      'space_id': spaceId,
      'slot_id': slotId,
      'scheduled_at': scheduledAt.toIso8601String(),
      'duration_hours': durationHours,
      'vehicle_plate': vehiclePlate ?? '',
    };
  }

  BookingModel copyWith({BookingStatus? status}) {
    return BookingModel(
      id: id,
      spaceId: spaceId,
      slotId: slotId,
      spaceName: spaceName,
      spaceAddress: spaceAddress,
      latitude: latitude,
      longitude: longitude,
      scheduledAt: scheduledAt,
      durationHours: durationHours,
      pricePerHour: pricePerHour,
      totalPrice: totalPrice,
      status: status ?? this.status,
      vehiclePlate: vehiclePlate,
      createdAt: createdAt,
    );
  }
}