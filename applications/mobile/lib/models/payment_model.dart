// lib/models/payment_model.dart
//
// Payments for bookings (backend payments.service.ts format()):
//   payment_id, booking_id, method, status, amount_unit, amount (BDT),
//   trx_id, paid_at, refunded_at, refund_amount_unit, created_at
//
// POST /payments/initiate also returns `checkout`:
//   bkash / nagad / card → { gateway: "dummy", trx_id, pay_url, note }
//   cash                 → { gateway: null, note }
// GET /payments rows also have: space_name, slot_label, scheduled_at

enum PaymentMethod { bkash, nagad, card, cash }

extension PaymentMethodX on PaymentMethod {
  /// Value the backend expects.
  String get apiValue => name;

  String get label {
    switch (this) {
      case PaymentMethod.bkash:
        return 'bKash';
      case PaymentMethod.nagad:
        return 'Nagad';
      case PaymentMethod.card:
        return 'Card';
      case PaymentMethod.cash:
        return 'Cash at the parking';
    }
  }

  /// Online methods go through the gateway (pay_url); cash stays pending.
  bool get isOnline => this != PaymentMethod.cash;
}

String paymentMethodLabel(String method) {
  switch (method) {
    case 'bkash':
      return 'bKash';
    case 'nagad':
      return 'Nagad';
    case 'card':
      return 'Card';
    case 'cash':
      return 'Cash';
    default:
      return method.isEmpty ? '-' : method;
  }
}

String paymentStatusLabel(String status) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    default:
      return status.isEmpty ? 'Unpaid' : status;
  }
}

int _intOf(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? 0;
}

DateTime? _dateOrNull(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString())?.toLocal();
}

String? _stringOrNull(dynamic v) {
  final s = v?.toString().trim();
  return (s == null || s.isEmpty) ? null : s;
}

class PaymentCheckout {
  final String? gateway; // "dummy" or null for cash
  final String? trxId;
  final String? payUrl; // relative path, e.g. /payments/dummy/XYZ/pay
  final String? note;

  const PaymentCheckout({this.gateway, this.trxId, this.payUrl, this.note});

  bool get hasGateway => payUrl != null && payUrl!.isNotEmpty;

  factory PaymentCheckout.fromJson(Map<String, dynamic> json) {
    return PaymentCheckout(
      gateway: _stringOrNull(json['gateway']),
      trxId: _stringOrNull(json['trx_id']),
      payUrl: _stringOrNull(json['pay_url']),
      note: _stringOrNull(json['note']),
    );
  }
}

class PaymentModel {
  final String paymentId;
  final String bookingId;
  final String method;
  final String status; // pending | paid | failed | refunded
  final int amountUnit; // paisa
  final double amount; // BDT
  final String? trxId;
  final DateTime? paidAt;
  final DateTime? refundedAt;
  final int? refundAmountUnit;
  final DateTime? createdAt;

  // list rows only
  final String? spaceName;
  final String? slotLabel;
  final DateTime? scheduledAt;

  // initiate only
  final PaymentCheckout? checkout;

  const PaymentModel({
    required this.paymentId,
    required this.bookingId,
    required this.method,
    required this.status,
    required this.amountUnit,
    required this.amount,
    this.trxId,
    this.paidAt,
    this.refundedAt,
    this.refundAmountUnit,
    this.createdAt,
    this.spaceName,
    this.slotLabel,
    this.scheduledAt,
    this.checkout,
  });

  bool get isPaid => status == 'paid';
  bool get isPending => status == 'pending';
  bool get isFailed => status == 'failed';
  bool get isRefunded => status == 'refunded';

  double get refundAmount => (refundAmountUnit ?? 0) / 100.0;

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    final amountUnit = _intOf(json['amount_unit']);
    final amountRaw = json['amount'];
    final checkoutRaw = json['checkout'];
    final refundRaw = json['refund_amount_unit'];

    return PaymentModel(
      paymentId: (json['payment_id'] ?? json['id'] ?? '').toString(),
      bookingId: json['booking_id']?.toString() ?? '',
      method: json['method']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      amountUnit: amountUnit,
      amount: amountRaw is num ? amountRaw.toDouble() : amountUnit / 100.0,
      trxId: _stringOrNull(json['trx_id']),
      paidAt: _dateOrNull(json['paid_at']),
      refundedAt: _dateOrNull(json['refunded_at']),
      refundAmountUnit: refundRaw == null ? null : _intOf(refundRaw),
      createdAt: _dateOrNull(json['created_at']),
      spaceName: _stringOrNull(json['space_name']),
      slotLabel: _stringOrNull(json['slot_label']),
      scheduledAt: _dateOrNull(json['scheduled_at']),
      checkout: checkoutRaw is Map<String, dynamic>
          ? PaymentCheckout.fromJson(checkoutRaw)
          : null,
    );
  }
}

/// One page of GET /payments → { data, page, limit, total }.
class PaymentPage {
  final List<PaymentModel> items;
  final int page;
  final int limit;
  final int total;

  const PaymentPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
  });

  bool get hasMore => page * limit < total;
}
