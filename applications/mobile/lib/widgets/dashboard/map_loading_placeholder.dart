// lib/widgets/dashboard/map_loading_placeholder.dart
import 'package:flutter/material.dart';

import 'dashboard_colors.dart';

class MapLoadingPlaceholder extends StatelessWidget {
  const MapLoadingPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [DashColors.teal, DashColors.blue],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.local_parking_rounded,
                color: Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(height: 16),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(DashColors.teal),
              strokeWidth: 2.6,
            ),
          ],
        ),
      ),
    );
  }
}