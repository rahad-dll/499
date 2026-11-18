// lib/widgets/dashboard/map_layers_sheet.dart
//
// "Map layers" bottom sheet: map type (default / satellite / hybrid /
// terrain), live traffic, the availability glow, the search-area ring,
// and a legend that explains the pin colours.
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'dashboard_colors.dart';

/// Name saved in the preferences for a map type.
String mapTypeName(MapType type) {
  switch (type) {
    case MapType.satellite:
      return 'satellite';
    case MapType.hybrid:
      return 'hybrid';
    case MapType.terrain:
      return 'terrain';
    default:
      return 'normal';
  }
}

MapType mapTypeFromName(String name) {
  switch (name) {
    case 'satellite':
      return MapType.satellite;
    case 'hybrid':
      return MapType.hybrid;
    case 'terrain':
      return MapType.terrain;
    default:
      return MapType.normal;
  }
}

Future<void> showMapLayersSheet(
  BuildContext context, {
  required MapType mapType,
  required bool trafficOn,
  required bool glowOn,
  required bool ringOn,
  required ValueChanged<MapType> onMapType,
  required ValueChanged<bool> onTraffic,
  required ValueChanged<bool> onGlow,
  required ValueChanged<bool> onRing,
}) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => _MapLayersSheet(
      mapType: mapType,
      trafficOn: trafficOn,
      glowOn: glowOn,
      ringOn: ringOn,
      onMapType: onMapType,
      onTraffic: onTraffic,
      onGlow: onGlow,
      onRing: onRing,
    ),
  );
}

class _MapLayersSheet extends StatefulWidget {
  const _MapLayersSheet({
    required this.mapType,
    required this.trafficOn,
    required this.glowOn,
    required this.ringOn,
    required this.onMapType,
    required this.onTraffic,
    required this.onGlow,
    required this.onRing,
  });

  final MapType mapType;
  final bool trafficOn;
  final bool glowOn;
  final bool ringOn;
  final ValueChanged<MapType> onMapType;
  final ValueChanged<bool> onTraffic;
  final ValueChanged<bool> onGlow;
  final ValueChanged<bool> onRing;

  @override
  State<_MapLayersSheet> createState() => _MapLayersSheetState();
}

class _MapLayersSheetState extends State<_MapLayersSheet> {
  late MapType _mapType = widget.mapType;
  late bool _traffic = widget.trafficOn;
  late bool _glow = widget.glowOn;
  late bool _ring = widget.ringOn;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: DashColors.handle,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Map layers',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: DashColors.title,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 16),
              const _SectionLabel('Map type'),
              const SizedBox(height: 10),
              Row(
                children: [
                  _typeTile(MapType.normal, Icons.map_rounded, 'Default'),
                  const SizedBox(width: 10),
                  _typeTile(
                      MapType.satellite, Icons.satellite_alt_rounded, 'Satellite'),
                  const SizedBox(width: 10),
                  _typeTile(MapType.hybrid, Icons.layers_rounded, 'Hybrid'),
                  const SizedBox(width: 10),
                  _typeTile(MapType.terrain, Icons.terrain_rounded, 'Terrain'),
                ],
              ),
              const SizedBox(height: 20),
              const _SectionLabel('Show on the map'),
              const SizedBox(height: 4),
              _switchRow(
                icon: Icons.traffic_rounded,
                title: 'Live traffic',
                subtitle: 'Green, orange and red roads',
                value: _traffic,
                onChanged: (v) {
                  setState(() => _traffic = v);
                  widget.onTraffic(v);
                },
              ),
              _switchRow(
                icon: Icons.blur_on_rounded,
                title: 'Availability glow',
                subtitle: 'A coloured halo under each parking',
                value: _glow,
                onChanged: (v) {
                  setState(() => _glow = v);
                  widget.onGlow(v);
                },
              ),
              _switchRow(
                icon: Icons.radar_rounded,
                title: 'Search area ring',
                subtitle: 'The circle that was searched',
                value: _ring,
                onChanged: (v) {
                  setState(() => _ring = v);
                  widget.onRing(v);
                },
              ),
              const SizedBox(height: 14),
              const _SectionLabel('Pin colours'),
              const SizedBox(height: 10),
              const Wrap(
                spacing: 14,
                runSpacing: 8,
                children: [
                  _LegendDot(color: Color(0xFF22C55E), label: 'Plenty free'),
                  _LegendDot(color: Color(0xFFF59E0B), label: '1–5 free'),
                  _LegendDot(color: Color(0xFFEF4444), label: 'Full'),
                  _LegendDot(color: Color(0xFFF5B301), label: 'Best pick'),
                  _LegendDot(color: Color(0xFFE11D48), label: 'Saved (dot)'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _typeTile(MapType type, IconData icon, String label) {
    final selected = _mapType == type;
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          setState(() => _mapType = type);
          widget.onMapType(type);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            gradient: selected ? DashColors.brandGradient : null,
            color: selected ? null : DashColors.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? Colors.transparent : DashColors.border,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 24,
                color: selected ? Colors.white : DashColors.teal,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : DashColors.title,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _switchRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: DashColors.teal.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: DashColors.teal),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: DashColors.title,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: DashColors.subtle),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: DashColors.teal,
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: DashColors.muted,
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: DashColors.label),
        ),
      ],
    );
  }
}
