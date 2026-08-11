import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/booking_model.dart';
import '../models/parking_model.dart';

class BookingService {
  static bool useLocalMock = true;

  // ignore: unused_field
  static const String _baseUrl = 'https://four99-b6wg.onrender.com';
  static const String _storageKey = 'cp_bookings_v1';

  Future<List<BookingModel>> getBookings() async {
    if (useLocalMock) {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw == null) return [];
      final List decoded = jsonDecode(raw);
      final bookings =
          decoded.map((e) => BookingModel.fromJson(e)).toList();
      bookings.sort((a, b) => b.startTime.compareTo(a.startTime));
      return bookings;
    }

    // TODO(real API): GET $_baseUrl/bookings  (send Authorization header)
    // final res = await http.get(Uri.parse('$_baseUrl/bookings'), headers: authHeaders);
    // return (jsonDecode(res.body) as List).map((e) => BookingModel.fromJson(e)).toList();
    throw UnimplementedError(
        'Real bookings API not wired yet — set useLocalMock = false once the endpoint exists.');
  }

  Future<BookingModel?> getBookingById(String id) async {
    final all = await getBookings();
    try {
      return all.firstWhere((b) => b.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<BookingModel> createBooking({
    required ParkingModel space,
    required DateTime startTime,
    required int durationHours,
    String? vehiclePlate,
  }) async {
    // Use rate from parking model with null check
    final rate = space.rate ?? 0.0;
    
    final booking = BookingModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      spaceId: space.id,
      spaceName: space.name,
      spaceAddress: space.address,
      latitude: space.latitude,
      longitude: space.longitude,
      startTime: startTime,
      durationHours: durationHours,
      pricePerHour: rate, // Store rate in the booking
      totalPrice: rate * durationHours,
      status: BookingStatus.confirmed,
      vehiclePlate: vehiclePlate,
      createdAt: DateTime.now(),
    );

    if (useLocalMock) {
      final all = await getBookings();
      all.insert(0, booking);
      await _saveAll(all);
      return booking;
    }

    // TODO(real API): POST $_baseUrl/bookings  body: booking.toJson()
    throw UnimplementedError('Real bookings API not wired yet.');
  }

  Future<void> deleteBooking(String id) async {
    if (useLocalMock) {
      final all = await getBookings();
      all.removeWhere((b) => b.id == id);
      await _saveAll(all);
      return;
    }

    // TODO(real API): DELETE $_baseUrl/bookings/$id
    throw UnimplementedError('Real bookings API not wired yet.');
  }

  Future<BookingModel> updateStatus(String id, BookingStatus status) async {
    if (useLocalMock) {
      final all = await getBookings();
      final index = all.indexWhere((b) => b.id == id);
      if (index == -1) throw Exception('Booking not found');
      final updated = all[index].copyWith(status: status);
      all[index] = updated;
      await _saveAll(all);
      return updated;
    }

    // TODO(real API): PATCH $_baseUrl/bookings/$id  body: {"status": status.name}
    throw UnimplementedError('Real bookings API not wired yet.');
  }

  Future<void> _saveAll(List<BookingModel> bookings) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(bookings.map((b) => b.toJson()).toList());
    await prefs.setString(_storageKey, raw);
  }
}