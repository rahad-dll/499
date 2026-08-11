import 'package:flutter/material.dart';

class ParkingModel {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int availableSpots;
  final int totalSpots;
  final double? rate; // Changed from pricePerHour to rate (nullable)
  final double distance;
  final bool isOpen;
  final double rating;
  final List<String> amenities;

  ParkingModel({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.availableSpots,
    required this.totalSpots,
    this.rate, // Made nullable
    required this.distance,
    required this.isOpen,
    required this.rating,
    this.amenities = const [],
  });

  factory ParkingModel.fromJson(Map<String, dynamic> json) {
    // Try to get rate from multiple possible field names
    double? rateValue;
    if (json['rate'] != null) {
      rateValue = (json['rate'] as num).toDouble();
    } else if (json['pricePerHour'] != null) {
      rateValue = (json['pricePerHour'] as num).toDouble();
    } else if (json['price'] != null) {
      rateValue = (json['price'] as num).toDouble();
    } else if (json['hourlyRate'] != null) {
      rateValue = (json['hourlyRate'] as num).toDouble();
    }

    return ParkingModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      availableSpots: json['availableSpots'] ?? 0,
      totalSpots: json['totalSpots'] ?? 0,
      rate: rateValue,
      distance: (json['distance'] ?? 0.0).toDouble(),
      isOpen: json['isOpen'] ?? false,
      rating: (json['rating'] ?? 0.0).toDouble(),
      amenities: List<String>.from(json['amenities'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'availableSpots': availableSpots,
      'totalSpots': totalSpots,
      'rate': rate,
      'distance': distance,
      'isOpen': isOpen,
      'rating': rating,
      'amenities': amenities,
    };
  }

  ParkingModel copyWith({
    String? id,
    String? name,
    String? address,
    double? latitude,
    double? longitude,
    int? availableSpots,
    int? totalSpots,
    double? rate,
    double? distance,
    bool? isOpen,
    double? rating,
    List<String>? amenities,
  }) {
    return ParkingModel(
      id: id ?? this.id,
      name: name ?? this.name,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      availableSpots: availableSpots ?? this.availableSpots,
      totalSpots: totalSpots ?? this.totalSpots,
      rate: rate ?? this.rate,
      distance: distance ?? this.distance,
      isOpen: isOpen ?? this.isOpen,
      rating: rating ?? this.rating,
      amenities: amenities ?? this.amenities,
    );
  }

  // Helper getters for UI
  bool get hasAvailableSpots => availableSpots > 0;
  
  String get availabilityStatus {
    if (availableSpots > 5) return 'Plenty Available';
    if (availableSpots > 0) return 'Limited Spots';
    return 'Fully Booked';
  }
  
  Color get availabilityColor {
    if (availableSpots > 5) return const Color(0xFF22C55E);
    if (availableSpots > 0) return const Color(0xFFF59E0B);
    return const Color(0xFFEF4444);
  }

  // Helper to get formatted rate
  String get formattedRate {
    if (rate == null) return 'Rate not available';
    return '\$${rate!.toStringAsFixed(2)}/hr';
  }

  // Helper to check if rate exists
  bool get hasRate => rate != null;
}