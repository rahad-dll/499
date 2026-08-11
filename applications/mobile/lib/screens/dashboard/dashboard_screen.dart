// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
<<<<<<< HEAD
import 'package:http/http.dart' as http;
import 'dart:convert';
=======
import 'package:url_launcher/url_launcher.dart';
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
import '../../main.dart';
import '../../models/parking_model.dart';
import '../../models/user_model.dart';
import '../../services/location_service.dart';
import '../../services/session_service.dart';
<<<<<<< HEAD
import '../../services/api_service.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
=======
import '../../services/places_service.dart';
import '../../theme/map_style.dart';
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
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
  bool _hasError = false;
  String _errorMessage = '';
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
      });
<<<<<<< HEAD
      await _loadNearbyParkings();
=======
      _loadNearbyParkings(center: LatLng(position.latitude, position.longitude));
      _startLocationUpdates();
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = 'Failed to get location: $e';
      });
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

<<<<<<< HEAD
    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      // Get token from session
      final user = await SessionService.getSession();
      final token = user?.id;
      
      // Real API call to get nearby parking spaces
      final response = await http.get(
        Uri.parse(
          '${ApiService.baseUrl}/spaces/nearby?lat=${_currentPosition!.latitude}&lng=${_currentPosition!.longitude}&radius=5000',
        ),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      debugPrint('API Response Status: ${response.statusCode}');
      debugPrint('API Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Check if data is empty or null
        if (data == null || (data is List && data.isEmpty) || (data is Map && data['data'] == null)) {
          // Empty response - show coming soon
          setState(() {
            _nearbyParkings = [];
            _isLoading = false;
            _markers.clear();
          });
          return;
        }
        
        // Handle both list and object responses
        List<dynamic> spaces = [];
        if (data is List) {
          spaces = data;
        } else if (data is Map && data['data'] != null) {
          spaces = data['data'] is List ? data['data'] : [];
        }
        
        List<ParkingModel> parkings = [];
        for (var item in spaces) {
          // Skip if item is null
          if (item == null) continue;
          
          try {
            // Add distance calculation if not provided by API
            double distance = 0;
            if (item['distance'] != null) {
              distance = (item['distance'] as num).toDouble();
            } else {
              // Calculate approximate distance
              final lat = (item['latitude'] ?? 0.0).toDouble();
              final lng = (item['longitude'] ?? 0.0).toDouble();
              distance = _calculateDistance(
                _currentPosition!.latitude,
                _currentPosition!.longitude,
                lat,
                lng,
              );
            }
            
            final parking = ParkingModel(
              id: item['id']?.toString() ?? '',
              name: item['name'] ?? 'Unknown Parking',
              address: item['address'] ?? '',
              latitude: (item['latitude'] ?? 0.0).toDouble(),
              longitude: (item['longitude'] ?? 0.0).toDouble(),
              availableSpots: item['availableSpots'] ?? 0,
              totalSpots: item['totalSpots'] ?? 0,
              rate: (item['rate'] ?? item['pricePerHour'] ?? item['price'] ?? 0.0).toDouble(),
              distance: distance,
              isOpen: item['isOpen'] ?? true,
              rating: (item['rating'] ?? 0.0).toDouble(),
              amenities: List<String>.from(item['amenities'] ?? []),
            );
            parkings.add(parking);
          } catch (e) {
            debugPrint('Error parsing parking item: $e');
            continue;
          }
        }

        // Sort by distance
        parkings.sort((a, b) => a.distance.compareTo(b.distance));

        setState(() {
          _nearbyParkings = parkings;
          _isLoading = false;
          if (parkings.isNotEmpty) {
            _updateMarkers(parkings);
          } else {
            _markers.clear();
          }
        });
      } else {
        setState(() {
          _isLoading = false;
          _hasError = true;
          _errorMessage = 'Failed to load parking spaces (Status: ${response.statusCode})';
        });
      }
=======
  Future<void> _loadNearbyParkings({required LatLng center}) async {
    try {
      // TODO real API: replace with GET /spaces (nearby by lat/lng) once
      // driver-facing endpoints are confirmed.
      final mockParkings = _getMockParkings(center.latitude, center.longitude);
      setState(() => _nearbyParkings = mockParkings);
      _updateMarkers(mockParkings);
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = 'Error loading parking spaces: $e';
      });
      debugPrint('Error loading parkings: $e');
    }
  }

