// lib/widgets/dashboard/route_info_card.dart
import 'package:flutter/material.dart';

import '../../models/parking_model.dart';
import 'dashboard_colors.dart';

/// Route চালু থাকলে নিচে যে card দেখায়।
class RouteInfoCard extends StatelessWidget {
  const RouteInfoCard({
    super.key,
    required this.destination,
    required this.distanceKm,
    required this.onClose,
  });

  final ParkingModel destination;
  final double? distanceKm;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: DashColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: DashColors.teal.withValues(alpha: 0.20),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                gradient: DashColors.brandGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.directions_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    destination.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: DashColors.title,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (distanceKm != null)
                    Text(
                      '${distanceKm!.toStringAsFixed(1)} km away',
                      style: const TextStyle(
                        fontSize: 12,
                        color: DashColors.muted,
                      ),
                    ),
                ],
              ),
            ),
            IconButton(
              onPressed: onClose,
              icon: const Icon(
                Icons.close_rounded,
                size: 20,
                color: DashColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}