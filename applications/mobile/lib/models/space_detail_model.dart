// lib/models/space_detail_model.dart
//
// Model for GET /spaces/{id} — driver view (SpacePublicDto):
//   id, name, description, address, contact_phone, latitude, longitude,
//   space_type, total_capacity, operating_hours, amenities, max_height_cm,
//   base_rate_unit (paisa), vehicle_rates [{ vehicle_type, hourly_rate_unit }],
//   photos [{ id, is_primary, url }]  (signed links, valid 15 minutes)
// A pending / suspended lot answers 404 to drivers.
// Every field is still parsed defensively (wrapped `data`, missing values).

/// Hourly price of one vehicle type in a lot.
class VehicleRate {
  final String vehicleType; // car, motorcycle, cng, microbus, suv, ...
  final int hourlyRateUnit; // paisa

  const VehicleRate({required this.vehicleType, required this.hourlyRateUnit});

  double get hourlyRate => hourlyRateUnit / 100.0;

  String get vehicleLabel {
    switch (vehicleType) {
      case 'car':
        return 'Car';
      case 'motorcycle':
        return 'Motorcycle';
      case 'cng':
        return 'CNG';
      case 'microbus':
        return 'Microbus';
      case 'suv':
        return 'SUV';
      case 'pickup':
        return 'Pickup';
      case 'bicycle':
        return 'Bicycle';
      case 'truck':
        return 'Truck';
      default:
        return vehicleType;
    }
  }

  static VehicleRate? tryParse(dynamic json) {
    if (json is! Map) return null;
    final type = json['vehicle_type']?.toString() ?? '';
    final raw = json['hourly_rate_unit'];
    final unit = raw is num ? raw.toInt() : int.tryParse(raw?.toString() ?? '');
    if (type.isEmpty || unit == null) return null;
    return VehicleRate(vehicleType: type, hourlyRateUnit: unit);
  }
}

class SpacePhoto {
  final String id;
  final bool isPrimary;

  /// Set when the backend already returns a ready-to-use https URL.
  /// Otherwise null and the URL must come from
  /// GET /spaces/{id}/photos/{photoId}/presign.
  final String? directUrl;

  const SpacePhoto({required this.id, this.directUrl, this.isPrimary = false});

  factory SpacePhoto.fromJson(dynamic json) {
    if (json is String) {
      return json.startsWith('http')
          ? SpacePhoto(id: json, directUrl: json)
          : SpacePhoto(id: json);
    }
    if (json is Map) {
      final id = (json['id'] ?? json['photo_id'] ?? '').toString();
      final rawUrl =
          (json['url'] ?? json['photo_url'] ?? json['presigned_url'])
              ?.toString();
      final direct =
          (rawUrl != null && rawUrl.startsWith('http')) ? rawUrl : null;
      return SpacePhoto(
        id: id,
        directUrl: direct,
        isPrimary: json['is_primary'] == true,
      );
    }
    return const SpacePhoto(id: '');
  }
}

class SpaceDetailModel {
  final String id;
  final String name;
  final String? description;
  final String? address;
  final String? contactPhone;
  final String? spaceType; // indoor | outdoor | rooftop
  final int? totalCapacity;
  final double? ratePerHour; // BDT (backend sends paisa)
  final double? maxHeightCm;
  final List<String> amenities;
  final List<VehicleRate> vehicleRates;

  /// day key (mon..sun) -> "08:00 - 22:00"
  final Map<String, String> operatingHours;
  final List<SpacePhoto> photos;

  const SpaceDetailModel({
    required this.id,
    required this.name,
    this.description,
    this.address,
    this.contactPhone,
    this.spaceType,
    this.totalCapacity,
    this.ratePerHour,
    this.maxHeightCm,
    this.amenities = const [],
    this.vehicleRates = const [],
    this.operatingHours = const {},
    this.photos = const [],
  });

  static const List<String> dayOrder = [
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun',
  ];

  factory SpaceDetailModel.fromJson(Map<String, dynamic> raw) {
    // Some NestJS setups wrap the payload: { "data": { ... } }
    final json = (raw['data'] is Map<String, dynamic>)
        ? raw['data'] as Map<String, dynamic>
        : raw;

    double? rate;
    final rawRate = json['base_rate_unit'] ?? json['rate'];
    if (rawRate is num) rate = rawRate.toDouble() / 100;

    final hours = <String, String>{};
    final rawHours = json['operating_hours'];
    if (rawHours is Map) {
      rawHours.forEach((key, value) {
        final day = key.toString().toLowerCase();
        if (value is Map) {
          // { "mon": { "open": "08:00", "close": "22:00" } }
          final open = value['open']?.toString();
          final close = value['close']?.toString();
          if (open != null && close != null) {
            hours[day] = '$open - $close';
          }
        } else if (value is String && value.trim().isNotEmpty) {
          // { "mon": "08:00-22:00" }
          hours[day] = value.trim().replaceAll(RegExp(r'\s*-\s*'), ' - ');
        }
      });
    }

    final photoList = <SpacePhoto>[];
    final rawPhotos = json['photos'] ?? json['space_photos'];
    if (rawPhotos is List) {
      for (final p in rawPhotos) {
        final photo = SpacePhoto.fromJson(p);
        if (photo.id.isNotEmpty) photoList.add(photo);
      }
      // primary photo first
      photoList.sort((a, b) {
        if (a.isPrimary == b.isPrimary) return 0;
        return a.isPrimary ? -1 : 1;
      });
    }

    final rates = <VehicleRate>[];
    final rawRates = json['vehicle_rates'];
    if (rawRates is List) {
      for (final r in rawRates) {
        final rate = VehicleRate.tryParse(r);
        if (rate != null) rates.add(rate);
      }
    }

    return SpaceDetailModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: _nonEmpty(json['description']),
      address: _nonEmpty(json['address']),
      contactPhone: _nonEmpty(json['contact_phone']),
      spaceType: _nonEmpty(json['space_type']),
      totalCapacity: json['total_capacity'] is num
          ? (json['total_capacity'] as num).toInt()
          : null,
      ratePerHour: rate,
      maxHeightCm: json['max_height_cm'] is num
          ? (json['max_height_cm'] as num).toDouble()
          : null,
      amenities: json['amenities'] is List
          ? (json['amenities'] as List).map((e) => e.toString()).toList()
          : const [],
      vehicleRates: rates,
      operatingHours: hours,
      photos: photoList,
    );
  }

  static String? _nonEmpty(dynamic v) {
    final s = v?.toString().trim();
    return (s == null || s.isEmpty) ? null : s;
  }

  String get spaceTypeLabel {
    switch (spaceType) {
      case 'indoor':
        return 'Indoor';
      case 'outdoor':
        return 'Outdoor';
      case 'rooftop':
        return 'Rooftop';
      default:
        return spaceType ?? '';
    }
  }

  bool get hasAnyExtra =>
      photos.isNotEmpty ||
      vehicleRates.isNotEmpty ||
      ratePerHour != null ||
      description != null ||
      contactPhone != null ||
      spaceType != null ||
      maxHeightCm != null ||
      operatingHours.isNotEmpty;
}
