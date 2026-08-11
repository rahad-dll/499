import 'package:flutter/material.dart';

class SlotStatus {
  final String slotId;
  final String status; // 'available' | 'not_available' | 'unknown'
  final double confidence;

  SlotStatus({
    required this.slotId,
    required this.status,
    required this.confidence,
  });

  factory SlotStatus.fromJson(Map<String, dynamic> json) {
    return SlotStatus(
      slotId: json['slot_id']?.toString() ?? '',
      status: json['status']?.toString() ?? 'unknown',
      confidence: (json['confidence'] ?? 0.0).toDouble(),
    );
  }
}

class ParkingModel {
  final String id;
  final String name;
  final String? description;
  final String address;
  final double latitude;
  final double longitude;
  final int availableSpots;
  final int occupiedSpots;
  final int unknownSpots;
  final int totalSpots;
  final double? rate; // backend doesn't send this yet — stays null until Rahad adds it
  final double distance;
  final String status; // raw backend enum: active | inactive | pending
  final double? rating; // backend has no rating column yet — stays null, don't fake it
  final List<String> amenities; // backend select doesn't include this yet — will be [] for now
  final int photoCount;
  final int cameraCount;
  final List<SlotStatus> slotStatuses;

  ParkingModel({
    required this.id,
    required this.name,
    this.description,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.availableSpots,
    this.occupiedSpots = 0,
    this.unknownSpots = 0,
    required this.totalSpots,
    this.rate,
    required this.distance,
    this.status = 'active',
    this.rating,
    this.amenities = const [],
    this.photoCount = 0,
    this.cameraCount = 0,
    this.slotStatuses = const [],
  });

  factory ParkingModel.fromJson(Map<String, dynamic> json) {
    // Rate isn't returned by /spaces/nearby today — kept multi-key defensive
    // in case Rahad wires pricing_rules into the response later.
    double? rateValue;
    if (json['rate'] != null) {
      rateValue = (json['rate'] as num).toDouble();
    } else if (json['pricePerHour'] != null) {
      rateValue = (json['pricePerHour'] as num).toDouble();
    } else if (json['price'] != null) {
      rateValue = (json['price'] as num).toDouble();
    } else if (json['hourlyRate'] != null) {
      rateValue = (json['hourlyRate'] as num).toDouble();
    } else if (json['base_rate_unit'] != null) {
      rateValue = (json['base_rate_unit'] as num).toDouble();
    }

    double? ratingValue;
    if (json['rating'] != null) {
      ratingValue = (json['rating'] as num).toDouble();
    }

    List<SlotStatus> slots = [];
    if (json['slot_statuses'] is List) {
      slots = (json['slot_statuses'] as List)
          .whereType<Map<String, dynamic>>()
          .map((s) => SlotStatus.fromJson(s))
          .toList();
    }

    return ParkingModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? 'Unnamed space',
      description: json['description'],
      address: json['address'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      // Real API key is `available_slots`. Kept the old camelCase as a
      // fallback in case any other endpoint still sends it that way.
      availableSpots: json['available_slots'] ?? json['availableSpots'] ?? 0,
      occupiedSpots: json['occupied_slots'] ?? 0,
      unknownSpots: json['unknown_slots'] ?? 0,
      totalSpots: json['total_capacity'] ?? json['totalSpots'] ?? 0,
      rate: rateValue,
      distance: (json['distance_km'] ?? json['distance'] ?? 0.0).toDouble(),
      status: json['status']?.toString() ?? 'active',
      rating: ratingValue,
      amenities: json['amenities'] is List
          ? List<String>.from(json['amenities'])
          : const [],
      photoCount: json['photo_count'] ?? 0,
      cameraCount: json['camera_count'] ?? 0,
      slotStatuses: slots,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'available_slots': availableSpots,
      'occupied_slots': occupiedSpots,
      'unknown_slots': unknownSpots,
      'total_capacity': totalSpots,
      'rate': rate,
      'distance_km': distance,
      'status': status,
      'rating': rating,
      'amenities': amenities,
    };
  }

  ParkingModel copyWith({
    String? id,
    String? name,
    String? description,
    String? address,
    double? latitude,
    double? longitude,
    int? availableSpots,
    int? occupiedSpots,
    int? unknownSpots,
    int? totalSpots,
    double? rate,
    double? distance,
    String? status,
    double? rating,
    List<String>? amenities,
  }) {
    return ParkingModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      availableSpots: availableSpots ?? this.availableSpots,
      occupiedSpots: occupiedSpots ?? this.occupiedSpots,
      unknownSpots: unknownSpots ?? this.unknownSpots,
      totalSpots: totalSpots ?? this.totalSpots,
      rate: rate ?? this.rate,
      distance: distance ?? this.distance,
      status: status ?? this.status,
      rating: rating ?? this.rating,
      amenities: amenities ?? this.amenities,
    );
  }

  // ---- UI helpers ----

  bool get isOpen => status == 'active';

  bool get hasAvailableSpots => availableSpots > 0 && isOpen;

  String get availabilityStatus {
    if (!isOpen) return 'Closed';
    if (availableSpots > 5) return 'Plenty Available';
    if (availableSpots > 0) return 'Limited Spots';
    return 'Fully Booked';
  }

  Color get availabilityColor {
    if (!isOpen) return const Color(0xFF9CA3AF);
    if (availableSpots > 5) return const Color(0xFF22C55E);
    if (availableSpots > 0) return const Color(0xFFF59E0B);
    return const Color(0xFFEF4444);
  }

  double get occupancyRatio =>
      totalSpots > 0 ? (occupiedSpots / totalSpots).clamp(0.0, 1.0) : 0.0;

  bool get hasRating => rating != null;

  String get formattedDistance {
    if (distance < 1) return '${(distance * 1000).round()} m away';
    return '${distance.toStringAsFixed(1)} km away';
  }

  String get formattedRate {
    if (rate == null) return 'Rate not available';
    return '\$${rate!.toStringAsFixed(2)}/hr';
  }

  bool get hasRate => rate != null;
}