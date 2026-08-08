// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import '../../main.dart';
import '../../models/parking_model.dart';
import '../../models/user_model.dart';
import '../../services/location_service.dart';
import '../../services/session_service.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
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
  final Completer<GoogleMapController> _controllerCompleter = Completer();

  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};

  List<ParkingModel> _nearbyParkings = [];
  bool _isLoading = true;
  CameraPosition? _cameraPosition;
  final LocationService _locationService = LocationService();
  User? _currentUser;

  @override
  void initState() {
    super.initState();
    _loadUser();
    _initializeLocation();
  }

  Future<void> _loadUser() async {
    final user = await SessionService.getSession();
    setState(() {
      _currentUser = user;
    });
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
      _loadNearbyParkings();
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error getting location: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadNearbyParkings() async {
    if (_currentPosition == null) return;

    try {
      // TODO real API: replace with GET /spaces (nearby by lat/lng) once
      // driver-facing endpoints are confirmed. ParkingModel.fromJson()
      // already matches a plausible response shape, so this is a
      // drop-in swap later.
      final mockParkings = _getMockParkings(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
      );

      setState(() {
        _nearbyParkings = mockParkings;
        _updateMarkers(mockParkings);
      });
    } catch (e) {
      debugPrint('Error loading parkings: $e');
    }
  }

  List<ParkingModel> _getMockParkings(double lat, double lng) {
    return [
      ParkingModel(
        id: '1',
        name: 'City Center Parking',
        address: '123 Main Street, Downtown',
        latitude: lat + 0.002,
        longitude: lng + 0.003,
        availableSpots: 12,
        totalSpots: 50,
        pricePerHour: 2.50,
        distance: 0.3,
        isOpen: true,
        rating: 4.5,
        amenities: const ['CCTV', 'EV Charging', '24/7'],
      ),
      ParkingModel(
        id: '2',
        name: 'Mall Parking',
        address: '456 Shopping Mall',
        latitude: lat - 0.003,
        longitude: lng + 0.002,
        availableSpots: 8,
        totalSpots: 30,
        pricePerHour: 3.00,
        distance: 0.5,
        isOpen: true,
        rating: 4.2,
        amenities: const ['CCTV', 'Covered'],
      ),
      ParkingModel(
        id: '3',
        name: 'Station Parking',
        address: '789 Railway Station',
        latitude: lat + 0.004,
        longitude: lng - 0.003,
        availableSpots: 3,
        totalSpots: 20,
        pricePerHour: 1.50,
        distance: 0.8,
        isOpen: true,
        rating: 3.8,
        amenities: const ['CCTV'],
      ),
      ParkingModel(
        id: '4',
        name: 'Hospital Parking',
        address: '101 Medical Center',
        latitude: lat - 0.002,
        longitude: lng - 0.004,
        availableSpots: 0,
        totalSpots: 40,
        pricePerHour: 2.00,
        distance: 1.2,
        isOpen: false,
        rating: 4.0,
        amenities: const ['CCTV', 'Covered', '24/7'],
      ),
    ];
  }

  void _updateMarkers(List<ParkingModel> parkings) {
    if (_currentPosition == null) return;

    setState(() {
      _markers.clear();

      _markers.add(
        Marker(
          markerId: const MarkerId('user_location'),
          position: LatLng(
            _currentPosition!.latitude,
            _currentPosition!.longitude,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: 'Your Location'),
        ),
      );

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
            // Tapping the marker itself now opens the details sheet too,
            // not just the tiny info-window snippet — much easier to hit
            // on a phone screen.
            onTap: () => _showParkingDetails(parking),
            infoWindow: InfoWindow(
              title: parking.name,
              snippet: '${parking.availableSpots} spots • \$${parking.pricePerHour}/hr',
              onTap: () => _showParkingDetails(parking),
            ),
          ),
        );
      }
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
              Icon(Icons.location_on, size: 16, color: isDark ? Colors.grey[400] : Colors.grey[600]),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  parking.address,
                  style: TextStyle(fontSize: 14, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                ),
              ),
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
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F1728) : Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    amenity,
                    style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[300] : Colors.grey[600]),
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
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToParking(ParkingModel parking) {
    final url = 'https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}';
    debugPrint('Navigate to: $url');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Opening Google Maps...'), duration: Duration(seconds: 1)),
    );
  }

  // Now actually creates a booking (mock-backed today, same call shape
  // works once BookingService.useLocalMock is flipped to false) instead
  // of just showing a snackbar.
  Future<void> _bookParking(ParkingModel parking) async {
    final booking = await showNewBookingSheet(context, parking);
    if (booking == null || !mounted) return; // user cancelled the sheet

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Booked ${parking.name} for ${booking.durationHours}h'),
        backgroundColor: const Color(0xFF22C55E),
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.white,
          onPressed: () {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const BookingsScreen()),
            );
          },
        ),
      ),
    );
  }

  void _onMapCreated(GoogleMapController controller) {
    _controllerCompleter.complete(controller);
    _mapController = controller;
  }

  void _onSearchPressed() {
    showSearch(
      context: context,
      delegate: ParkingSearchDelegate(_nearbyParkings),
    );
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
            )
          else
            const Center(child: CircularProgressIndicator()),

          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      (isDark ? Colors.black : Colors.white).withOpacity(0.9),
                      (isDark ? Colors.black : Colors.white).withOpacity(0.0),
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: _onSearchPressed,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1A2740).withOpacity(0.9) : Colors.white.withOpacity(0.9),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? const Color(0xFF253248) : Colors.grey[200]!),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.search, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Search nearby parking...',
                                  style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600], fontSize: 14),
                                ),
                              ),
                              if (_nearbyParkings.isNotEmpty)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF18D6C0).withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    '${_nearbyParkings.length} spots',
                                    style: const TextStyle(color: Color(0xFF18D6C0), fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Quick theme toggle, right on the map bar — no need
                    // to dig into Profile just to flip light/dark.
                    GestureDetector(
                      onTap: () => Provider.of<ThemeProvider>(context, listen: false).toggleTheme(),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1A2740).withOpacity(0.9) : Colors.white.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isDark ? const Color(0xFF253248) : Colors.grey[200]!),
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
              ),
            ),
          ),

          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.3),
              child: const Center(
                child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF18D6C0))),
              ),
            ),
        ],
      ),
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
    );
  }
}