// lib/models/booking_model.dart
//
// Shape matches the real NestJS backend (bookings.service.ts formatBooking()
// on the `development` branch — this module isn't on feature/mobile yet,
// pull it in before testing against local).

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

  // Backend always assigns a real slot (auto-picked if you don't send one)
  // and returns its human-readable label, e.g. "A3".
  final String slotId;
  final String slotLabel;

  final DateTime scheduledAt;
  final DateTime? holdExpiresAt; // scheduledAt + duration, from backend
  final int durationHours;

  // Backend stores money as integer "paisa" (amount_unit) and already
  // converts to BDT for us as price_per_hour / total_price.
  final double pricePerHour;
  final double totalPrice;

  final BookingStatus status;
  final String? cancellationReason;
  final String? vehiclePlate; // not returned by backend yet, kept client-side
  final DateTime createdAt;

  const BookingModel({
    required this.id,
    required this.spaceId,
    required this.spaceName,
    required this.spaceAddress,
    required this.latitude,
    required this.longitude,
    required this.slotId,
    this.slotLabel = '',
    required this.scheduledAt,
    this.holdExpiresAt,
    required this.durationHours,
    required this.pricePerHour,
    required this.totalPrice,
    required this.status,
    this.cancellationReason,
    this.vehiclePlate,
    required this.createdAt,
  });

  // endTime falls back to scheduledAt + durationHours if the backend
  // didn't send hold_expires_at (e.g. for a locally-built optimistic model).
  DateTime get endTime =>
      holdExpiresAt ?? scheduledAt.add(Duration(hours: durationHours));

  // kept for any older call sites that still reference startTime
  DateTime get startTime => scheduledAt;

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    // Backend sends timestamps in UTC (ISO strings with a trailing 'Z').
    // DateTime.tryParse correctly flags those as UTC, but without
    // .toLocal() the raw UTC clock values get shown to the user as if
    // they were already local — e.g. a 6:00 PM booking would render as
    // 12:00 PM for someone in UTC+6. Converting here once means every
    // screen that reads scheduledAt/holdExpiresAt/createdAt automatically
    // shows the real, correct local time.
    final rawScheduledAt =
        DateTime.tryParse(json['scheduled_at']?.toString() ?? '') ??
            DateTime.now();
    final rawHoldExpiresAt = json['hold_expires_at'] != null
        ? DateTime.tryParse(json['hold_expires_at'].toString())
        : null;
    final rawCreatedAt =
        DateTime.tryParse(json['created_at']?.toString() ?? '') ??
            DateTime.now();

    return BookingModel(
      id: json['id']?.toString() ?? '',
      spaceId: json['space_id']?.toString() ?? '',
      spaceName: json['space_name']?.toString() ?? '',
      spaceAddress: json['space_address']?.toString() ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      slotId: json['slot_id']?.toString() ?? '',
      slotLabel: json['slot_label']?.toString() ?? '',
      scheduledAt: rawScheduledAt.toLocal(),
      holdExpiresAt: rawHoldExpiresAt?.toLocal(),
      durationHours: json['duration_hours'] ?? 1,
      pricePerHour: (json['price_per_hour'] ?? 0).toDouble(),
      totalPrice: (json['total_price'] ?? 0).toDouble(),
      status: bookingStatusFromString(json['status']?.toString() ?? 'confirmed'),
      cancellationReason: json['cancellation_reason']?.toString(),
      vehiclePlate: json['vehicle_plate']?.toString(),
      createdAt: rawCreatedAt.toLocal(),
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
      'slot_id': slotId,
      'slot_label': slotLabel,
      'scheduled_at': scheduledAt.toIso8601String(),
      'hold_expires_at': holdExpiresAt?.toIso8601String(),
      'duration_hours': durationHours,
      'price_per_hour': pricePerHour,
      'total_price': totalPrice,
      'status': bookingStatusToString(status),
      'cancellation_reason': cancellationReason,
      'vehicle_plate': vehiclePlate,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Payload for POST /bookings.
  /// `slot_id` is intentionally omitted — the app doesn't have real slot
  /// ids from the nearby-spaces list, and the backend auto-picks the first
  /// free slot in the space when it's left out. Sending a space id here
  /// as if it were a slot id is what was causing "Slot not found" before.
  static Map<String, dynamic> createPayload({
    required String spaceId,
    required DateTime scheduledAt,
    required int durationHours,
    String? vehiclePlate,
  }) {
    final payload = <String, dynamic>{
      'space_id': spaceId,
      'scheduled_at': scheduledAt.toUtc().toIso8601String(),
      'duration_hours': durationHours,
    };
    if (vehiclePlate != null && vehiclePlate.trim().isNotEmpty) {
      payload['vehicle_plate'] = vehiclePlate.trim();
    }
    return payload;
  }

  BookingModel copyWith({
    BookingStatus? status,
    String? cancellationReason,
  }) {
    return BookingModel(
      id: id,
      spaceId: spaceId,
      spaceName: spaceName,
      spaceAddress: spaceAddress,
      latitude: latitude,
      longitude: longitude,
      slotId: slotId,
      slotLabel: slotLabel,
      scheduledAt: scheduledAt,
      holdExpiresAt: holdExpiresAt,
      durationHours: durationHours,
      pricePerHour: pricePerHour,
      totalPrice: totalPrice,
      status: status ?? this.status,
      cancellationReason: cancellationReason ?? this.cancellationReason,
      vehiclePlate: vehiclePlate,
      createdAt: createdAt,
    );
  }
}