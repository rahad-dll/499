// lib/utils/marker_builder.dart
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models/parking_model.dart';

double _hueFor(ParkingModel parking) {
  if (!parking.isOpen) return BitmapDescriptor.hueRose;
  if (parking.availableSpots > 5) return BitmapDescriptor.hueGreen;
  if (parking.availableSpots > 0) return BitmapDescriptor.hueOrange;
  return BitmapDescriptor.hueRed;
}

/// User, searched location আর সব parking-এর marker set বানায়।
Set<Marker> buildDashboardMarkers({
  required List<ParkingModel> parkings,
  required void Function(ParkingModel parking) onParkingTap,
  Position? currentPosition,
  LatLng? searchedLocation,
  String? searchedLocationLabel,
}) {
  final markers = <Marker>{};

  if (currentPosition != null) {
    markers.add(
      Marker(
        markerId: const MarkerId('user_location'),
        position: LatLng(currentPosition.latitude, currentPosition.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueCyan),
        infoWindow: const InfoWindow(title: 'Your Location'),
      ),
    );
  }

  if (searchedLocation != null) {
    markers.add(
      Marker(
        markerId: const MarkerId('searched_location'),
        position: searchedLocation,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
        infoWindow: InfoWindow(title: searchedLocationLabel ?? 'Searched location'),
      ),
    );
  }

  for (final parking in parkings) {
    markers.add(
      Marker(
        markerId: MarkerId('parking_${parking.id}'),
        position: LatLng(parking.latitude, parking.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(_hueFor(parking)),
        onTap: () => onParkingTap(parking),
        infoWindow: InfoWindow(
          title: parking.name,
          snippet:
              '${parking.availableSpots} spots available • ${parking.availabilityStatus}',
        ),
      ),
    );
  }

  return markers;
}