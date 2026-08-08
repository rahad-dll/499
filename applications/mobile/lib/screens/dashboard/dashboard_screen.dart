// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../main.dart';
import '../../models/parking_model.dart';
import '../../models/user_model.dart';
import '../../services/location_service.dart';
import '../../services/session_service.dart';
import '../../services/places_service.dart';
import '../../theme/map_style.dart';
import 'bookings_screen.dart';
import 'new_booking_sheet.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  GoogleMapController? _mapController;
  Position? _currentPosition;
  StreamSubscription<Position>? _positionSub;

  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};

  List<ParkingModel> _nearbyParkings = [];
  bool _isLoading = true;
  CameraPosition? _cameraPosition;
  final LocationService _locationService = LocationService();
  final PlacesService _placesService = PlacesService();
  User? _currentUser;

  // Search state
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  List<PlaceSuggestion> _suggestions = [];
  bool _searchLoading = false;

  // When non-null, the map is centered on a searched place instead of the
  // user's live location — nearby parking is generated around this point.
  LatLng? _searchedLocation;
  String? _searchedLocationLabel;

  // Active navigation route
  ParkingModel? _routeDestination;
  double? _routeDistanceKm;

  @override
  void initState() {
    super.initState();
    _loadUser();
    _initializeLocation();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _positionSub?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadUser() async {
    final user = await SessionService.getSession();
    if (mounted) setState(() => _currentUser = user);
  }

  Future<void> _initializeLocation() async {
    try {
      final position = await _locationService.getCurrentLocation();
      setState(() {
        _currentPosition = position;
        _cameraPosition = CameraPosition(
          target: LatLng(position.latitude, position.longitude),
          zoom: 15,
        );
        _isLoading = false;
      });
      _loadNearbyParkings(center: LatLng(position.latitude, position.longitude));
      _startLocationUpdates();
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error getting location: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  // Auto-detect location changes: keeps the user marker current and, if
  // the person hasn't searched a different area, refreshes nearby parking
  // as they move (throttled by geolocator's distanceFilter).
  void _startLocationUpdates() {
    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 30,
      ),
    ).listen((position) {
      if (!mounted) return;
      setState(() => _currentPosition = position);
      if (_searchedLocation == null) {
        _updateMarkers(_nearbyParkings);
        _loadNearbyParkings(center: LatLng(position.latitude, position.longitude));
      } else {
        _updateMarkers(_nearbyParkings);
      }
    });
  }

  Future<void> _loadNearbyParkings({required LatLng center}) async {
    try {
      // TODO real API: replace with GET /spaces (nearby by lat/lng) once
      // driver-facing endpoints are confirmed.
      final mockParkings = _getMockParkings(center.latitude, center.longitude);
      setState(() => _nearbyParkings = mockParkings);
      _updateMarkers(mockParkings);
    } catch (e) {
      debugPrint('Error loading parkings: $e');
    }
  }

  List<ParkingModel> _getMockParkings(double lat, double lng) {
    return [
      ParkingModel(
        id: '1', name: 'City Center Parking', address: '123 Main Street, Downtown',
        latitude: lat + 0.002, longitude: lng + 0.003,
        availableSpots: 12, totalSpots: 50, pricePerHour: 2.50, distance: 0.3,
        isOpen: true, rating: 4.5, amenities: const ['CCTV', 'EV Charging', '24/7'],
      ),
      ParkingModel(
        id: '2', name: 'Mall Parking', address: '456 Shopping Mall',
        latitude: lat - 0.003, longitude: lng + 0.002,
        availableSpots: 8, totalSpots: 30, pricePerHour: 3.00, distance: 0.5,
        isOpen: true, rating: 4.2, amenities: const ['CCTV', 'Covered'],
      ),
      ParkingModel(
        id: '3', name: 'Station Parking', address: '789 Railway Station',
        latitude: lat + 0.004, longitude: lng - 0.003,
        availableSpots: 3, totalSpots: 20, pricePerHour: 1.50, distance: 0.8,
        isOpen: true, rating: 3.8, amenities: const ['CCTV'],
      ),
      ParkingModel(
        id: '4', name: 'Hospital Parking', address: '101 Medical Center',
        latitude: lat - 0.002, longitude: lng - 0.004,
        availableSpots: 0, totalSpots: 40, pricePerHour: 2.00, distance: 1.2,
        isOpen: false, rating: 4.0, amenities: const ['CCTV', 'Covered', '24/7'],
      ),
    ];
  }

  void _updateMarkers(List<ParkingModel> parkings) {
    _markers.clear();

    if (_currentPosition != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('user_location'),
          position: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: 'Your Location'),
        ),
      );
    }

    if (_searchedLocation != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('searched_location'),
          position: _searchedLocation!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
          infoWindow: InfoWindow(title: _searchedLocationLabel ?? 'Searched location'),
        ),
      );
    }

    for (var parking in parkings) {
      BitmapDescriptor markerIcon;
      if (parking.availableSpots > 5) {
        markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
      } else if (parking.availableSpots > 0) {
        markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
      } else {
        markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
      }

      _markers.add(
        Marker(
          markerId: MarkerId('parking_${parking.id}'),
          position: LatLng(parking.latitude, parking.longitude),
          icon: markerIcon,
          onTap: () => _showParkingDetails(parking),
          infoWindow: InfoWindow(
            title: parking.name,
            snippet: '${parking.availableSpots} spots • \$${parking.pricePerHour}/hr',
            onTap: () => _showParkingDetails(parking),
          ),
        ),
      );
    }
    if (mounted) setState(() {});
  }

  // ---------------- Search (Places Autocomplete) ----------------

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    if (value.trim().isEmpty) {
      setState(() => _suggestions = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      setState(() => _searchLoading = true);
      final bias = _currentPosition != null
          ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
          : null;
      final results = await _placesService.autocomplete(value, bias: bias);
      if (!mounted) return;
      setState(() {
        _suggestions = results;
        _searchLoading = false;
      });
    });
  }

  Future<void> _onSuggestionSelected(PlaceSuggestion suggestion) async {
    setState(() {
      _searchLoading = true;
      _suggestions = [];
      _searchController.text = suggestion.description;
    });
    FocusScope.of(context).unfocus();

    final place = await _placesService.getPlaceDetails(suggestion.placeId);
    setState(() => _searchLoading = false);
    if (place == null || !mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not fetch that location, try again.')),
      );
      return;
    }

    final target = LatLng(place.lat, place.lng);
    setState(() {
      _searchedLocation = target;
      _searchedLocationLabel = place.name.isNotEmpty ? place.name : place.address;
    });

    _mapController?.animateCamera(CameraUpdate.newCameraPosition(
      CameraPosition(target: target, zoom: 15),
    ));

    await _loadNearbyParkings(center: target);
  }

  void _clearSearch() {
    setState(() {
      _searchController.clear();
      _suggestions = [];
      _searchedLocation = null;
      _searchedLocationLabel = null;
    });
    if (_currentPosition != null) {
      final here = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
      _mapController?.animateCamera(CameraUpdate.newCameraPosition(
        CameraPosition(target: here, zoom: 15),
      ));
      _loadNearbyParkings(center: here);
    }
  }

  // ---------------- Navigation / directions ----------------

  Future<void> _navigateToParking(ParkingModel parking) async {
    if (_currentPosition == null) return;
    final origin = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
    final destination = LatLng(parking.latitude, parking.longitude);

    final distanceKm = await _locationService.calculateDistance(
      origin.latitude, origin.longitude, destination.latitude, destination.longitude,
    );

    final directions = await _placesService.getDirections(origin, destination);
    if (!mounted) return;

    setState(() {
      _routeDestination = parking;
      _routeDistanceKm = distanceKm;
      _polylines.clear();
      if (directions != null) {
        _polylines.add(Polyline(
          polylineId: const PolylineId('active_route'),
          color: const Color(0xFF18D6C0),
          width: 5,
          points: directions.points,
        ));
      }
    });

    if (directions != null && directions.points.isNotEmpty) {
      final bounds = _boundsFromPoints([origin, destination, ...directions.points]);
      _mapController?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
    }
  }

  LatLngBounds _boundsFromPoints(List<LatLng> points) {
    double minLat = points.first.latitude, maxLat = points.first.latitude;
    double minLng = points.first.longitude, maxLng = points.first.longitude;
    for (final p in points) {
      minLat = p.latitude < minLat ? p.latitude : minLat;
      maxLat = p.latitude > maxLat ? p.latitude : maxLat;
      minLng = p.longitude < minLng ? p.longitude : minLng;
      maxLng = p.longitude > maxLng ? p.longitude : maxLng;
    }
    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  Future<void> _openExternalNavigation(ParkingModel parking) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}&travelmode=driving',
    );
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open Google Maps')),
        );
      }
    }
  }

  void _clearRoute() {
    setState(() {
      _routeDestination = null;
      _routeDistanceKm = null;
      _polylines.clear();
    });
  }

  // ---------------- Parking details sheet ----------------

  void _showParkingDetails(ParkingModel parking) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildParkingDetailsSheet(parking),
    );
  }

  Widget _buildParkingDetailsSheet(ParkingModel parking) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2740) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(parking.name,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(color: parking.availabilityColor.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                child: Text(parking.availabilityStatus,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: parking.availabilityColor)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.location_on, size: 16, color: isDark ? Colors.grey[400] : Colors.grey[600]),
              const SizedBox(width: 4),
              Expanded(child: Text(parking.address, style: TextStyle(fontSize: 14, color: isDark ? Colors.grey[400] : Colors.grey[600]))),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatItem(icon: Icons.local_parking, label: 'Available', value: '${parking.availableSpots}', isDark: isDark),
              const SizedBox(width: 12),
              _buildStatItem(icon: Icons.attach_money, label: 'Price/Hour', value: '\$${parking.pricePerHour}', isDark: isDark),
              const SizedBox(width: 12),
              _buildStatItem(icon: Icons.star, label: 'Rating', value: parking.rating.toString(), isDark: isDark),
            ],
          ),
          if (parking.amenities.isNotEmpty) ...[
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: parking.amenities.map((amenity) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: isDark ? const Color(0xFF0F1728) : Colors.grey[100], borderRadius: BorderRadius.circular(12)),
                  child: Text(amenity, style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[300] : Colors.grey[600])),
                );
              }).toList(),
            ),
          ],
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _navigateToParking(parking);
                    _openExternalNavigation(parking);
                  },
                  icon: const Icon(Icons.directions),
                  label: const Text('Navigate'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF18D6C0),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: parking.hasAvailableSpots
                      ? () {
                          Navigator.pop(context);
                          _bookParking(parking);
                        }
                      : null,
                  icon: const Icon(Icons.book_online),
                  label: const Text('Book Now'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF18D6C0),
                    side: const BorderSide(color: Color(0xFF18D6C0)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({required IconData icon, required String label, required String value, required bool isDark}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(color: isDark ? const Color(0xFF0F1728) : Colors.grey[50], borderRadius: BorderRadius.circular(10)),
        child: Column(
          children: [
            Icon(icon, size: 20, color: const Color(0xFF18D6C0)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87)),
            Text(label, style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600])),
          ],
        ),
      ),
    );
  }

  Future<void> _bookParking(ParkingModel parking) async {
    final booking = await showNewBookingSheet(context, parking);
    if (booking == null || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Booked ${parking.name} for ${booking.durationHours}h'),
        backgroundColor: const Color(0xFF22C55E),
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.white,
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BookingsScreen())),
        ),
      ),
    );
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Scaffold(
      body: Stack(
        children: [
          if (_cameraPosition != null)
            GoogleMap(
              onMapCreated: _onMapCreated,
              initialCameraPosition: _cameraPosition!,
              markers: _markers,
              polylines: _polylines,
              myLocationEnabled: true,
              myLocationButtonEnabled: true,
              compassEnabled: true,
              zoomControlsEnabled: false,
              mapType: MapType.normal,
              style: isDark ? MapStyles.dark : null,
              onTap: (_) => setState(() => _suggestions = []),
            )
          else
            const Center(child: CircularProgressIndicator()),

          Positioned(
            top: 0, left: 0, right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1A2740).withOpacity(0.95) : Colors.white.withOpacity(0.95),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? const Color(0xFF253248) : Colors.grey[200]!),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.search, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextField(
                                    controller: _searchController,
                                    onChanged: _onSearchChanged,
                                    style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 14),
                                    decoration: InputDecoration(
                                      hintText: 'Search any location...',
                                      hintStyle: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600], fontSize: 14),
                                      border: InputBorder.none,
                                      isDense: true,
                                    ),
                                  ),
                                ),
                                if (_searchLoading)
                                  const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                else if (_searchController.text.isNotEmpty)
                                  GestureDetector(
                                    onTap: _clearSearch,
                                    child: Icon(Icons.close, size: 18, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        GestureDetector(
                          onTap: () => Provider.of<ThemeProvider>(context, listen: false).toggleTheme(),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1A2740).withOpacity(0.9) : Colors.white.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? const Color(0xFF253248) : Colors.grey[200]!),
                            ),
                            child: Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: const Color(0xFF18D6C0), size: 20),
                          ),
                        ),
                      ],
                    ),
                    if (_suggestions.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.only(top: 6),
                        constraints: const BoxConstraints(maxHeight: 260),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1A2740) : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isDark ? const Color(0xFF253248) : Colors.grey[200]!),
                        ),
                        child: ListView.separated(
                          shrinkWrap: true,
                          itemCount: _suggestions.length,
                          separatorBuilder: (_, __) => Divider(height: 1, color: isDark ? const Color(0xFF253248) : Colors.grey[200]),
                          itemBuilder: (context, index) {
                            final s = _suggestions[index];
                            return ListTile(
                              dense: true,
                              leading: const Icon(Icons.place_outlined, color: Color(0xFF18D6C0)),
                              title: Text(s.description, style: TextStyle(fontSize: 13, color: isDark ? Colors.white : Colors.black87)),
                              onTap: () => _onSuggestionSelected(s),
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),

          if (_routeDestination != null)
            Positioned(
              left: 16, right: 16, bottom: 16,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A2740) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 12)],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.directions, color: Color(0xFF18D6C0)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_routeDestination!.name,
                              style: TextStyle(fontWeight: FontWeight.w600, color: isDark ? Colors.white : Colors.black87)),
                          if (_routeDistanceKm != null)
                            Text('${_routeDistanceKm!.toStringAsFixed(1)} km away',
                                style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600])),
                        ],
                      ),
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: _clearRoute),
                  ],
                ),
              ),
            ),

          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.3),
              child: const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF18D6C0)))),
            ),
        ],
      ),
    );
  }
}