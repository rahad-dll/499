// lib/widgets/dashboard/parking_details_sheet.dart
import 'dart:ui';

import 'package:flutter/material.dart';

import '../../models/parking_model.dart';
import 'dashboard_colors.dart';

/// Parking-এ tap করলে যে draggable bottom sheet খোলে।
/// Navigate / Book চাপলে আগে sheet বন্ধ হয়, তারপর callback চলে।
class ParkingDetailsSheet extends StatelessWidget {
  const ParkingDetailsSheet({
    super.key,
    required this.parking,
    required this.onNavigate,
    required this.onBook,
  });

  final ParkingModel parking;
  final VoidCallback onNavigate;
  final VoidCallback onBook;

  static Future<void> show(
    BuildContext context, {
    required ParkingModel parking,
    required VoidCallback onNavigate,
    required VoidCallback onBook,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ParkingDetailsSheet(
        parking: parking,
        onNavigate: onNavigate,
        onBook: onBook,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.58,
      minChildSize: 0.30,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              decoration: BoxDecoration(
                color: DashColors.card.withValues(alpha: 0.97),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(32)),
                border: Border.all(
                  color: DashColors.teal.withValues(alpha: 0.10),
                  width: 1,
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const _DragHandle(),
                  Expanded(
                    child: SingleChildScrollView(
                      controller: scrollController,
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _SheetHeader(parking: parking),
                          const SizedBox(height: 18),
                          _StatsRow(parking: parking),
                          if (parking.totalSpots > 0) ...[
                            const SizedBox(height: 18),
                            _OccupancyBar(parking: parking),
                          ],
                          if (parking.amenities.isNotEmpty) ...[
                            const SizedBox(height: 18),
                            _AmenitiesSection(parking: parking),
                          ],
                          const SizedBox(height: 20),
                          _ActionButtons(
                            parking: parking,
                            onNavigate: onNavigate,
                            onBook: onBook,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Private pieces
// ---------------------------------------------------------------------------

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(top: 12),
        width: 48,
        height: 4,
        decoration: BoxDecoration(
          color: DashColors.handle,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}

class _SheetHeader extends StatelessWidget {
  const _SheetHeader({required this.parking});

  final ParkingModel parking;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                parking.name,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: DashColors.title,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(
                    Icons.location_on_rounded,
                    size: 16,
                    color: DashColors.muted,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      parking.address.isNotEmpty
                          ? parking.address
                          : 'Location unavailable',
                      style: const TextStyle(
                        fontSize: 13,
                        color: DashColors.subtle,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        _StatusPill(parking: parking),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.parking});

  final ParkingModel parking;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            parking.availabilityColor.withValues(alpha: 0.20),
            parking.availabilityColor.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: parking.availabilityColor.withValues(alpha: 0.30),
          width: 1.2,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: parking.availabilityColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            parking.availabilityStatus,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: parking.availabilityColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.parking});

  final ParkingModel parking;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _DetailChip(
          icon: Icons.local_parking_rounded,
          value: '${parking.availableSpots}',
          label: 'Available',
          color: parking.availabilityColor,
        ),
        const SizedBox(width: 8),
        _DetailChip(
          icon: Icons.timer_rounded,
          value: parking.formattedRate,
          label: 'Per Hour',
        ),
        const SizedBox(width: 8),
        _DetailChip(
          icon: Icons.near_me_rounded,
          value: parking.formattedDistance,
          label: 'Distance',
        ),
      ],
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({
    required this.icon,
    required this.value,
    required this.label,
    this.color,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: DashColors.cardAlt,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: DashColors.border, width: 1),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color ?? DashColors.teal),
            const SizedBox(height: 4),
            Text(
              value,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: DashColors.title,
              ),
            ),
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: DashColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OccupancyBar extends StatelessWidget {
  const _OccupancyBar({required this.parking});

  final ParkingModel parking;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Occupancy',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: DashColors.subtle,
                ),
              ),
              Text(
                '${(parking.occupancyRatio * 100).round()}%',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: DashColors.label,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: parking.occupancyRatio,
              minHeight: 8,
              backgroundColor: DashColors.border,
              valueColor: AlwaysStoppedAnimation<Color>(
                parking.availabilityColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AmenitiesSection extends StatelessWidget {
  const _AmenitiesSection({required this.parking});

  final ParkingModel parking;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Amenities',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: DashColors.label,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: parking.amenities.map((amenity) {
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    DashColors.teal.withValues(alpha: 0.12),
                    DashColors.blue.withValues(alpha: 0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: DashColors.teal.withValues(alpha: 0.20),
                ),
              ),
              child: Text(
                amenity,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: DashColors.title,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({
    required this.parking,
    required this.onNavigate,
    required this.onBook,
  });

  final ParkingModel parking;
  final VoidCallback onNavigate;
  final VoidCallback onBook;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              onNavigate();
            },
            icon: const Icon(Icons.navigation_rounded, size: 18),
            label: const Text('Navigate'),
            style: OutlinedButton.styleFrom(
              foregroundColor: DashColors.teal,
              side: const BorderSide(color: DashColors.teal, width: 1.4),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: Container(
            decoration: BoxDecoration(
              gradient:
                  parking.hasAvailableSpots ? DashColors.brandGradient : null,
              color: parking.hasAvailableSpots
                  ? null
                  : Colors.grey.withValues(alpha: 0.20),
              borderRadius: BorderRadius.circular(14),
            ),
            child: ElevatedButton.icon(
              onPressed: parking.hasAvailableSpots
                  ? () {
                      Navigator.pop(context);
                      onBook();
                    }
                  : null,
              icon: const Icon(Icons.bolt_rounded, size: 18),
              label: Text(
                parking.hasAvailableSpots ? 'Book Now' : 'Fully Booked',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}