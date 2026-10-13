// lib/widgets/dashboard/no_results_card.dart
import 'package:flutter/material.dart';

import 'dashboard_colors.dart';

class NoResultsCard extends StatelessWidget {
  const NoResultsCard({super.key, required this.onClear});

  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: DashColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: DashColors.teal.withValues(alpha: 0.20),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: DashColors.teal.withValues(alpha: 0.10),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: DashColors.teal.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                Icons.search_off_rounded,
                color: DashColors.teal,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'No parking found',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: DashColors.title,
                    ),
                  ),
                  Text(
                    'Try searching for a different location',
                    style: TextStyle(
                      fontSize: 12,
                      color: DashColors.muted,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: onClear,
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