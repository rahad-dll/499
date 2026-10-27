// lib/widgets/dashboard/parking_info_section.dart
//
// Extra info for ParkingDetailsSheet, built ONLY from data that
// GET /spaces/nearby already returns (that endpoint is public):
//   - description
//   - per-slot live status (empty / booked / occupied)
//   - "may be outdated" note when the backend flags the data as stale
//
// GET /spaces/{id} is owner/admin only on the backend (drivers get 403),
// so it is deliberately NOT used here.
import 'package:flutter/material.dart';

import '../../models/parking_model.dart';
import 'dashboard_colors.dart';

class ParkingInfoSection extends StatelessWidget {
  const ParkingInfoSection({super.key, required this.parking});

  final ParkingModel parking;

  static bool hasContent(ParkingModel p) =>
      (p.description != null && p.description!.trim().isNotEmpty) ||
      p.slotStatuses.isNotEmpty;

  static const Color _free = Color(0xFF22C55E);
  static const Color _booked = Color(0xFFF59E0B);
  static const Color _occupied = Color(0xFFEF4444);
  static const Color _unknown = Color(0xFF9CA3AF);

  static Color _colorFor(SlotStatus s) {
    switch (s.label) {
      case 'empty':
        return _free;
      case 'booked':
        return _booked;
      case 'occupied':
        return _occupied;
      default:
        return _unknown;
    }
  }

  // backend slot_id = "<spaceId>-<slotLabel>"  ->  "<slotLabel>"
  String _slotName(SlotStatus s) {
    final prefix = '${parking.id}-';
    return s.slotId.startsWith(prefix)
        ? s.slotId.substring(prefix.length)
        : s.slotId;
  }

  String? _updatedAgo() {
    DateTime? latest;
    for (final s in parking.slotStatuses) {
      final t = s.lastUpdated;
      if (t != null && (latest == null || t.isAfter(latest))) latest = t;
    }
    if (latest == null) return null;
    final diff = DateTime.now().difference(latest);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours} h ago';
    return '${diff.inDays} d ago';
  }

  @override
  Widget build(BuildContext context) {
    final desc = parking.description?.trim();
    final slots = parking.slotStatuses;

    final free = slots.where((s) => s.label == 'empty').length;
    final booked = slots.where((s) => s.label == 'booked').length;
    final occupied = slots.where((s) => s.label == 'occupied').length;
    final ago = _updatedAgo();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (desc != null && desc.isNotEmpty) ...[
          Text(
            desc,
            style: const TextStyle(
              fontSize: 13,
              height: 1.4,
              color: DashColors.label,
            ),
          ),
          if (slots.isNotEmpty) const SizedBox(height: 16),
        ],
        if (slots.isNotEmpty) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Live slots',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: DashColors.label,
                ),
              ),
              if (ago != null)
                Text(
                  'Updated $ago',
                  style: const TextStyle(
                    fontSize: 11,
                    color: DashColors.muted,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 14,
            runSpacing: 6,
            children: [
              _LegendDot(color: _free, text: 'Free $free'),
              _LegendDot(color: _booked, text: 'Booked $booked'),
              _LegendDot(color: _occupied, text: 'Occupied $occupied'),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: slots.map((s) {
              final color = _colorFor(s);
              return Container(
                constraints: const BoxConstraints(minWidth: 44),
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: color.withValues(alpha: 0.45)),
                ),
                child: Text(
                  _slotName(s),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              );
            }).toList(),
          ),
          if (parking.isStale) ...[
            const SizedBox(height: 8),
            const Row(
              children: [
                Icon(Icons.info_outline_rounded,
                    size: 14, color: DashColors.muted),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Live data may be outdated',
                    style: TextStyle(fontSize: 11, color: DashColors.muted),
                  ),
                ),
              ],
            ),
          ],
        ],
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.text});

  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          text,
          style: const TextStyle(fontSize: 11, color: DashColors.subtle),
        ),
      ],
    );
  }
}
