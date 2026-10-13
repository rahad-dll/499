// lib/widgets/dashboard/parking_strip.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../models/parking_model.dart';
import 'dashboard_colors.dart';
import 'parking_card.dart';

/// নিচের "N spots" label + horizontal parking card list।
class ParkingStrip extends StatelessWidget {
  const ParkingStrip({
    super.key,
    required this.parkings,
    required this.selectedParking,
    required this.scrollController,
    required this.onParkingTap,
    this.searchedLocationLabel,
  });

  final List<ParkingModel> parkings;
  final ParkingModel? selectedParking;
  final ScrollController scrollController;
  final ValueChanged<ParkingModel> onParkingTap;
  final String? searchedLocationLabel;

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            child: Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: DashColors.teal.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${parkings.length} ${parkings.length == 1 ? 'spot' : 'spots'}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: DashColors.teal,
                    ),
                  ),
                ),
                const Spacer(),
                if (searchedLocationLabel != null)
                  Text(
                    searchedLocationLabel!,
                    style: TextStyle(
                      fontSize: 11,
                      color: DashColors.muted(isDark),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          SizedBox(
            height: 170,
            child: ListView.separated(
              controller: scrollController,
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: parkings.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final parking = parkings[index];
                return ParkingCard(
                  parking: parking,
                  isSelected: selectedParking?.id == parking.id,
                  onTap: () => onParkingTap(parking),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}