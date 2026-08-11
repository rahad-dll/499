// lib/services/deleted_bookings_service.dart
import 'package:flutter/material.dart';
import '../models/booking_model.dart';

class DeletedBookingsService {
  static final DeletedBookingsService _instance = DeletedBookingsService._internal();
  factory DeletedBookingsService() => _instance;
  
  DeletedBookingsService._internal();
  
  // Set of deleted booking IDs
  final Set<String> _deletedIds = {};
  
  // Get all deleted IDs
  Set<String> get deletedIds => Set.unmodifiable(_deletedIds);
  
  // Add a booking ID to deleted list
  void addDeletedId(String id) {
    _deletedIds.add(id);
    debugPrint('Deleted booking added: $id');
  }
  
  // Check if a booking is deleted
  bool isDeleted(String id) {
    return _deletedIds.contains(id);
  }
  
  // Remove from deleted list (if needed)
  void removeDeletedId(String id) {
    _deletedIds.remove(id);
  }
  
  // Clear all deleted IDs
  void clearAll() {
    _deletedIds.clear();
  }
  
  // Filter bookings to exclude deleted ones
  List<BookingModel> filterBookings(List<BookingModel> bookings) {
    return bookings.where((b) => !_deletedIds.contains(b.id)).toList();
  }
}