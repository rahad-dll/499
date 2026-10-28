// lib/models/space_detail_model.dart
//
// Model for GET /spaces/{id}.
// The Swagger JSON has NO response schema for this endpoint, so every field
// is parsed defensively (several key spellings, wrapped `data` object,
// missing values). If Rahad's real response differs, only this file needs
// a tweak.

class SpacePhoto {
  final String id;

  /// Set when the backend already returns a ready-to-use https URL.
  /// Otherwise null and the URL must come from
  /// GET /spaces/{id}/photos/{photoId}/presign.
  final String? directUrl;

  const SpacePhoto({required this.id, this.directUrl});

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
      return SpacePhoto(id: id, directUrl: direct);
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
        if (value is Map) {
          final open = value['open']?.toString();
          final close = value['close']?.toString();
          if (open != null && close != null) {
            hours[key.toString().toLowerCase()] = '$open - $close';
          }
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
    }

    return SpaceDetailModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: _nonEmpty(json['description']),
      address: _nonEmpty(json['address']),
      contactPhone: _nonEmpty(json['contact_phone']),
      spaceType: _nonEmpty(json['space_type']),
      totalCapacity: (json['total_capacity'] as num?)?.toInt(),
      ratePerHour: rate,
      maxHeightCm: (json['max_height_cm'] as num?)?.toDouble(),
      amenities: json['amenities'] is List
          ? (json['amenities'] as List).map((e) => e.toString()).toList()
          : const [],
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
      description != null ||
      contactPhone != null ||
      spaceType != null ||
      maxHeightCm != null ||
      operatingHours.isNotEmpty;
}
