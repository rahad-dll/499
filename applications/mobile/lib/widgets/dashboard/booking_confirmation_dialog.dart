// lib/widgets/dashboard/booking_confirmation_dialog.dart
import 'package:flutter/material.dart';

import '../../models/parking_model.dart';
import 'dashboard_colors.dart';

/// Booking শেষ হলে "Booking Confirmed!" dialog দেখায়।
/// "View Bookings" চাপলে dialog বন্ধ হয়ে [onViewBookings] চলে।
Future<void> showBookingConfirmationDialog(
  BuildContext context, {
  required ParkingModel parking,
  required int hours,
  required VoidCallback onViewBookings,
}) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => _BookingConfirmationDialog(
      parking: parking,
      hours: hours,
      onViewBookings: onViewBookings,
    ),
  );
}

class _BookingConfirmationDialog extends StatelessWidget {
  const _BookingConfirmationDialog({
    required this.parking,
    required this.hours,
    required this.onViewBookings,
  });

  final ParkingModel parking;
  final int hours;
  final VoidCallback onViewBookings;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Colors.white, Color(0xFFF8FAFC)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: DashColors.teal.withValues(alpha: 0.20)),
          boxShadow: [
            BoxShadow(
              color: DashColors.teal.withValues(alpha: 0.20),
              blurRadius: 40,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: DashColors.brandGradient,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 40),
            ),
            const SizedBox(height: 16),
            const Text(
              'Booking Confirmed!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: DashColors.title,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              parking.name,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: DashColors.teal,
              ),
            ),
            const SizedBox(height: 16),
            _SummaryRow(parking: parking, hours: hours),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      onViewBookings();
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: DashColors.teal,
                      side: const BorderSide(color: DashColors.teal, width: 1.2),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('View Bookings'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: DashColors.brandGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Got it'),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.parking, required this.hours});

  final ParkingModel parking;
  final int hours;

  @override
  Widget build(BuildContext context) {
    const textStyle = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: DashColors.label,
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: DashColors.cardAlt,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DashColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.access_time_rounded, color: DashColors.teal, size: 18),
          const SizedBox(width: 8),
          Text('$hours hour${hours > 1 ? 's' : ''} booked', style: textStyle),
          const SizedBox(width: 16),
          Container(width: 1, height: 20, color: DashColors.handle),
          const SizedBox(width: 16),
          const Icon(Icons.location_on_rounded, color: DashColors.teal, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(parking.formattedDistance, style: textStyle),
          ),
        ],
      ),
    );
  }
}