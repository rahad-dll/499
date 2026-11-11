// lib/services/booking_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/booking_model.dart';
import '../models/booking_quote_model.dart';
import '../models/parking_model.dart';
import 'api_service.dart';
import 'authed_http.dart';
import 'booking_events.dart';
import 'session_service.dart';

class BookingService {
  static const String _baseUrl = 'https://four99-b6wg.onrender.com';

  Future<String> _getToken() async {
    // Real JWT access token — NOT the user id. The backend's JwtAuthGuard
    // rejects anything that isn't a signed token, which is what was
    // causing every request here to 401.
    final token = await SessionService.getAccessToken();
    return token ?? '';
  }

  Map<String, String> _headers(String token) => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

  /// Pulls a readable message out of a NestJS error body,
  /// e.g. { "message": "Slot not found in this space", "statusCode": 404 }
  String _extractError(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['message'] != null) {
        final msg = decoded['message'];
        return msg is List ? msg.join(', ') : msg.toString();
      }
    } catch (_) {
      // not JSON, fall through
    }
    return 'Something went wrong (status ${response.statusCode})';
  }

  Future<List<BookingModel>> getBookings() async {
    try {
      final token = await _getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/bookings'),
        headers: _headers(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        List<dynamic> bookingsData = [];
        if (data is List) {
          bookingsData = data;
        } else if (data is Map && data['data'] != null) {
          bookingsData = data['data'] is List ? data['data'] : [];
        } else if (data is Map) {
          bookingsData = [data];
        }

        return bookingsData
            .whereType<Map<String, dynamic>>()
            .map((json) => BookingModel.fromJson(json))
            .toList();
      }
      return [];
    } catch (e) {
      // ignore: avoid_print
      print('Error fetching bookings: $e');
      return [];
    }
  }

  /// GET /bookings/{id} — fresh copy of one booking (status can change on
  /// the server). Retries once after a token refresh if the token expired.
  Future<BookingModel> getBooking(String bookingId) async {
    final response = await AuthedHttp.get('/bookings/$bookingId');

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        return BookingModel.fromJson(data);
      }
      throw Exception('Unexpected response from server');
    }
    if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    }
    throw Exception(ApiService.extractErrorMessage(response));
  }

  /// How many slots of [spaceId] are free for the whole window
  /// [from, from + durationHours). Uses GET /spaces/{id}/slots?from&to, which
  /// already skips slots that have a live booking overlapping the window —
  /// so a slot taken 10:00-11:00 still counts as free for 14:00-15:00.
  Future<int> getFreeSlotCount({
    required String spaceId,
    required DateTime from,
    required int durationHours,
  }) async {
    final to = from.add(Duration(hours: durationHours));
    final query = 'from=${Uri.encodeQueryComponent(from.toUtc().toIso8601String())}'
        '&to=${Uri.encodeQueryComponent(to.toUtc().toIso8601String())}';
    final response = await AuthedHttp.get('/spaces/$spaceId/slots?$query');

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is List) return data.length;
      if (data is Map && data['data'] is List) {
        return (data['data'] as List).length;
      }
      throw Exception('Unexpected response from server');
    }
    if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    }
    throw Exception(ApiService.extractErrorMessage(response));
  }

  /// POST /bookings/quote — price a booking BEFORE making it.
  /// Returns the slot POST /bookings would pick right now and its price
  /// (slot price -> vehicle rate -> lot price). Nothing is reserved, so the
  /// slot can still be taken before the real booking.
  ///
  /// Throws [QuoteException]; `isSlotUnavailable` is true for 409
  /// (slot not free / no free slot for this time).
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

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) return BookingQuote.fromJson(data);
      throw const QuoteException('Unexpected response from server');
    }
    if (response.statusCode == 401) {
      throw const QuoteException(
        'Session expired. Please sign in again.',
        statusCode: 401,
      );
    }
    throw QuoteException(
      ApiService.extractErrorMessage(response),
      statusCode: response.statusCode,
    );
  }

  /// Max bookings a driver may hold at once (upcoming + ongoing).
  static const int maxLiveBookings = 2;

  /// Throws a readable error if this driver already has too many live
  /// bookings, or one that overlaps the requested time window.
  Future<void> _assertCanBook({
    required DateTime startTime,
    required int durationHours,
  }) async {
    final now = DateTime.now();
    final newEnd = startTime.add(Duration(hours: durationHours));

    final live = (await getBookings()).where((b) {
      final isLiveStatus = b.status == BookingStatus.confirmed ||
          b.status == BookingStatus.pending ||
          b.status == BookingStatus.active;
      return isLiveStatus && b.endTime.isAfter(now);
    }).toList();

    if (live.length >= maxLiveBookings) {
      throw Exception(
        'You already have ${live.length} active/upcoming bookings '
        '(max $maxLiveBookings). Cancel one or wait until it ends.',
      );
    }

    final clash = live.any(
      (b) => b.scheduledAt.isBefore(newEnd) && b.endTime.isAfter(startTime),
    );
    if (clash) {
      throw Exception(
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
  }) async {
    final token = await _getToken();
    if (token.isEmpty) {
      throw Exception('You need to sign in again before booking.');
    }

    // Client-side guard (the backend enforces the same rules, but this
    // gives an instant message and also protects while an older backend
    // build is still deployed).
    await _assertCanBook(startTime: startTime, durationHours: durationHours);

    // No slot_id here on purpose — the nearby-spaces list only gives us
    // counts, not individual slot ids, and sending the space's own id as
    // slot_id was the "Slot not found" bug. Leaving it out lets the
    // backend auto-pick the first free slot in this space.
    final payload = BookingModel.createPayload(
      spaceId: space.id,
      scheduledAt: startTime,
      durationHours: durationHours,
      vehiclePlate: vehiclePlate,
    );

    final response = await http.post(
      Uri.parse('$_baseUrl/bookings'),
      headers: _headers(token),
      body: jsonEncode(payload),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        // A slot is now taken -> let the dashboard re-pull its counts.
        BookingEvents.notifyChanged();
        return BookingModel.fromJson(data);
      }
      throw Exception('Unexpected response from server');
    }

    if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    }
    if (response.statusCode == 400 &&
        _extractError(response).toLowerCase().contains('driver profile')) {
      throw Exception('Complete your driver profile before booking.');
    }

    throw Exception(_extractError(response));
  }

  /// Cancels a booking. The backend only supports cancellation — there's
  /// no generic "set any status" endpoint — so this throws for anything
  /// other than BookingStatus.cancelled.
  Future<BookingModel> updateStatus(String bookingId, BookingStatus status) async {
    if (status != BookingStatus.cancelled) {
      throw Exception(
        'Only cancelling a booking is supported right now.',
      );
    }

    final token = await _getToken();
    final response = await http.patch(
      Uri.parse('$_baseUrl/bookings/$bookingId/cancel'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        // Slot is free again on the server -> refresh availability everywhere.
        BookingEvents.notifyChanged();
        return BookingModel.fromJson(data);
      }
    }
    if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    }
    throw Exception(_extractError(response));
  }

  /// DELETE /bookings/{id} — removes a finished or cancelled booking from
  /// the driver's history (soft delete on the server). The backend refuses
  /// to hide a booking that is still active, so the user must cancel first.
  Future<void> deleteBooking(String bookingId) async {
    final response = await AuthedHttp.delete('/bookings/$bookingId');
    if (response.statusCode == 200 || response.statusCode == 204) {
      BookingEvents.notifyChanged();
      return;
    }
    if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    }
    throw Exception(ApiService.extractErrorMessage(response));
  }
}