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
  final String? imageUrl;
  final double rating;
  final List<String>? amenities;

  ParkingModel({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.availableSpots,
    required this.totalSpots,
    required this.pricePerHour,
    this.distance = 0,
    this.isOpen = true,
    this.imageUrl,
    this.rating = 0,
    this.amenities,
  });

  factory ParkingModel.fromJson(Map<String, dynamic> json) {
    return ParkingModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? 'Unknown Parking',
      address: json['address'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      availableSpots: json['availableSpots'] ?? 0,
      totalSpots: json['totalSpots'] ?? 0,
      pricePerHour: (json['pricePerHour'] ?? 0.0).toDouble(),
      distance: (json['distance'] ?? 0.0).toDouble(),
      isOpen: json['isOpen'] ?? true,
      imageUrl: json['imageUrl'],
      rating: (json['rating'] ?? 0.0).toDouble(),
      amenities: json['amenities'] != null 
          ? List<String>.from(json['amenities']) 
          : null,
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
      'imageUrl': imageUrl,
      'rating': rating,
      'amenities': amenities,
    };
  }
}