// lib/widgets/dashboard/search_panel.dart
import 'package:flutter/material.dart';

import '../../models/parking_model.dart';
import '../../services/places_service.dart';
import '../../utils/format_utils.dart';
import 'dashboard_colors.dart';

/// Dropdown under the search field:
///   - empty query   -> recent searches
///   - typed query   -> matching parking spaces (instant, local) +
///                      matching places (remote, debounced)
class SearchPanel extends StatelessWidget {
  const SearchPanel({
    super.key,
    required this.query,
    required this.parkings,
    required this.places,
    required this.recents,
    required this.isLoading,
    required this.onParkingTap,
    required this.onPlaceTap,
    required this.onClearRecents,
  });

  final String query;
  final List<ParkingModel> parkings;
  final List<PlaceSuggestion> places;
  final List<PlaceSuggestion> recents;
  final bool isLoading;
  final ValueChanged<ParkingModel> onParkingTap;
  final ValueChanged<PlaceSuggestion> onPlaceTap;
  final VoidCallback onClearRecents;

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];

    if (query.isEmpty) {
      if (recents.isEmpty) return const SizedBox.shrink();
      children
        ..add(_Header(
          title: 'Recent',
          action: TextButton(
            onPressed: onClearRecents,
            child: const Text('Clear'),
          ),
        ))
        ..addAll(recents.map((r) => _PlaceTile(
              place: r,
              icon: Icons.history_rounded,
              onTap: () => onPlaceTap(r),
            )));
    } else {
      final shownParkings = parkings.take(4).toList();
      if (shownParkings.isNotEmpty) {
        children.add(const _Header(title: 'Parking spaces'));
        children.addAll(shownParkings.map((p) => _ParkingTile(
              parking: p,
              onTap: () => onParkingTap(p),
            )));
      }
      if (places.isNotEmpty) {
        children.add(const _Header(title: 'Places'));
        children.addAll(places.map((p) => _PlaceTile(
              place: p,
              icon: Icons.place_rounded,
              onTap: () => onPlaceTap(p),
            )));
      }
      if (children.isEmpty && !isLoading) {
        children.add(Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              const Icon(Icons.search_off_rounded, color: DashColors.muted),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'No results for "$query"',
                  style: const TextStyle(
                    color: DashColors.subtle,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ));
      }
      if (children.isEmpty) {
        // Still loading and nothing to show yet: keep the panel quiet.
        return const SizedBox.shrink();
      }
    }

    return Container(
      margin: const EdgeInsets.only(top: 8),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.5,
      ),
      decoration: BoxDecoration(
        color: DashColors.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: DashColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoading)
              const LinearProgressIndicator(
                minHeight: 2,
                backgroundColor: Colors.transparent,
                valueColor: AlwaysStoppedAnimation<Color>(DashColors.teal),
              ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.only(bottom: 6),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                children: children,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.title, this.action});
  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 2),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 0.8,
                fontWeight: FontWeight.w700,
                color: DashColors.muted,
              ),
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}

class _ParkingTile extends StatelessWidget {
  const _ParkingTile({required this.parking, required this.onTap});
  final ParkingModel parking;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = parking.availabilityColor;
    return ListTile(
      dense: true,
      onTap: onTap,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(Icons.local_parking_rounded, color: color, size: 20),
      ),
      title: Text(
        parking.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: DashColors.title,
        ),
      ),
      subtitle: Text(
        parking.address,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 12, color: DashColors.subtle),
      ),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          parking.isOpen
              ? (parking.availableSpots > 0
                  ? '${parking.availableSpots} free'
                  : 'Full')
              : 'Closed',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ),
    );
  }
}

class _PlaceTile extends StatelessWidget {
  const _PlaceTile({
    required this.place,
    required this.icon,
    required this.onTap,
  });
  final PlaceSuggestion place;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      onTap: onTap,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: DashColors.teal.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: DashColors.teal, size: 20),
      ),
      title: Text(
        place.primary,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: DashColors.title,
        ),
      ),
      subtitle: place.secondary.isEmpty
          ? null
          : Text(
              place.secondary,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: DashColors.subtle),
            ),
      trailing: place.distanceM == null
          ? null
          : Text(
              formatDistance(place.distanceM!),
              style: const TextStyle(fontSize: 11, color: DashColors.muted),
            ),
    );
  }
}
