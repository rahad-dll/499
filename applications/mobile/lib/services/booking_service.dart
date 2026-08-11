// lib/services/booking_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/booking_model.dart';
import '../models/parking_model.dart';
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
        return BookingModel.fromJson(data);
      }
    }
    throw Exception(_extractError(response));
  }

  /// NOTE: the backend has no DELETE /bookings/:id route — only
  /// PATCH /bookings/:id/cancel exists. There's no hard-delete of booking
  /// history today, so this cancels instead of removing. If you want a
  /// real "remove from my list" action, that needs a new endpoint from
  /// Rahad first — worth flagging to him.
  Future<void> deleteBooking(String bookingId) async {
    await updateStatus(bookingId, BookingStatus.cancelled);
  }
}