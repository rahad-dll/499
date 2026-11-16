// lib/widgets/dashboard/map_filter_bar.dart
//
// The row of chips under the search bar: sort order, search radius and
// quick filters (free now, saved, covered, CCTV, guard, EV charging).
// Filtering and sorting happen on the phone — the lots are already loaded
// by GET /spaces/nearby, so a chip answers instantly, with no request.
import 'package:flutter/material.dart';

import '../../models/parking_model.dart';
import 'dashboard_colors.dart';

enum MapSort { nearest, cheapest, mostFree }

String mapSortLabel(MapSort sort) {
  switch (sort) {
    case MapSort.nearest:
      return 'Nearest';
    case MapSort.cheapest:
      return 'Cheapest';
    case MapSort.mostFree:
      return 'Most free';
  }
}

class MapFilters {
  const MapFilters({
    this.sort = MapSort.nearest,
    this.availableOnly = false,
    this.savedOnly = false,
    this.covered = false,
    this.cctv = false,
    this.security = false,
    this.ev = false,
  });

  final MapSort sort;
  final bool availableOnly;
  final bool savedOnly;
  final bool covered;
  final bool cctv;
  final bool security;
  final bool ev;

  /// How many filters hide lots (the sort order hides nothing).
  int get activeCount =>
      (availableOnly ? 1 : 0) +
      (savedOnly ? 1 : 0) +
      (covered ? 1 : 0) +
      (cctv ? 1 : 0) +
      (security ? 1 : 0) +
      (ev ? 1 : 0);

  MapFilters copyWith({
    MapSort? sort,
    bool? availableOnly,
    bool? savedOnly,
    bool? covered,
    bool? cctv,
    bool? security,
    bool? ev,
  }) {
    return MapFilters(
      sort: sort ?? this.sort,
      availableOnly: availableOnly ?? this.availableOnly,
      savedOnly: savedOnly ?? this.savedOnly,
      covered: covered ?? this.covered,
      cctv: cctv ?? this.cctv,
      security: security ?? this.security,
      ev: ev ?? this.ev,
    );
  }

  /// Same sort order, every filter off.
  MapFilters cleared() => MapFilters(sort: sort);
}

bool _hasAmenity(ParkingModel p, bool Function(String a) test) {
  for (final raw in p.amenities) {
    if (test(raw.toLowerCase())) return true;
  }
  return false;
}

/// Lots that pass [filters], in the chosen order.
List<ParkingModel> applyMapFilters(
  List<ParkingModel> all,
  MapFilters filters,
  Set<String> savedIds,
) {
  final out = all.where((p) {
    if (filters.availableOnly && !p.hasAvailableSpots) return false;
    if (filters.savedOnly && !savedIds.contains(p.id)) return false;
    if (filters.covered && !_hasAmenity(p, (a) => a.contains('cover'))) {
      return false;
    }
    if (filters.cctv && !_hasAmenity(p, (a) => a.contains('cctv'))) {
      return false;
    }
    if (filters.security &&
        !_hasAmenity(p, (a) => a.contains('guard') || a.contains('security'))) {
      return false;
    }
    if (filters.ev &&
        !_hasAmenity(
          p,
          (a) => a == 'ev' || a.startsWith('ev_') || a.contains('charg'),
        )) {
      return false;
    }
    return true;
  }).toList();

  switch (filters.sort) {
    case MapSort.nearest:
      out.sort((a, b) => a.distance.compareTo(b.distance));
      break;
    case MapSort.cheapest:
      // lots without a price go last
      out.sort((a, b) {
        final ra = a.rate ?? double.infinity;
        final rb = b.rate ?? double.infinity;
        final byRate = ra.compareTo(rb);
        return byRate != 0 ? byRate : a.distance.compareTo(b.distance);
      });
      break;
    case MapSort.mostFree:
      out.sort((a, b) {
        final byFree = b.availableSpots.compareTo(a.availableSpots);
        return byFree != 0 ? byFree : a.distance.compareTo(b.distance);
      });
      break;
  }
  return out;
}

