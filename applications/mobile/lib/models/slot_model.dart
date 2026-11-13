// lib/models/slot_model.dart
//
// One row of GET /spaces/{spaceId}/slots?from&to as a DRIVER sees it
// (backend PUBLIC_SLOT_FIELDS). Drivers only get active + bookable slots,
// and with from/to only the ones with no booking in that window.
//   id, slot_label, display_name, zone, floor, sort_order, slot_type,
//   vehicle_types[], length_cm, width_cm, max_height_cm, features[],
//   ev_charger_kw, allow_hourly, allow_daily, allow_monthly, access_note,
//   cover_photo_key, occupied, last_updated

int? _intOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString());
}

double? _doubleOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

String? _stringOrNull(dynamic v) {
  final s = v?.toString().trim();
  return (s == null || s.isEmpty) ? null : s;
}

List<String> _stringList(dynamic v) {
  if (v is List) return v.map((e) => e.toString()).toList();
  return const [];
}

String vehicleTypeLabel(String type) {
  switch (type) {
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
      return type;
  }
}

class ParkingSlot {
  final String id;
  final String label;
  final String? displayName;
  final String? zone;
  final String? floor;
  final int sortOrder;
  final String? slotType; // standard, compact, large, motorcycle, disabled, ev, bicycle
  final List<String> vehicleTypes;
  final List<String> features;
  final double? evChargerKw;
  final int? maxHeightCm;
  final String? accessNote;

  /// Camera says a car is standing there right now.
  final bool occupied;

  const ParkingSlot({
    required this.id,
    required this.label,
    this.displayName,
    this.zone,
    this.floor,
    this.sortOrder = 0,
    this.slotType,
    this.vehicleTypes = const [],
    this.features = const [],
    this.evChargerKw,
    this.maxHeightCm,
    this.accessNote,
    this.occupied = false,
  });

  factory ParkingSlot.fromJson(Map<String, dynamic> json) {
    return ParkingSlot(
      id: json['id']?.toString() ?? '',
      label: json['slot_label']?.toString() ?? '',
      displayName: _stringOrNull(json['display_name']),
      zone: _stringOrNull(json['zone']),
      floor: _stringOrNull(json['floor']),
      sortOrder: _intOrNull(json['sort_order']) ?? 0,
      slotType: _stringOrNull(json['slot_type']),
      vehicleTypes: _stringList(json['vehicle_types']),
      features: _stringList(json['features']),
      evChargerKw: _doubleOrNull(json['ev_charger_kw']),
      maxHeightCm: _intOrNull(json['max_height_cm']),
      accessNote: _stringOrNull(json['access_note']),
      occupied: json['occupied'] == true,
    );
  }

  bool get isEv => slotType == 'ev' || (evChargerKw ?? 0) > 0;
  bool get isAccessible => slotType == 'disabled';

  /// Empty vehicle list = any vehicle.
  bool fits(String? vehicleType) =>
      vehicleType == null || vehicleTypes.isEmpty || vehicleTypes.contains(vehicleType);

  /// "Floor B1 · Zone A" (only the parts that exist).
  String get locationText {
    final parts = <String>[
      if (floor != null) 'Floor $floor',
      if (zone != null) 'Zone $zone',
    ];
    return parts.join(' · ');
  }

  String get typeLabel {
    switch (slotType) {
      case 'standard':
        return 'Standard';
      case 'compact':
        return 'Compact';
      case 'large':
        return 'Large';
      case 'motorcycle':
        return 'Motorcycle';
      case 'disabled':
        return 'Accessible';
      case 'ev':
        return 'EV charging';
      case 'bicycle':
        return 'Bicycle';
      default:
        return slotType ?? '';
    }
  }
}
