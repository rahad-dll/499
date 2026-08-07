// lib/models/parking_model.dart
import 'package:flutter/material.dart'; // ← এই লাইন যোগ করুন

class ParkingModel {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int availableSpots;
  final int totalSpots;
  final double pricePerHour;
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
    required this.pricePerHour,
    required this.distance,
    required this.isOpen,
    required this.rating,
    this.amenities = const [],
  });

  factory ParkingModel.fromJson(Map<String, dynamic> json) {
    return ParkingModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      availableSpots: json['availableSpots'] ?? 0,
      totalSpots: json['totalSpots'] ?? 0,
      pricePerHour: (json['pricePerHour'] ?? 0.0).toDouble(),
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
      'pricePerHour': pricePerHour,
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
    double? pricePerHour,
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
      pricePerHour: pricePerHour ?? this.pricePerHour,
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
}