// lib/widgets/dashboard/dashboard_map.dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../theme/map_style.dart';

class DashboardMap extends StatelessWidget {
  const DashboardMap({
    super.key,
    required this.initialCameraPosition,
    required this.markers,
    required this.polylines,
    required this.onMapCreated,
    required this.onTap,
  });

  final CameraPosition initialCameraPosition;
  final Set<Marker> markers;
  final Set<Polyline> polylines;
  final void Function(GoogleMapController controller) onMapCreated;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return GoogleMap(
      onMapCreated: onMapCreated,
      initialCameraPosition: initialCameraPosition,
      markers: markers,
      polylines: polylines,
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      compassEnabled: true,
      zoomControlsEnabled: false,
      mapType: MapType.normal,
      style: isDark ? MapStyles.dark : null,
      onTap: (_) => onTap(),
    );
  }
}