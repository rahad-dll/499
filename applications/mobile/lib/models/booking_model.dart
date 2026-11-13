// lib/models/booking_model.dart
//
// Shape matches the real NestJS backend (bookings.service.ts formatBooking()).
//
//   id, space_id, space_name, space_address, latitude, longitude,
//   slot_id, slot_label, status, scheduled_at, hold_expires_at,
//   duration_hours, base_amount_unit, discount_unit, amount_unit,
//   price_per_hour (BDT), total_price (BDT), cancellation_reason,
//   vehicle_plate, payment_status, payment (only on GET /bookings/{id}
//   and cancel), arrived_at, departed_at, extended_to, created_at
//
// check-out also adds: overstay_hours, overstay_unit
// cancel also adds:    refund { amount_unit, refunded_at }

/// Backend statuses: pending, confirmed, cancelled, completed, no_show.
/// `active` is kept only for older app code / old rows.
enum BookingStatus { pending, confirmed, active, completed, cancelled, noShow }

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
    case 'no_show':
      return BookingStatus.noShow;
    case 'confirmed':
    default:
      return BookingStatus.confirmed;
  }
}

/// Value the backend uses for a status (also for GET /bookings?status=).
String bookingStatusToString(BookingStatus status) {
  switch (status) {
    case BookingStatus.noShow:
      return 'no_show';
    default:
      return status.name;
  }
}

String bookingStatusLabel(BookingStatus status) {
  switch (status) {
    case BookingStatus.pending:
      return 'Pending';
    case BookingStatus.confirmed:
      return 'Confirmed';
    case BookingStatus.active:
      return 'Active';
    case BookingStatus.completed:
      return 'Completed';
    case BookingStatus.cancelled:
      return 'Cancelled';
    case BookingStatus.noShow:
      return 'No-show';
  }
}

int _intOf(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? 0;
}

int? _intOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString());
}

double _doubleOf(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse(v?.toString() ?? '') ?? 0.0;
}

DateTime? _dateOrNull(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString())?.toLocal();
}

String? _stringOrNull(dynamic v) {
  final s = v?.toString().trim();
  return (s == null || s.isEmpty) ? null : s;
}

/// Payment attached to a booking (GET /bookings/{id} → payment).
class BookingPaymentInfo {
  final String method; // bkash | nagad | card | cash
  final String status; // pending | paid | failed | refunded
  final String? trxId;
  final DateTime? paidAt;
  final int? refundAmountUnit; // paisa

  const BookingPaymentInfo({
    required this.method,
    required this.status,
    this.trxId,
    this.paidAt,
    this.refundAmountUnit,
  });

  factory BookingPaymentInfo.fromJson(Map<String, dynamic> json) {
    return BookingPaymentInfo(
      method: json['method']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      trxId: _stringOrNull(json['trx_id']),
      paidAt: _dateOrNull(json['paid_at']),
      refundAmountUnit: _intOrNull(json['refund_amount_unit']),
    );
  }

  Map<String, dynamic> toJson() => {
        'method': method,
        'status': status,
        'trx_id': trxId,
        'paid_at': paidAt?.toUtc().toIso8601String(),
        'refund_amount_unit': refundAmountUnit,
      };
}

class BookingModel {
  /// Check-in opens this long before the start (backend rule).
  static const Duration checkInEarly = Duration(minutes: 15);

  /// A booking (incl. extensions) can last at most this many hours.
  static const int maxTotalHours = 24;

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
  final DateTime? holdExpiresAt; // booked end (moves when extended)
  final int durationHours;

  // price_per_hour / total_price are BDT; *Unit fields are paisa.
  final double pricePerHour;
  final double totalPrice;
  final int baseAmountUnit;
  final int discountUnit;
  final int amountUnit; // what the driver pays (incl. extension + overstay)

  final BookingStatus status;
  final String? cancellationReason;
  final String? vehiclePlate;
  final DateTime createdAt;

  // ── lifecycle (check-in / check-out / extend)
  final DateTime? arrivedAt;
  final DateTime? departedAt;
  final DateTime? extendedTo;

  // ── payment
  /// pending | paid | failed | refunded (null = never paid)
  final String? paymentStatus;
  final BookingPaymentInfo? payment;

