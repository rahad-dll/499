// lib/models/booking_quote_model.dart
//
// Response of POST /bookings/quote — the slot POST /bookings would give
// right now and what it would cost. Nothing is reserved.
//
// Amounts ending in `Unit` are PAISA (5000 = 50 BDT). `totalPrice` is BDT.
// Hourly rate priority on the server (most specific first):
//   slot's own price  ->  lot's rate for the vehicle type  ->  lot base price

/// Which price rule produced the hourly rate.
enum QuoteRateSource { slot, vehicle, lot, unknown }

QuoteRateSource _rateSourceFrom(String? v) {
  switch (v) {
    case 'slot':
      return QuoteRateSource.slot;
    case 'vehicle':
      return QuoteRateSource.vehicle;
    case 'lot':
    case 'base':
      return QuoteRateSource.lot;
    default:
      return QuoteRateSource.unknown;
  }
}

int _asInt(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? 0;
}

class BookingQuote {
  final String spaceId;
  final String slotId;
  final String slotLabel;
  final DateTime scheduledAt;
  final DateTime endAt;
  final int durationHours;

  final int hourlyRateUnit; // paisa / hour
  final QuoteRateSource rateSource;
  final int baseAmountUnit; // paisa, before discount
  final int discountUnit; // paisa
  final int amountUnit; // paisa, what the driver pays
  final double totalPrice; // BDT

  const BookingQuote({
    required this.spaceId,
    required this.slotId,
    required this.slotLabel,
    required this.scheduledAt,
    required this.endAt,
    required this.durationHours,
    required this.hourlyRateUnit,
    required this.rateSource,
    required this.baseAmountUnit,
    required this.discountUnit,
    required this.amountUnit,
    required this.totalPrice,
  });

  // Paisa -> BDT helpers for the UI.
  double get hourlyRate => hourlyRateUnit / 100.0;
  double get baseAmount => baseAmountUnit / 100.0;
  double get discount => discountUnit / 100.0;
  bool get hasDiscount => discountUnit > 0;

  factory BookingQuote.fromJson(Map<String, dynamic> json) {
    final scheduled =
        DateTime.tryParse(json['scheduled_at']?.toString() ?? '') ??
            DateTime.now();
    final duration = _asInt(json['duration_hours']);
    final end = DateTime.tryParse(json['end_at']?.toString() ?? '') ??
        scheduled.add(Duration(hours: duration == 0 ? 1 : duration));

    final amountUnit = _asInt(json['amount_unit']);
    final totalRaw = json['total_price'];

    return BookingQuote(
      spaceId: json['space_id']?.toString() ?? '',
      slotId: json['slot_id']?.toString() ?? '',
      slotLabel: json['slot_label']?.toString() ?? '',
      scheduledAt: scheduled.toLocal(),
      endAt: end.toLocal(),
      durationHours: duration,
      hourlyRateUnit: _asInt(json['hourly_rate_unit']),
      rateSource: _rateSourceFrom(json['rate_source']?.toString()),
      baseAmountUnit: _asInt(json['base_amount_unit']),
      discountUnit: _asInt(json['discount_unit']),
      amountUnit: amountUnit,
      totalPrice:
          totalRaw is num ? totalRaw.toDouble() : amountUnit / 100.0,
    );
  }
}

/// Thrown by BookingService.getQuote so the UI can tell
/// "slot not free" (409) from other failures.
class QuoteException implements Exception {
  final String message;
  final int? statusCode;
  const QuoteException(this.message, {this.statusCode});

  /// 409 = slot not free / no free slot for this time.
  bool get isSlotUnavailable => statusCode == 409;

  @override
  String toString() => message;
}