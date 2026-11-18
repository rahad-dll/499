// lib/widgets/dashboard/parking_strip.dart
import 'package:flutter/material.dart';

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
    this.bestId,
    this.savedIds = const <String>{},
    this.sortLabel,
  });

  final List<ParkingModel> parkings;
  final ParkingModel? selectedParking;
  final ScrollController scrollController;
  final ValueChanged<ParkingModel> onParkingTap;
  final String? searchedLocationLabel;

  /// Lot marked "Best pick" (see pickBestLot).
  final String? bestId;
  final Set<String> savedIds;

  /// e.g. "Cheapest first" — shown next to the count when not the default.
  final String? sortLabel;

  @override
  Widget build(BuildContext context) {
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
                if (sortLabel != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    sortLabel!,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: DashColors.subtle,
                    ),
                  ),
                ],
                const SizedBox(width: 8),
                Expanded(
                  child: searchedLocationLabel == null
                      ? const SizedBox.shrink()
                      : Text(
                          searchedLocationLabel!,
                          textAlign: TextAlign.right,
                          style: const TextStyle(
                            fontSize: 11,
                            color: DashColors.muted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
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
                  isBest: parking.id == bestId,
                  isSaved: savedIds.contains(parking.id),
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