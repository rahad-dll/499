// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../main.dart';
import '../../models/parking_model.dart';
import '../../models/user_model.dart';
import '../../services/location_service.dart';
import '../../services/session_service.dart';
import '../../services/api_service.dart';
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
  bool _hasError = false;
  String _errorMessage = '';
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
      });
      await _loadNearbyParkings();
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = 'Failed to get location: $e';
      });
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
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = 'Error loading parking spaces: $e';
      });
      debugPrint('Error loading parkings: $e');
    }
  }

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

          // Loading overlay
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
    );
  }
}