  // ── only in the check-out response
  final int overstayHours;
  final int overstayUnit;

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
    this.baseAmountUnit = 0,
    this.discountUnit = 0,
    this.amountUnit = 0,
    required this.status,
    this.cancellationReason,
    this.vehiclePlate,
    required this.createdAt,
    this.arrivedAt,
    this.departedAt,
    this.extendedTo,
    this.paymentStatus,
    this.payment,
    this.overstayHours = 0,
    this.overstayUnit = 0,
  });

  // End of the booking: extension first, then the booked end, then
  // scheduledAt + durationHours for a locally-built model.
  DateTime get endTime =>
      extendedTo ??
      holdExpiresAt ??
      scheduledAt.add(Duration(hours: durationHours));

  // kept for any older call sites that still reference startTime
  DateTime get startTime => scheduledAt;

  // Paisa -> BDT for display.
  double get baseAmount => baseAmountUnit / 100.0;
  double get discount => discountUnit / 100.0;
  double get overstayAmount => overstayUnit / 100.0;
  bool get hasDiscount => discountUnit > 0;

  /// Amount to pay in BDT (amount_unit when present, else total_price).
  double get payableAmount =>
      amountUnit > 0 ? amountUnit / 100.0 : totalPrice;

  bool get isCheckedIn => arrivedAt != null;
  bool get isCheckedOut => departedAt != null;
  bool get isParkedNow => isCheckedIn && !isCheckedOut;
  bool get wasExtended => extendedTo != null;

  /// Booked hours so far (incl. extensions), from start to end.
  int get bookedHours {
    final minutes = endTime.difference(scheduledAt).inMinutes;
    return (minutes / 60).round();
  }

  /// Extra hours that still fit inside the 24 h cap.
  int get maxExtraHours {
    final left = maxTotalHours - bookedHours;
    if (left < 0) return 0;
    return left > 23 ? 23 : left;
  }

  bool get isPaid => paymentStatus == 'paid' || payment?.status == 'paid';
  bool get isRefunded =>
      paymentStatus == 'refunded' || payment?.status == 'refunded';

  /// Mirrors the backend rules of PATCH /bookings/{id}/cancel.
  bool get canCancel {
    if (status != BookingStatus.confirmed && status != BookingStatus.pending) {
      return false;
    }
    if (isParkedNow) return false;
    return endTime.isAfter(DateTime.now());
  }

  /// Mirrors POST /bookings/{id}/check-in (time window checked by caller
  /// via [checkInOpensAt] so the button can say when it opens).
  bool get canCheckIn {
    if (status != BookingStatus.confirmed || isCheckedIn) return false;
    return DateTime.now().isBefore(endTime);
  }

  DateTime get checkInOpensAt => scheduledAt.subtract(checkInEarly);

  bool get isCheckInOpen =>
      canCheckIn && !DateTime.now().isBefore(checkInOpensAt);

  /// Mirrors POST /bookings/{id}/check-out.
  bool get canCheckOut => isCheckedIn && !isCheckedOut;

  /// Mirrors POST /bookings/{id}/extend.
  bool get canExtend {
    if (status != BookingStatus.confirmed || isCheckedOut) return false;
    if (maxExtraHours < 1) return false;
    if (endTime.isBefore(DateTime.now()) && !isCheckedIn) return false;
    return true;
  }

  /// Mirrors POST /payments/initiate.
  bool get canPay {
    if (status == BookingStatus.cancelled || status == BookingStatus.noShow) {
      return false;
    }
    if (amountUnit <= 0 && totalPrice <= 0) return false;
    return !isPaid && !isRefunded;
  }

  /// Mirrors DELETE /bookings/{id} (hide from history).
  bool get canDelete {
    if (status == BookingStatus.cancelled ||
        status == BookingStatus.completed ||
        status == BookingStatus.noShow) {
      return true;
    }
    return endTime.isBefore(DateTime.now()) && !isParkedNow;
  }

  /// Booking still holds a slot: upcoming or ongoing.
  bool get isLive =>
      (status == BookingStatus.confirmed ||
          status == BookingStatus.pending ||
          status == BookingStatus.active) &&
      (endTime.isAfter(DateTime.now()) || isParkedNow);

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    // Backend sends timestamps in UTC (ISO strings with a trailing 'Z').
    // Converting to local once here means every screen shows local time.
    final scheduledAt =
        _dateOrNull(json['scheduled_at']) ?? DateTime.now();
    final createdAt = _dateOrNull(json['created_at']) ?? DateTime.now();

    final durationRaw = _intOf(json['duration_hours']);
    final amountUnit = _intOf(json['amount_unit']);
    final totalRaw = json['total_price'];

    final paymentRaw = json['payment'];

    return BookingModel(
      id: json['id']?.toString() ?? '',
      spaceId: json['space_id']?.toString() ?? '',
      spaceName: json['space_name']?.toString() ?? '',
      spaceAddress: json['space_address']?.toString() ?? '',
      latitude: _doubleOf(json['latitude']),
      longitude: _doubleOf(json['longitude']),
      slotId: json['slot_id']?.toString() ?? '',
      slotLabel: json['slot_label']?.toString() ?? '',
      scheduledAt: scheduledAt,
      holdExpiresAt: _dateOrNull(json['hold_expires_at']),
      durationHours: durationRaw > 0 ? durationRaw : 1,
      pricePerHour: _doubleOf(json['price_per_hour']),
      totalPrice: totalRaw is num ? totalRaw.toDouble() : amountUnit / 100.0,
      baseAmountUnit: _intOf(json['base_amount_unit']),
      discountUnit: _intOf(json['discount_unit']),
      amountUnit: amountUnit,
      status: bookingStatusFromString(json['status']?.toString() ?? 'confirmed'),
      cancellationReason: _stringOrNull(json['cancellation_reason']),
      vehiclePlate: _stringOrNull(json['vehicle_plate']),
      createdAt: createdAt,
      arrivedAt: _dateOrNull(json['arrived_at']),
      departedAt: _dateOrNull(json['departed_at']),
      extendedTo: _dateOrNull(json['extended_to']),
      paymentStatus: _stringOrNull(json['payment_status']),
      payment: paymentRaw is Map<String, dynamic>
          ? BookingPaymentInfo.fromJson(paymentRaw)
          : null,
      overstayHours: _intOf(json['overstay_hours']),
      overstayUnit: _intOf(json['overstay_unit']),
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
      'scheduled_at': scheduledAt.toUtc().toIso8601String(),
      'hold_expires_at': holdExpiresAt?.toUtc().toIso8601String(),
      'duration_hours': durationHours,
      'price_per_hour': pricePerHour,
      'total_price': totalPrice,
      'base_amount_unit': baseAmountUnit,
      'discount_unit': discountUnit,
      'amount_unit': amountUnit,
      'status': bookingStatusToString(status),
      'cancellation_reason': cancellationReason,
      'vehicle_plate': vehiclePlate,
      'created_at': createdAt.toUtc().toIso8601String(),
      'arrived_at': arrivedAt?.toUtc().toIso8601String(),
      'departed_at': departedAt?.toUtc().toIso8601String(),
      'extended_to': extendedTo?.toUtc().toIso8601String(),
      'payment_status': paymentStatus,
      'payment': payment?.toJson(),
      'overstay_hours': overstayHours,
      'overstay_unit': overstayUnit,
    };
  }

  /// Payload for POST /bookings.
  /// `slot_id` is optional — when left out the backend auto-picks the first
  /// free slot (the same one POST /bookings/quote priced).
  static Map<String, dynamic> createPayload({
    required String spaceId,
    required DateTime scheduledAt,
    required int durationHours,
    String? vehiclePlate,
    String? slotId,
  }) {
    final payload = <String, dynamic>{
      'space_id': spaceId,
      'scheduled_at': scheduledAt.toUtc().toIso8601String(),
      'duration_hours': durationHours,
    };
    if (slotId != null && slotId.isNotEmpty) payload['slot_id'] = slotId;
    if (vehiclePlate != null && vehiclePlate.trim().isNotEmpty) {
      payload['vehicle_plate'] = vehiclePlate.trim();
    }
    return payload;
  }

  /// Takes everything from [fresh] (server copy) but keeps a payment block
  /// we already know when the fresh response didn't include one.
  BookingModel mergeFresh(BookingModel fresh) {
    if (fresh.payment != null || payment == null) return fresh;
    return fresh.copyWith(payment: payment);
  }

  BookingModel copyWith({
    BookingStatus? status,
    String? cancellationReason,
    String? vehiclePlate,
    String? paymentStatus,
    BookingPaymentInfo? payment,
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
      baseAmountUnit: baseAmountUnit,
      discountUnit: discountUnit,
      amountUnit: amountUnit,
      status: status ?? this.status,
      cancellationReason: cancellationReason ?? this.cancellationReason,
      vehiclePlate: vehiclePlate ?? this.vehiclePlate,
      createdAt: createdAt,
      arrivedAt: arrivedAt,
      departedAt: departedAt,
      extendedTo: extendedTo,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      payment: payment ?? this.payment,
      overstayHours: overstayHours,
      overstayUnit: overstayUnit,
    );
  }
}

/// One page of GET /bookings → { data, page, limit, total }.
class BookingPage {
  final List<BookingModel> items;
  final int page;
  final int limit;
  final int total;

  const BookingPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
  });

  bool get hasMore => page * limit < total;
}
