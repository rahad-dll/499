// lib/services/booking_events.dart
//
// Tiny app-wide "something changed about bookings" signal.
//
// Any screen that creates / cancels / removes a booking calls
// BookingEvents.notifyChanged(). Screens that show slot availability
// (the dashboard map + strip) listen and re-pull /spaces/nearby, so a
// cancelled booking frees its slot on the map immediately — no matter
// which screen the cancel happened on or how the user navigated there.
import 'package:flutter/foundation.dart';

class BookingEvents {
  BookingEvents._();

  static final ValueNotifier<int> _tick = ValueNotifier<int>(0);

  /// Listen to this (addListener / removeListener) to react to changes.
  static ValueListenable<int> get changes => _tick;

  static void notifyChanged() {
    _tick.value++;
  }
}
