// lib/widgets/dashboard/dashboard_map.dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class DashboardMap extends StatelessWidget {
  const DashboardMap({
    super.key,
    required this.initialCameraPosition,
    required this.markers,
    required this.polylines,
    required this.onMapCreated,
    required this.onTap,
    required this.style,
    this.padding = EdgeInsets.zero,
    this.trafficEnabled = false,
    this.onCameraMoveStarted,
    this.onLongPress,
  });

  final CameraPosition initialCameraPosition;
  final Set<Marker> markers;
  final Set<Polyline> polylines;
  final void Function(GoogleMapController controller) onMapCreated;
  final VoidCallback onTap;

  /// Map style JSON (see MapStyles.light / MapStyles.dark).
  final String style;

  /// Keeps the Google logo / compass clear of the floating UI and makes
  /// camera fitting respect it.
  final EdgeInsets padding;
  final bool trafficEnabled;
  final VoidCallback? onCameraMoveStarted;
  final void Function(LatLng position)? onLongPress;

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      onMapCreated: onMapCreated,
      initialCameraPosition: initialCameraPosition,
      style: style,
      padding: padding,
      markers: markers,
      polylines: polylines,
      trafficEnabled: trafficEnabled,
      buildingsEnabled: true,
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      compassEnabled: true,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      minMaxZoomPreference: const MinMaxZoomPreference(4, 20),
      mapType: MapType.normal,
      onTap: (_) => onTap(),
      onLongPress: onLongPress,
      onCameraMoveStarted: onCameraMoveStarted,
    );
  }
}
