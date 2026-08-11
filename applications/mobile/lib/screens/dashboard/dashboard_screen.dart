// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:http/http.dart' as http;
import '../../main.dart';
import '../../models/parking_model.dart';
import '../../services/location_service.dart';
import '../../services/places_service.dart';
import '../../theme/map_style.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
import 'bookings_screen.dart';
import 'profile_screen.dart';
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
  bool _isFetching = false;
  CameraPosition? _cameraPosition;
  final LocationService _locationService = LocationService();
  final PlacesService _placesService = PlacesService();

  // Search related
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  List<PlaceSuggestion> _suggestions = [];
  bool _searchLoading = false;

  LatLng? _searchedLocation;
  String? _searchedLocationLabel;

  ParkingModel? _routeDestination;
  double? _routeDistanceKm;

  static const String _apiBaseUrl = 'https://four99-b6wg.onrender.com';

  @override
  void initState() {
    super.initState();
    _initializeLocation();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _positionSub?.cancel();
    _searchController.dispose();
    super.dispose();
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
      await _loadNearbyParkings(center: LatLng(position.latitude, position.longitude));
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
        _loadNearbyParkings(center: LatLng(position.latitude, position.longitude));
      }
    });
  }

  // ============= SEARCH FUNCTIONS =============
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
  // ===========================================

  Future<void> _loadNearbyParkings({required LatLng center}) async {
    if (_isFetching) return;
    setState(() => _isFetching = true);

    try {
      final url = Uri.parse(
        '$_apiBaseUrl/spaces/nearby?lat=${center.latitude}&lng=${center.longitude}'
      );
      
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        List<ParkingModel> parkings = [];
        
        if (data == null || (data is List && data.isEmpty)) {
          setState(() {
            _nearbyParkings = [];
            _isFetching = false;
            _markers.clear();
          });
          return;
        }
        
        List<dynamic> spaces = [];
        if (data is List) {
          spaces = data;
        } else if (data is Map && data['data'] != null) {
          spaces = data['data'] is List ? data['data'] : [];
        }
        
        if (spaces.isEmpty) {
          setState(() {
            _nearbyParkings = [];
            _isFetching = false;
            _markers.clear();
          });
          return;
        }
        
        parkings = spaces.map((json) => ParkingModel.fromJson(json)).toList();
        
        if (mounted) {
          setState(() {
            _nearbyParkings = parkings;
            _isFetching = false;
          });
          _updateMarkers(parkings);
        }
      } else {
        if (mounted) {
          setState(() => _isFetching = false);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isFetching = false);
      }
    }
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
            snippet: '${parking.availableSpots} spots • ${parking.formattedRate}',
            onTap: () => _showParkingDetails(parking),
          ),
        ),
      );
    }
    if (mounted) setState(() {});
  }

  // ============= FIXED NAVIGATION METHOD =============
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
      if (directions != null && directions.isNotEmpty) {
        _polylines.add(Polyline(
          polylineId: const PolylineId('active_route'),
          color: const Color(0xFF18D6C0),
          width: 5,
          points: directions, // FIXED: সরাসরি directions ব্যবহার করুন
        ));
      }
    });

    if (directions != null && directions.isNotEmpty) {
      final bounds = _boundsFromPoints([origin, destination, ...directions]); // FIXED: সরাসরি directions
      _mapController?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
    }
  }
  // ================================================

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
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  parking.name,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: parking.availabilityColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  parking.availabilityStatus,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: parking.availabilityColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                Icons.location_on,
                size: 16,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  parking.address,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatItem(
                icon: Icons.local_parking,
                label: 'Available',
                value: '${parking.availableSpots}',
                isDark: isDark,
              ),
              const SizedBox(width: 12),
              _buildStatItem(
                icon: Icons.attach_money,
                label: 'Price/Hour',
                value: parking.hasRate ? '\$${parking.rate!.toStringAsFixed(2)}' : 'N/A',
                isDark: isDark,
              ),
              const SizedBox(width: 12),
              _buildStatItem(
                icon: Icons.star,
                label: 'Rating',
                value: parking.rating.toStringAsFixed(1),
                isDark: isDark,
              ),
            ],
          ),
          if (parking.amenities.isNotEmpty) ...[
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: parking.amenities.map((amenity) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F1728) : Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    amenity,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey[300] : Colors.grey[600],
                    ),
                  ),
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
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
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
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F1728) : Colors.grey[50],
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: const Color(0xFF18D6C0)),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
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
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const BookingsScreen()),
          ),
        ),
      ),
    );
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
  }

  Widget _buildEmptyState() {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.local_parking_rounded,
              size: 80,
              color: const Color(0xFF18D6C0).withOpacity(0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No Parking Spaces Found',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'There are no parking spaces available in this area right now.\nParking spaces will be added soon!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool> _showExitDialog() async {
    return await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Exit App'),
        content: const Text('Are you sure you want to exit?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Exit'),
          ),
        ],
      ),
    ) ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return WillPopScope(
      onWillPop: _showExitDialog,
      child: Scaffold(
        body: Stack(
          children: [
            // Map or Empty State
            if (_cameraPosition != null && !_isLoading && _nearbyParkings.isNotEmpty)
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
            else if (!_isLoading && _nearbyParkings.isEmpty && !_isFetching)
              _buildEmptyState()
            else if (_isLoading || _isFetching)
              Container(
                color: isDark ? Colors.grey[900] : Colors.grey[100],
                child: const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF18D6C0)),
                  ),
                ),
              ),

            // Search Bar with Suggestions
            Positioned(
              top: 0,
              left: 0,
              right: 0,
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
                                color: isDark
                                    ? const Color(0xFF1A2740).withOpacity(0.95)
                                    : Colors.white.withOpacity(0.95),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isDark
                                      ? const Color(0xFF253248)
                                      : Colors.grey[200]!,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.search,
                                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: TextField(
                                      controller: _searchController,
                                      onChanged: _onSearchChanged,
                                      style: TextStyle(
                                        color: isDark ? Colors.white : Colors.black87,
                                        fontSize: 14,
                                      ),
                                      decoration: InputDecoration(
                                        hintText: 'Search any location...',
                                        hintStyle: TextStyle(
                                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                                          fontSize: 14,
                                        ),
                                        border: InputBorder.none,
                                        isDense: true,
                                      ),
                                    ),
                                  ),
                                  if (_searchLoading)
                                    const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  else if (_searchController.text.isNotEmpty)
                                    GestureDetector(
                                      onTap: _clearSearch,
                                      child: Icon(
                                        Icons.close,
                                        size: 18,
                                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          GestureDetector(
                            onTap: () =>
                                Provider.of<ThemeProvider>(context, listen: false)
                                    .toggleTheme(),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF1A2740).withOpacity(0.9)
                                    : Colors.white.withOpacity(0.9),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isDark
                                      ? const Color(0xFF253248)
                                      : Colors.grey[200]!,
                                ),
                              ),
                              child: Icon(
                                isDark ? Icons.dark_mode : Icons.light_mode,
                                color: const Color(0xFF18D6C0),
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                      // Search Suggestions
                      if (_suggestions.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(top: 6),
                          constraints: const BoxConstraints(maxHeight: 260),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1A2740) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark ? const Color(0xFF253248) : Colors.grey[200]!,
                            ),
                          ),
                          child: ListView.separated(
                            shrinkWrap: true,
                            itemCount: _suggestions.length,
                            separatorBuilder: (_, __) => Divider(
                              height: 1,
                              color: isDark ? const Color(0xFF253248) : Colors.grey[200],
                            ),
                            itemBuilder: (context, index) {
                              final s = _suggestions[index];
                              return ListTile(
                                dense: true,
                                leading: const Icon(
                                  Icons.place_outlined,
                                  color: Color(0xFF18D6C0),
                                ),
                                title: Text(
                                  s.description,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isDark ? Colors.white : Colors.black87,
                                  ),
                                ),
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

            // Route Info
            if (_routeDestination != null)
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1A2740) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.15),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.directions, color: Color(0xFF18D6C0)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _routeDestination!.name,
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                            ),
                            if (_routeDistanceKm != null)
                              Text(
                                '${_routeDistanceKm!.toStringAsFixed(1)} km away',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                                ),
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: _clearRoute,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
        bottomNavigationBar: AppBottomNav(
          currentIndex: 0,
          onTap: (index) {
            switch (index) {
              case 0:
                break;
              case 1:
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const BookingsScreen()),
                );
                break;
              case 2:
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
                break;
            }
          },
        ),
      ),
    );
  }
}