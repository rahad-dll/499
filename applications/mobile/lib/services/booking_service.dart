// lib/services/booking_service.dart
//
// Driver booking API:
//   POST   /bookings/quote            price a booking (nothing reserved)
//   POST   /bookings                  create
//   GET    /bookings                  my bookings { data, page, limit, total }
//                                    filters: status (csv), from, to; paging
//   GET    /bookings/{id}             one booking (incl. payment)
//   PATCH  /bookings/{id}/cancel      cancel (paid → refunded in full)
//   POST   /bookings/{id}/check-in    arrived (QR code or GPS within 200 m)
//   POST   /bookings/{id}/check-out   left (overstay charged per hour)
//   POST   /bookings/{id}/extend      more hours on the same slot
//   DELETE /bookings/{id}             hide a finished booking
//
// Every call goes through AuthedHttp (one automatic token refresh on 401).
import '../models/booking_model.dart';
import '../models/booking_quote_model.dart';
import '../models/parking_model.dart';
import 'authed_http.dart';
import 'booking_events.dart';
import 'session_service.dart';

class BookingService {
  /// Max bookings a driver may hold at once (upcoming + ongoing).
  static const int maxLiveBookings = 2;

  /// Backend max page size.
  static const int maxPageSize = 100;

  BookingModel _bookingFrom(dynamic data) {
    if (data is Map<String, dynamic>) return BookingModel.fromJson(data);
    throw const ApiException('Unexpected response from server');
  }

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  /// One page of GET /bookings.
  /// [statuses] → `status=confirmed,completed`; [from]/[to] filter the start
  /// time ([from] inclusive, [to] exclusive).
  Future<BookingPage> getBookingsPage({
    List<BookingStatus>? statuses,
    DateTime? from,
    DateTime? to,
    int page = 1,
    int limit = 50,
  }) async {
    final int safeLimit =
        limit < 1 ? 1 : (limit > maxPageSize ? maxPageSize : limit);
    final path = AuthedHttp.withQuery('/bookings', {
      'status': (statuses == null || statuses.isEmpty)
          ? null
          : statuses.map(bookingStatusToString).toSet().join(','),
      'from': from?.toUtc().toIso8601String(),
      'to': to?.toUtc().toIso8601String(),
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
      // older backend: bare list
      rows = data;
      total = data.length;
      currentLimit = data.isEmpty ? safeLimit : data.length;
    } else if (data is Map) {
      if (data['data'] is List) rows = data['data'] as List;
      final t = data['total'];
      final p = data['page'];
      final l = data['limit'];
      total = t is num ? t.toInt() : rows.length;
      if (p is num) currentPage = p.toInt();
      if (l is num && l > 0) currentLimit = l.toInt();
    }

    final items = rows
        .whereType<Map<String, dynamic>>()
        .map(BookingModel.fromJson)
        .toList();

    return BookingPage(
      items: items,
      page: currentPage,
      limit: currentLimit,
      total: total,
    );
  }

  /// All my bookings (walks every page). Same filters as [getBookingsPage].
  /// Throws [ApiException] on failure.
  Future<List<BookingModel>> getAllBookings({
    List<BookingStatus>? statuses,
    DateTime? from,
    DateTime? to,
  }) async {
    final all = <BookingModel>[];
    var page = 1;
    // hard stop so a misbehaving server can never loop forever
    while (page <= 50) {
      final result = await getBookingsPage(
        statuses: statuses,
        from: from,
        to: to,
        page: page,
        limit: maxPageSize,
      );
      all.addAll(result.items);
      if (!result.hasMore || result.items.isEmpty) break;
      page++;
    }
    return all;
  }

  /// Old call sites: every booking, empty list on any error.
  Future<List<BookingModel>> getBookings() async {
    try {
      return await getAllBookings();
    } catch (_) {
      return [];
    }
  }

  /// How many bookings I have in total (one tiny request).
  Future<int> getBookingCount({List<BookingStatus>? statuses}) async {
    final page = await getBookingsPage(statuses: statuses, limit: 1);
    return page.total;
  }

  // ---------------------------------------------------------------------------
  // One booking
  // ---------------------------------------------------------------------------

  /// GET /bookings/{id} — fresh copy (status, payment, check-in times).
  Future<BookingModel> getBooking(String bookingId) async {
    final response = await AuthedHttp.get('/bookings/$bookingId');
    if (AuthedHttp.isOk(response)) {
      return _bookingFrom(AuthedHttp.decode(response));
    }
    throw ApiException.fromResponse(response);
  }

  // ---------------------------------------------------------------------------
  // Availability + price
  // ---------------------------------------------------------------------------

  /// How many slots of [spaceId] are free for the whole window
  /// [from, from + durationHours). Uses GET /spaces/{id}/slots?from&to, which
  /// already skips slots that have a live booking overlapping the window.
  Future<int> getFreeSlotCount({
    required String spaceId,
    required DateTime from,
    required int durationHours,
  }) async {
    final to = from.add(Duration(hours: durationHours));
    final path = AuthedHttp.withQuery('/spaces/$spaceId/slots', {
      'from': from.toUtc().toIso8601String(),
      'to': to.toUtc().toIso8601String(),
    });
    final response = await AuthedHttp.get(path);

    if (AuthedHttp.isOk(response)) {
      final data = AuthedHttp.decode(response);
      if (data is List) return data.length;
      if (data is Map && data['data'] is List) {
        return (data['data'] as List).length;
      }
      throw const ApiException('Unexpected response from server');
    }
    throw ApiException.fromResponse(response);
  }

  /// POST /bookings/quote — price a booking BEFORE making it.
  /// Returns the slot POST /bookings would pick right now and its price
  /// (slot price -> vehicle rate -> lot price). Nothing is reserved.
  ///
  /// Throws [QuoteException]; `isSlotUnavailable` is true for 409.
  Future<BookingQuote> getQuote({
    required String spaceId,
    required DateTime scheduledAt,
    required int durationHours,
    String? slotId,
  }) async {
    final response = await AuthedHttp.post('/bookings/quote', {
      'space_id': spaceId,
      if (slotId != null && slotId.isNotEmpty) 'slot_id': slotId,
      'scheduled_at': scheduledAt.toUtc().toIso8601String(),
      'duration_hours': durationHours,
    });

    if (AuthedHttp.isOk(response)) {
      final data = AuthedHttp.decode(response);
      if (data is Map<String, dynamic>) return BookingQuote.fromJson(data);
      throw const QuoteException('Unexpected response from server');
    }
    final error = ApiException.fromResponse(response);
    throw QuoteException(error.message, statusCode: response.statusCode);
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  /// Throws a readable error if this driver already has too many live
  /// bookings, or one that overlaps the requested time window. The backend
  /// enforces the same rules; this only gives an instant message.
  Future<void> _assertCanBook({
    required DateTime startTime,
    required int durationHours,
  }) async {
    List<BookingModel> live = const [];
    try {
      live = (await getAllBookings(
        statuses: const [BookingStatus.confirmed, BookingStatus.pending],
      ))
          .where((b) => b.isLive)
          .toList();
    } catch (_) {
      // can't check right now -> let the server decide
      return;
    }

    if (live.length >= maxLiveBookings) {
      throw ApiException(
        'You already have ${live.length} active/upcoming bookings '
        '(max $maxLiveBookings). Cancel one or wait until it ends.',
      );
    }

    final newEnd = startTime.add(Duration(hours: durationHours));
    final clash = live.any(
      (b) => b.scheduledAt.isBefore(newEnd) && b.endTime.isAfter(startTime),
    );
    if (clash) {
      throw const ApiException(
        'You already have a booking that overlaps this time. '
        'Pick a different time or cancel the other booking.',
      );
    }
  }

  Future<BookingModel> createBooking({
    required ParkingModel space,
    required DateTime startTime,
    required int durationHours,
    String? vehiclePlate,
    String? slotId,
  }) async {
    final token = await SessionService.getAccessToken();
    if (token == null || token.isEmpty) {
      throw const ApiException('You need to sign in again before booking.');
    }

    await _assertCanBook(startTime: startTime, durationHours: durationHours);

    final payload = BookingModel.createPayload(
      spaceId: space.id,
      scheduledAt: startTime,
      durationHours: durationHours,
      vehiclePlate: vehiclePlate,
      slotId: slotId,
    );

    final response = await AuthedHttp.post('/bookings', payload);

    if (AuthedHttp.isOk(response)) {
      final booking = _bookingFrom(AuthedHttp.decode(response));
      // A slot is now taken -> let the dashboard re-pull its counts.
      BookingEvents.notifyChanged();
      return booking;
    }

    final error = ApiException.fromResponse(response);
    if (response.statusCode == 400 &&
        error.message.toLowerCase().contains('driver profile')) {
      throw const ApiException(
        'Complete your driver profile before booking.',
        statusCode: 400,
      );
    }
    throw error;
  }

  // ---------------------------------------------------------------------------
  // Cancel / hide
  // ---------------------------------------------------------------------------

  /// PATCH /bookings/{id}/cancel. A paid booking is refunded in full.
  Future<BookingModel> cancelBooking(String bookingId) async {
    final response = await AuthedHttp.patch('/bookings/$bookingId/cancel');
    if (AuthedHttp.isOk(response)) {
      final booking = _bookingFrom(AuthedHttp.decode(response));
      BookingEvents.notifyChanged();
      return booking;
    }
    throw ApiException.fromResponse(response);
  }

  /// Kept for older call sites. The backend only supports cancellation.
  Future<BookingModel> updateStatus(
    String bookingId,
    BookingStatus status,
  ) async {
    if (status != BookingStatus.cancelled) {
      throw const ApiException(
        'Only cancelling a booking is supported right now.',
      );
    }
    return cancelBooking(bookingId);
  }

  /// DELETE /bookings/{id} — removes a finished or cancelled booking from
  /// the driver's history (soft delete on the server).
  Future<void> deleteBooking(String bookingId) async {
    final response = await AuthedHttp.delete('/bookings/$bookingId');
    if (AuthedHttp.isOk(response)) {
      BookingEvents.notifyChanged();
      return;
    }
    throw ApiException.fromResponse(response);
  }

  // ---------------------------------------------------------------------------
  // Check-in / check-out / extend
  // ---------------------------------------------------------------------------

  /// POST /bookings/{id}/check-in. Allowed from 15 minutes before the start
  /// until the end, only for a confirmed booking.
  /// If the slot has a QR sticker send [qrCode]; otherwise send the phone's
  /// [latitude]/[longitude] (must be within 200 m of the lot). Sending both
  /// is fine — the server uses whichever the slot needs.
  /// 409 = already checked in.
  Future<BookingModel> checkIn(
    String bookingId, {
    String? qrCode,
    double? latitude,
    double? longitude,
  }) async {
    final code = qrCode?.trim();
    final body = <String, dynamic>{
      if (code != null && code.isNotEmpty) 'qr_code': code,
      if (latitude != null && longitude != null) 'latitude': latitude,
      if (latitude != null && longitude != null) 'longitude': longitude,
    };
    final response =
        await AuthedHttp.post('/bookings/$bookingId/check-in', body);
    if (AuthedHttp.isOk(response)) {
      final booking = _bookingFrom(AuthedHttp.decode(response));
      BookingEvents.notifyChanged();
      return booking;
    }
    throw ApiException.fromResponse(response);
  }

  /// POST /bookings/{id}/check-out. Completes the booking. Leaving more than
  /// 10 minutes after the end is charged per started hour (overstayHours /
  /// overstayUnit on the result). 409 = already checked out.
  Future<BookingModel> checkOut(String bookingId) async {
    final response = await AuthedHttp.post('/bookings/$bookingId/check-out');
    if (AuthedHttp.isOk(response)) {
      final booking = _bookingFrom(AuthedHttp.decode(response));
      BookingEvents.notifyChanged();
      return booking;
    }
    throw ApiException.fromResponse(response);
  }

  /// POST /bookings/{id}/extend — [extraHours] (1-23) on the same slot; the
  /// whole booking stays within 24 hours. 409 = someone booked that time.
  Future<BookingModel> extend(String bookingId, int extraHours) async {
    final response = await AuthedHttp.post('/bookings/$bookingId/extend', {
      'extra_hours': extraHours,
    });
    if (AuthedHttp.isOk(response)) {
      final booking = _bookingFrom(AuthedHttp.decode(response));
      BookingEvents.notifyChanged();
      return booking;
    }
    throw ApiException.fromResponse(response);
  }
}
