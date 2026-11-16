// lib/widgets/dashboard/parking_card.dart
import 'package:flutter/material.dart';

import '../../models/parking_model.dart';
import 'dashboard_colors.dart';
import 'map_filter_bar.dart' show approxDriveTime;

/// নিচের horizontal strip-এর একটা parking card।
class ParkingCard extends StatelessWidget {
  const ParkingCard({
    super.key,
    required this.parking,
    required this.isSelected,
    required this.onTap,
    this.isBest = false,
    this.isSaved = false,
  });

  final ParkingModel parking;
  final bool isSelected;
  final VoidCallback onTap;

  /// The lot the app recommends right now.
  final bool isBest;

  /// The driver saved this lot.
  final bool isSaved;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        width: 190,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  colors: [
                    DashColors.teal.withValues(alpha: 0.08),
                    DashColors.blue.withValues(alpha: 0.03),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: DashColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? DashColors.teal : DashColors.border,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? DashColors.teal.withValues(alpha: 0.20)
                  : Colors.black.withValues(alpha: 0.04),
              blurRadius: isSelected ? 16 : 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    parking.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: DashColors.title,
                      letterSpacing: -0.2,
                    ),
                  ),
                ),
                if (isSaved) ...[
                  const Icon(
                    Icons.favorite_rounded,
                    size: 13,
                    color: Color(0xFFE11D48),
                  ),
                  const SizedBox(width: 6),
                ],
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: parking.availabilityColor,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: parking.availabilityColor.withValues(alpha: 0.40),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                const Icon(
                  Icons.location_on_rounded,
                  size: 12,
                  color: DashColors.muted,
                ),
                const SizedBox(width: 2),
                Expanded(
                  child: Text(
                    '${parking.formattedDistance} · '
                    '${approxDriveTime(parking.distance)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      color: DashColors.muted,
                    ),
                  ),
                ),
              ],
            ),
            if (isBest) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5B301).withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.workspace_premium_rounded,
                      size: 12,
                      color: Color(0xFFB7791F),
                    ),
                    SizedBox(width: 4),
                    Text(
                      'Best pick',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFB7791F),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    parking.availabilityColor.withValues(alpha: 0.15),
                    parking.availabilityColor.withValues(alpha: 0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: parking.availabilityColor.withValues(alpha: 0.20),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    parking.isOpen ? '${parking.availableSpots} free' : 'Closed',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: parking.availabilityColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Text(
                    parking.formattedRate,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: DashColors.muted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  size: 16,
                  color: DashColors.chevron,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}