/// The lot worth pointing out: open, has a free slot, and the best mix of
/// close, cheap and roomy. Null when nothing is free.
ParkingModel? pickBestLot(List<ParkingModel> lots) {
  ParkingModel? best;
  var bestScore = double.infinity;
  for (final p in lots) {
    if (!p.hasAvailableSpots) continue;
    final free = p.availableSpots > 10 ? 10 : p.availableSpots;
    // lower is better: 1 km ≈ ৳50/hr ≈ 8 free slots
    final score = p.distance + (p.rate ?? 60) / 50.0 - free / 8.0;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/// "~4 min" by car in city traffic, from the straight-line distance.
/// A rough guide only — the real ETA is shown after tapping Navigate.
String approxDriveTime(double distanceKm) {
  // roads are ~1.4x the straight line; ~20 km/h in the city
  final minutes = (distanceKm * 1.4 / 20.0 * 60.0).ceil();
  return '~${minutes < 1 ? 1 : minutes} min';
}

class MapFilterBar extends StatelessWidget {
  const MapFilterBar({
    super.key,
    required this.filters,
    required this.radiusKm,
    required this.radii,
    required this.onChanged,
    required this.onRadiusChanged,
  });

  final MapFilters filters;
  final double radiusKm;
  final List<double> radii;
  final ValueChanged<MapFilters> onChanged;
  final ValueChanged<double> onRadiusChanged;

  String _km(double km) => '${km.toStringAsFixed(0)} km';

  @override
  Widget build(BuildContext context) {
    final f = filters;
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          PopupMenuButton<MapSort>(
            tooltip: 'Sort',
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            onSelected: (sort) => onChanged(f.copyWith(sort: sort)),
            itemBuilder: (context) => [
              for (final sort in MapSort.values)
                PopupMenuItem<MapSort>(
                  value: sort,
                  child: Text(
                    mapSortLabel(sort),
                    style: TextStyle(
                      fontWeight:
                          sort == f.sort ? FontWeight.w700 : FontWeight.w500,
                      color:
                          sort == f.sort ? DashColors.teal : DashColors.title,
                    ),
                  ),
                ),
            ],
            child: _ChipBody(
              icon: Icons.swap_vert_rounded,
              label: mapSortLabel(f.sort),
              active: f.sort != MapSort.nearest,
              trailing: Icons.expand_more_rounded,
            ),
          ),
          const SizedBox(width: 8),
          PopupMenuButton<double>(
            tooltip: 'Search radius',
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            onSelected: onRadiusChanged,
            itemBuilder: (context) => [
              for (final km in radii)
                PopupMenuItem<double>(
                  value: km,
                  child: Text(
                    'Within ${_km(km)}',
                    style: TextStyle(
                      fontWeight:
                          km == radiusKm ? FontWeight.w700 : FontWeight.w500,
                      color: km == radiusKm ? DashColors.teal : DashColors.title,
                    ),
                  ),
                ),
            ],
            child: _ChipBody(
              icon: Icons.radar_rounded,
              label: _km(radiusKm),
              active: false,
              trailing: Icons.expand_more_rounded,
            ),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            icon: Icons.check_circle_rounded,
            label: 'Free now',
            active: f.availableOnly,
            onTap: () =>
                onChanged(f.copyWith(availableOnly: !f.availableOnly)),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            icon: Icons.favorite_rounded,
            label: 'Saved',
            active: f.savedOnly,
            onTap: () => onChanged(f.copyWith(savedOnly: !f.savedOnly)),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            icon: Icons.roofing_rounded,
            label: 'Covered',
            active: f.covered,
            onTap: () => onChanged(f.copyWith(covered: !f.covered)),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            icon: Icons.videocam_rounded,
            label: 'CCTV',
            active: f.cctv,
            onTap: () => onChanged(f.copyWith(cctv: !f.cctv)),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            icon: Icons.shield_rounded,
            label: 'Guard',
            active: f.security,
            onTap: () => onChanged(f.copyWith(security: !f.security)),
          ),
          const SizedBox(width: 8),
          _FilterChip(
            icon: Icons.ev_station_rounded,
            label: 'EV',
            active: f.ev,
            onTap: () => onChanged(f.copyWith(ev: !f.ev)),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: _ChipBody(icon: icon, label: label, active: active),
    );
  }
}

class _ChipBody extends StatelessWidget {
  const _ChipBody({
    required this.icon,
    required this.label,
    required this.active,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final bool active;
  final IconData? trailing;

  @override
  Widget build(BuildContext context) {
    final Color fg = active ? Colors.white : DashColors.title;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        gradient: active ? DashColors.brandGradient : null,
        color: active ? null : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: active ? Colors.transparent : DashColors.border,
        ),
        boxShadow: [
          BoxShadow(
            color: active
                ? DashColors.teal.withValues(alpha: 0.30)
                : Colors.black.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: active ? Colors.white : DashColors.teal),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 2),
            Icon(trailing, size: 16, color: fg),
          ],
        ],
      ),
    );
  }
}

/// Shown when the filters hide every lot that was found.
class NoFilterMatchCard extends StatelessWidget {
  const NoFilterMatchCard({super.key, required this.onClear});

  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 14, 10, 14),
        decoration: BoxDecoration(
          color: DashColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: DashColors.teal.withValues(alpha: 0.20)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.10),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(Icons.filter_alt_off_rounded, color: DashColors.teal),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'No parking here matches your filters.',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: DashColors.title,
                ),
              ),
            ),
            TextButton(
              onPressed: onClear,
              style: TextButton.styleFrom(foregroundColor: DashColors.teal),
              child: const Text(
                'Clear',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
