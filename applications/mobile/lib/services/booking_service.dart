// lib/services/booking_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/booking_model.dart';
import '../models/parking_model.dart';
import 'session_service.dart';

class BookingService {
  static const String _baseUrl = 'https://four99-b6wg.onrender.com';

  Future<String> _getToken() async {
    final user = await SessionService.getSession();
    return user?.id ?? '';
  }

  Future<List<BookingModel>> getBookings() async {
    try {
      final token = await _getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/bookings'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Handle both List and Map responses
        List<dynamic> bookingsData = [];
        if (data is List) {
          bookingsData = data;
        } else if (data is Map && data['data'] != null) {
          bookingsData = data['data'] is List ? data['data'] : [];
        } else if (data is Map) {
          // If it's a single booking object
          bookingsData = [data];
        }
        
        return bookingsData.map((json) {
          // Convert Map<dynamic, dynamic> to Map<String, dynamic>
          final Map<String, dynamic> convertedJson = {};
          json.forEach((key, value) {
            convertedJson[key.toString()] = value;
          });
          return BookingModel.fromJson(convertedJson);
        }).toList();
      }
      return [];
    } catch (e) {
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
    
    final payload = {
      'space_id': space.id,
      'slot_id': space.id,
      'scheduled_at': startTime.toIso8601String(),
      'duration_hours': durationHours,
      'vehicle_plate': vehiclePlate ?? '',
    };

    final response = await http.post(
      Uri.parse('$_baseUrl/bookings'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(payload),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = jsonDecode(response.body);
      
      // Convert Map<dynamic, dynamic> to Map<String, dynamic>
      final Map<String, dynamic> convertedJson = {};
      data.forEach((key, value) {
        convertedJson[key.toString()] = value;
      });
      
      // যদি response এ booking data আসে
      if (convertedJson['id'] != null) {
        return BookingModel.fromJson(convertedJson);
      }
      
      // যদি response এ শুধু success message আসে
      return BookingModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        spaceId: space.id,
        slotId: space.id,
        spaceName: space.name,
        spaceAddress: space.address,
        latitude: space.latitude,
        longitude: space.longitude,
        scheduledAt: startTime,
        durationHours: durationHours,
        pricePerHour: space.rate ?? 0,
        totalPrice: (space.rate ?? 0) * durationHours,
        status: BookingStatus.confirmed,
        vehiclePlate: vehiclePlate,
        createdAt: DateTime.now(),
      );
    } else {
      throw Exception('Failed to create booking: ${response.statusCode}');
    }
  }

  Future<BookingModel> updateStatus(String bookingId, BookingStatus status) async {
    final token = await _getToken();
    
    final response = await http.patch(
      Uri.parse('$_baseUrl/bookings/$bookingId'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'status': bookingStatusToString(status),
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      
      // Convert Map<dynamic, dynamic> to Map<String, dynamic>
      final Map<String, dynamic> convertedJson = {};
      data.forEach((key, value) {
        convertedJson[key.toString()] = value;
      });
      
      return BookingModel.fromJson(convertedJson);
    } else {
      throw Exception('Failed to update booking status');
    }
  }

  Future<void> deleteBooking(String bookingId) async {
    final token = await _getToken();
    
    final response = await http.delete(
      Uri.parse('$_baseUrl/bookings/$bookingId'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to delete booking');
    }
  }
}