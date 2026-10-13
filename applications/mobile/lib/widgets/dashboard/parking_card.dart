// lib/widgets/dashboard/parking_card.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../models/parking_model.dart';
import 'dashboard_colors.dart';

/// নিচের horizontal strip-এর একটা parking card।
class ParkingCard extends StatelessWidget {
  const ParkingCard({
    super.key,
    required this.parking,
    required this.isSelected,
    required this.onTap,
  });

  final ParkingModel parking;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

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
          color: DashColors.card(isDark),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? DashColors.teal
                : (isDark ? DashColors.darkBorder : Colors.grey[200]!),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? DashColors.teal.withValues(alpha: 0.20)
                  : Colors.black.withValues(alpha: isDark ? 0.20 : 0.04),
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
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: DashColors.title(isDark),
                      letterSpacing: -0.2,
                    ),
                  ),
                ),
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
                Icon(
                  Icons.location_on_rounded,
                  size: 12,
                  color: DashColors.muted(isDark),
                ),
                const SizedBox(width: 2),
                Expanded(
                  child: Text(
                    parking.formattedDistance,
                    style: TextStyle(
                      fontSize: 11,
                      color: DashColors.muted(isDark),
                    ),
                  ),
                ),
              ],
            ),
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
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: DashColors.muted(isDark),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 16,
                  color: isDark ? Colors.grey[500] : Colors.grey[400],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}