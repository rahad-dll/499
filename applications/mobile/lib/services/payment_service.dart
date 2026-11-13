// lib/services/payment_service.dart
//
// POST /payments/initiate             -> start paying for a booking
// POST /payments/dummy/{trxId}/pay    -> dummy gateway: pay or decline
// GET  /payments?page&limit           -> my payments, newest first
//
// The gateway webhook (/payments/webhook/{gateway}) is server-to-server and
// is NOT called from the app.
import '../models/payment_model.dart';
import 'authed_http.dart';
import 'booking_events.dart';

class PaymentService {
  /// Creates (or replaces) the pending payment of [bookingId].
  /// Online methods return a checkout with pay_url; cash returns none and
  /// stays pending until the parking collects it.
  /// 409 = booking already paid or refunded.
  Future<PaymentModel> initiate({
    required String bookingId,
    required PaymentMethod method,
  }) async {
    final response = await AuthedHttp.post('/payments/initiate', {
      'booking_id': bookingId,
      'method': method.apiValue,
    });
    if (AuthedHttp.isOk(response)) {
      final data = AuthedHttp.decode(response);
      if (data is Map<String, dynamic>) {
        BookingEvents.notifyChanged();
        return PaymentModel.fromJson(data);
      }
      throw const ApiException('Unexpected response from server');
    }
    throw ApiException.fromResponse(response);
  }

  /// Dummy gateway. [success] true pays, false declines.
  /// [payUrl] is the checkout.pay_url from [initiate]; when it is missing
  /// the URL is built from [trxId].
  Future<PaymentModel> dummyPay({
    required String trxId,
    required bool success,
    String? payUrl,
  }) async {
    final path = (payUrl != null && payUrl.startsWith('/'))
        ? payUrl
        : '/payments/dummy/${Uri.encodeComponent(trxId)}/pay';

    final response = await AuthedHttp.post(path, {
      'result': success ? 'success' : 'failed',
    });
    if (AuthedHttp.isOk(response)) {
      final data = AuthedHttp.decode(response);
      if (data is Map<String, dynamic>) {
        BookingEvents.notifyChanged();
        return PaymentModel.fromJson(data);
      }
      throw const ApiException('Unexpected response from server');
    }
    throw ApiException.fromResponse(response);
  }

  /// One page of my payments (newest first). [limit] max 100.
  Future<PaymentPage> getPayments({int page = 1, int limit = 20}) async {
    final int safeLimit = limit < 1 ? 1 : (limit > 100 ? 100 : limit);
    final path = AuthedHttp.withQuery('/payments', {
      'page': '$page',
      'limit': '$safeLimit',
    });
    final response = await AuthedHttp.get(path);
    if (!AuthedHttp.isOk(response)) {
      throw ApiException.fromResponse(response);
    }

    final data = AuthedHttp.decode(response);
    List<dynamic> rows = const [];
    var total = 0;
    var currentPage = page;
    var currentLimit = safeLimit;

    if (data is List) {
      rows = data;
      total = data.length;
    } else if (data is Map) {
      if (data['data'] is List) rows = data['data'] as List;
      final t = data['total'];
      final p = data['page'];
      final l = data['limit'];
      total = t is num ? t.toInt() : rows.length;
      if (p is num) currentPage = p.toInt();
      if (l is num) currentLimit = l.toInt();
    }

    final items = rows
        .whereType<Map<String, dynamic>>()
        .map(PaymentModel.fromJson)
        .toList();

    return PaymentPage(
      items: items,
      page: currentPage,
      limit: currentLimit,
      total: total,
    );
  }
}
