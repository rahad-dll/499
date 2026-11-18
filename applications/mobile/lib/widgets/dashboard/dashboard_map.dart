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
    this.mapType = MapType.normal,
    this.circles = const <Circle>{},
    this.onCameraMoveStarted,
    this.onCameraMove,
    this.onCameraIdle,
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

  /// Default, satellite, hybrid or terrain (the custom [style] only
  /// applies to the default type).
  final MapType mapType;

  /// Availability glow under each lot + the search-area ring.
  final Set<Circle> circles;
  final VoidCallback? onCameraMoveStarted;
  final void Function(CameraPosition position)? onCameraMove;
  final VoidCallback? onCameraIdle;
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
      circles: circles,
      trafficEnabled: trafficEnabled,
      buildingsEnabled: true,
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      compassEnabled: true,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      // Satellite photos of most of Bangladesh stop near zoom 18; past
      // that Google only enlarges the same picture, which looks blurry.
      minMaxZoomPreference:
          (mapType == MapType.satellite || mapType == MapType.hybrid)
              ? const MinMaxZoomPreference(4, 18)
              : const MinMaxZoomPreference(4, 20),
      tiltGesturesEnabled: true,
      rotateGesturesEnabled: true,
      mapType: mapType,
      onTap: (_) => onTap(),
      onLongPress: onLongPress,
      onCameraMoveStarted: onCameraMoveStarted,
      onCameraMove: onCameraMove,
      onCameraIdle: onCameraIdle,
    );
  }
}
