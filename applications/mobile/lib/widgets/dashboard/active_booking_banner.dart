// lib/widgets/dashboard/active_booking_banner.dart
//
// A slim card on the map for the driver's live booking (upcoming or parked
// right now): where it is, when it starts / ends, and one tap to drive
// there or open it. Hidden when there is no live booking.
import 'package:flutter/material.dart';

import '../../models/booking_model.dart';
import 'dashboard_colors.dart';

class ActiveBookingBanner extends StatelessWidget {
  const ActiveBookingBanner({
    super.key,
    required this.booking,
    required this.onOpen,
    required this.onNavigate,
  });

  final BookingModel booking;
  final VoidCallback onOpen;
  final VoidCallback onNavigate;

  String _clock(DateTime t) {
    final hour12 = t.hour % 12 == 0 ? 12 : t.hour % 12;
    final minute = t.minute.toString().padLeft(2, '0');
    return '$hour12:$minute ${t.hour >= 12 ? 'PM' : 'AM'}';
  }

  String _in(Duration d) {
    if (d.inMinutes < 1) return 'now';
    if (d.inMinutes < 60) return 'in ${d.inMinutes} min';
    if (d.inHours < 24) {
      final m = d.inMinutes % 60;
      return m == 0 ? 'in ${d.inHours} h' : 'in ${d.inHours} h $m min';
    }
    return 'in ${d.inDays} day${d.inDays == 1 ? '' : 's'}';
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final b = booking;

    final String status;
    if (b.isParkedNow) {
      status = 'Parked · until ${_clock(b.endTime)}';
    } else if (now.isBefore(b.scheduledAt)) {
      status = 'Starts ${_in(b.scheduledAt.difference(now))}';
    } else {
      status = 'Started · check in before ${_clock(b.endTime)}';
    }
    final slot = b.slotLabel.trim();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.fromLTRB(12, 9, 8, 9),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF172033), Color(0xFF24324D)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.22),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(
                  gradient: DashColors.brandGradient,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  b.isParkedNow
                      ? Icons.local_parking_rounded
                      : Icons.event_available_rounded,
                  size: 18,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      slot.isEmpty ? b.spaceName : '${b.spaceName} · $slot',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      status,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFFB8C4D9),
                      ),
                    ),
                  ],
                ),
              ),
              if (!b.isParkedNow)
                TextButton.icon(
                  onPressed: onNavigate,
                  icon: const Icon(Icons.navigation_rounded, size: 16),
                  label: const Text('Go'),
                  style: TextButton.styleFrom(
                    foregroundColor: DashColors.teal,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    minimumSize: const Size(0, 36),
                    textStyle: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                )
              else
                const Padding(
                  padding: EdgeInsets.only(right: 4),
                  child: Icon(
                    Icons.chevron_right_rounded,
                    color: Color(0xFFB8C4D9),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