<<<<<<< HEAD
  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371; // Earth's radius in km
    final dLat = _toRadians(lat2 - lat1);
    final dLon = _toRadians(lon2 - lon1);
    final a = 
      sin(dLat / 2) * sin(dLat / 2) +
      cos(_toRadians(lat1)) * cos(_toRadians(lat2)) * 
      sin(dLon / 2) * sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c; // Distance in km
  }

  double _toRadians(double degree) {
    return degree * pi / 180.0;
=======
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
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
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

<<<<<<< HEAD
      for (var i = 0; i < parkings.length; i++) {
        final parking = parkings[i];
        
        BitmapDescriptor markerIcon;
        if (parking.availableSpots > 5) {
          markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
        } else if (parking.availableSpots > 0) {
          markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
        } else {
          markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
        }

        final rateDisplay = parking.hasRate 
            ? '\$${parking.rate!.toStringAsFixed(2)}/hr' 
            : 'Rate N/A';

        _markers.add(
          Marker(
            markerId: MarkerId('parking_${i}_${parking.id}'),
            position: LatLng(parking.latitude, parking.longitude),
            icon: markerIcon,
            onTap: () => _showParkingDetails(parking),
            infoWindow: InfoWindow(
              title: parking.name,
              snippet: '${parking.availableSpots} spots • $rateDisplay',
              onTap: () => _showParkingDetails(parking),
            ),
          ),
        );
=======
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
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
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
    final rateDisplay = parking.hasRate 
        ? '\$${parking.rate!.toStringAsFixed(2)}' 
        : 'N/A';

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
              _buildStatItem(icon: Icons.attach_money, label: 'Rate/Hour', value: rateDisplay, isDark: isDark),
              const SizedBox(width: 12),
              _buildStatItem(icon: Icons.star, label: 'Rating', value: parking.rating.toStringAsFixed(1), isDark: isDark),
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
                  onPressed: (parking.hasAvailableSpots && parking.hasRate)
                      ? () {
                          Navigator.pop(context);
                          _bookParking(parking);
                        }
                      : null,
                  icon: const Icon(Icons.book_online),
                  label: Text(parking.hasRate ? 'Book Now' : 'Rate N/A'),
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

<<<<<<< HEAD
  void _navigateToParking(ParkingModel parking) {
    final url = 'https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}';
    debugPrint('Navigate to: $url');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Opening Google Maps...'), duration: Duration(seconds: 1)),
    );
  }

  Future<void> _bookParking(ParkingModel parking) async {
    final booking = await showNewBookingSheet(context, parking);
    if (booking == null || !mounted) return;

=======
  Future<void> _bookParking(ParkingModel parking) async {
    final booking = await showNewBookingSheet(context, parking);
    if (booking == null || !mounted) return;
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
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

<<<<<<< HEAD
  void _onSearchPressed() {
    showSearch(
      context: context,
      delegate: ParkingSearchDelegate(_nearbyParkings),
    );
  }

  Widget _buildComingSoonCard() {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: (isDark ? const Color(0xFF1A2740) : const Color(0xFF18D6C0)).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.local_parking_rounded,
                size: 60,
                color: const Color(0xFF18D6C0),
              ),
            ),
            const SizedBox(height: 30),
            Text(
              'Parking Spaces Coming Soon!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'We are currently onboarding parking spaces in your area. \nStay tuned for updates!',
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 30),
            GestureDetector(
              onTap: () {
                // TODO: Implement notification subscription
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('You will be notified when parking spaces are available!'),
                    backgroundColor: Color(0xFF18D6C0),
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF18D6C0).withOpacity(0.1),
                      const Color(0xFF18D6C0).withOpacity(0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFF18D6C0).withOpacity(0.2),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.notifications_active,
                      color: const Color(0xFF18D6C0),
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Notify me when available',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF18D6C0),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

=======
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Scaffold(
      body: Stack(
        children: [
          // Map or Error/Coming Soon overlay
          if (_cameraPosition != null && !_hasError && _nearbyParkings.isNotEmpty)
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
          else if (_hasError)
            Container(
              color: isDark ? const Color(0xFF0A0F1F) : Colors.grey[50],
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.red[300],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Something went wrong',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        _errorMessage,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: _loadNearbyParkings,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Try Again'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF18D6C0),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else if (_nearbyParkings.isEmpty && !_isLoading)
            _buildComingSoonCard()
          else
            const Center(child: CircularProgressIndicator()),

          // Top Search Bar
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
<<<<<<< HEAD
                    const SizedBox(width: 10),
                    GestureDetector(
                      onTap: () => Provider.of<ThemeProvider>(context, listen: false).toggleTheme(),
                      child: Container(
                        padding: const EdgeInsets.all(12),
=======
                    if (_suggestions.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.only(top: 6),
                        constraints: const BoxConstraints(maxHeight: 260),
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
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

<<<<<<< HEAD
          // Loading overlay
=======
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

>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.3),
              child: const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF18D6C0)))),
            ),
        ],
      ),
<<<<<<< HEAD
      bottomNavigationBar: const AppBottomNav(currentIndex: 0),
    );
  }
}

class ParkingSearchDelegate extends SearchDelegate<ParkingModel?> {
  final List<ParkingModel> parkings;

  ParkingSearchDelegate(this.parkings);

  @override
  String get searchFieldLabel => 'Search parking...';

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () {
          query = '';
        },
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () {
        close(context, null);
      },
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    final results = parkings
        .where((p) => p.name.toLowerCase().contains(query.toLowerCase()) || p.address.toLowerCase().contains(query.toLowerCase()))
        .toList();

    return ListView.builder(
      itemCount: results.length,
      itemBuilder: (context, index) {
        final parking = results[index];
        return ListTile(
          leading: const Icon(Icons.local_parking),
          title: Text(parking.name),
          subtitle: Text(parking.address),
          trailing: Text('${parking.availableSpots} spots'),
          onTap: () {
            close(context, parking);
          },
        );
      },
    );
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    if (query.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Search for parking spaces',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    final results = parkings
        .where((p) => p.name.toLowerCase().contains(query.toLowerCase()) || p.address.toLowerCase().contains(query.toLowerCase()))
        .toList();

    return ListView.builder(
      itemCount: results.length,
      itemBuilder: (context, index) {
        final parking = results[index];
        return ListTile(
          leading: const Icon(Icons.local_parking),
          title: Text(parking.name),
          subtitle: Text(parking.address),
          trailing: Text('${parking.availableSpots} spots'),
          onTap: () {
            query = parking.name;
            showResults(context);
          },
        );
      },
=======
>>>>>>> a1e5c24904eee8ef1bbb006d249bd423fa874946
    );
  }
}