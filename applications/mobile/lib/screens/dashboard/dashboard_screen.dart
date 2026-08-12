// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../../utils/currency_formatter.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
import 'bookings_screen.dart';
import 'profile_screen.dart';
import 'new_booking_sheet.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with WidgetsBindingObserver, TickerProviderStateMixin {
  // Controllers & Services
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;
  late final PlacesService _placesService;
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _stripController = ScrollController();
  final LocationService _locationService = LocationService();
  
  // Map & Location
  GoogleMapController? _mapController;
  Position? _currentPosition;
  StreamSubscription<Position>? _positionSub;
  CameraPosition? _cameraPosition;
  bool _isMapReady = false;
  
  // Data
  List<ParkingModel> _nearbyParkings = [];
  List<PlaceSuggestion> _suggestions = [];
  List<ParkingModel> _filteredParkings = [];
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  
  // State
  bool _isLoading = true;
  bool _isFetching = false;
  bool _searchLoading = false;
  bool _isSearching = false;
  bool _showRoute = false;
  
  // Selected
  ParkingModel? _selectedParking;
  ParkingModel? _routeDestination;
  double? _routeDistance;
  String? _searchedLocationLabel;
  LatLng? _searchedLocation;
  
  // Debounce
  Timer? _debounce;
  http.Client? _apiClient;
  bool _isDisposed = false;

  // Constants
  static const String _apiBaseUrl = 'https://four99-b6wg.onrender.com';
  static const Color _primaryTeal = Color(0xFF18D6C0);
  static const Color _primaryBlue = Color(0xFF0AA6C4);

  @override
  void initState() {
    super.initState();
    _placesService = PlacesService();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    WidgetsBinding.instance.addObserver(this);
    _initializeLocation();
  }

  @override
  void dispose() {
    _isDisposed = true;
    _pulseController.dispose();
    _debounce?.cancel();
    _positionSub?.cancel();
    _searchController.dispose();
    _placesService.dispose();
    _apiClient?.close();
    _stripController.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _currentPosition != null && mounted) {
      _loadNearbyParkings(
        center: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
      );
    }
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  Future<void> _initializeLocation() async {
    try {
      final position = await _locationService.getCurrentLocation();
      if (!mounted || _isDisposed) return;

      setState(() {
        _currentPosition = position;
        _cameraPosition = CameraPosition(
          target: LatLng(position.latitude, position.longitude),
          zoom: 15.5,
        );
        _isLoading = false;
      });

      await _loadNearbyParkings(
        center: LatLng(position.latitude, position.longitude),
      );
      _startLocationUpdates();
    } catch (e) {
      if (mounted && !_isDisposed) {
        setState(() => _isLoading = false);
        _showSnackBar('Unable to get location. Please enable GPS.', isError: true);
      }
    }
  }

  void _startLocationUpdates() {
    _positionSub?.cancel();
    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 30,
      ),
    ).listen(
      (position) {
        if (!mounted || _isDisposed || _isSearching) return;
        setState(() => _currentPosition = position);
        if (_searchedLocation == null && !_isFetching) {
          _loadNearbyParkings(
            center: LatLng(position.latitude, position.longitude),
          );
        }
      },
      onError: (error) => debugPrint('Location stream error: $error'),
    );
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================

  Future<void> _loadNearbyParkings({required LatLng center}) async {
    if (_isFetching || _isDisposed) return;

    _apiClient?.close();
    _apiClient = http.Client();
    setState(() => _isFetching = true);

    try {
      final url = Uri.parse(
        '$_apiBaseUrl/spaces/nearby?lat=${center.latitude}&lng=${center.longitude}'
      );

      final response = await _apiClient!
          .get(url, headers: {'Content-Type': 'application/json'})
          .timeout(const Duration(seconds: 20));

      if (!mounted || _isDisposed) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        List<ParkingModel> parkings = [];

        List<dynamic> spaces = [];
        if (data is List) {
          spaces = data;
        } else if (data is Map && data['data'] != null) {
          spaces = data['data'] is List ? data['data'] : [];
        }

        if (spaces.isNotEmpty) {
          parkings = spaces
              .whereType<Map<String, dynamic>>()
              .map((json) => ParkingModel.fromJson(json))
              .toList();
          parkings.sort((a, b) => a.distance.compareTo(b.distance));
        }

        if (mounted && !_isDisposed) {
          setState(() {
            _nearbyParkings = parkings;
            _filteredParkings = parkings;
            _isFetching = false;
          });
          _updateMarkers(parkings);
        }
      } else {
        if (mounted && !_isDisposed) {
          setState(() {
            _isFetching = false;
            _nearbyParkings = [];
            _filteredParkings = [];
          });
          _updateMarkers([]);
        }
      }
    } catch (e) {
      debugPrint('Error loading parkings: $e');
      if (mounted && !_isDisposed) {
        setState(() {
          _isFetching = false;
          _nearbyParkings = [];
          _filteredParkings = [];
        });
        _updateMarkers([]);
      }
    } finally {
      _apiClient?.close();
      _apiClient = null;
    }
  }

  // =========================================================================
  // MAP MARKERS
  // =========================================================================

  void _updateMarkers(List<ParkingModel> parkings) {
    if (_isDisposed) return;

    final markers = <Marker>{};

    // User location marker
    if (_currentPosition != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('user_location'),
          position: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueCyan),
          infoWindow: const InfoWindow(title: 'Your Location'),
        ),
      );
    }

    // Searched location marker
    if (_searchedLocation != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('searched_location'),
          position: _searchedLocation!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
          infoWindow: InfoWindow(title: _searchedLocationLabel ?? 'Searched location'),
        ),
      );
    }

    // Parking markers
    for (var parking in parkings) {
      double hue;
      if (!parking.isOpen) {
        hue = BitmapDescriptor.hueRose;
      } else if (parking.availableSpots > 5) {
        hue = BitmapDescriptor.hueGreen;
      } else if (parking.availableSpots > 0) {
        hue = BitmapDescriptor.hueOrange;
      } else {
        hue = BitmapDescriptor.hueRed;
      }

      markers.add(
        Marker(
          markerId: MarkerId('parking_${parking.id}'),
          position: LatLng(parking.latitude, parking.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(hue),
          onTap: () => _onMarkerOrCardTap(parking),
          infoWindow: InfoWindow(
            title: parking.name,
            snippet: '${parking.availableSpots} spots available • ${parking.availabilityStatus}',
          ),
        ),
      );
    }

    setState(() => _markers = markers);
  }

  // =========================================================================
  // SEARCH
  // =========================================================================

  void _onSearchChanged(String value) {
    _debounce?.cancel();

    if (value.trim().isEmpty) {
      setState(() {
        _suggestions = [];
        _isSearching = false;
        _filteredParkings = _nearbyParkings;
      });
      return;
    }

    setState(() => _isSearching = true);

    _debounce = Timer(const Duration(milliseconds: 400), () async {
      if (_isDisposed) return;
      setState(() => _searchLoading = true);

      // Filter local parkings first
      final query = value.toLowerCase().trim();
      final filtered = _nearbyParkings.where((p) =>
        p.name.toLowerCase().contains(query) ||
        p.address.toLowerCase().contains(query)
      ).toList();
      
      setState(() => _filteredParkings = filtered);

      // Get location suggestions
      final bias = _currentPosition != null
          ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
          : null;

      final results = await _placesService.autocomplete(value, bias: bias);

      if (mounted && !_isDisposed) {
        setState(() {
          _suggestions = results;
          _searchLoading = false;
        });
      }
    });
  }

  Future<void> _onSuggestionSelected(PlaceSuggestion suggestion) async {
    if (_isDisposed) return;

    setState(() {
      _suggestions = [];
      _searchController.text = suggestion.description;
      _searchedLocationLabel = suggestion.description.split(',').first.trim();
    });
    FocusScope.of(context).unfocus();

    final target = LatLng(suggestion.lat, suggestion.lng);
    setState(() {
      _searchedLocation = target;
      _isSearching = false;
    });

    _mapController?.animateCamera(CameraUpdate.newCameraPosition(
      CameraPosition(target: target, zoom: 15.5),
    ));

    await _loadNearbyParkings(center: target);
  }

  void _clearSearch() {
    if (_isDisposed) return;

    setState(() {
      _searchController.clear();
      _suggestions = [];
      _searchedLocation = null;
      _searchedLocationLabel = null;
      _isSearching = false;
      _filteredParkings = _nearbyParkings;
    });

    if (_currentPosition != null) {
      final here = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
      _mapController?.animateCamera(CameraUpdate.newCameraPosition(
        CameraPosition(target: here, zoom: 15.5),
      ));
      _loadNearbyParkings(center: here);
    }
  }

  // =========================================================================
  // PARKING INTERACTIONS
  // =========================================================================

  void _onMarkerOrCardTap(ParkingModel parking) {
    if (_isDisposed) return;
    setState(() {
      _selectedParking = parking;
      _showRoute = false;
      _polylines.clear();
      _routeDestination = null;
      _routeDistance = null;
    });
    _mapController?.animateCamera(CameraUpdate.newLatLng(
      LatLng(parking.latitude, parking.longitude),
    ));

    final index = _filteredParkings.indexWhere((p) => p.id == parking.id);
    if (index != -1 && _stripController.hasClients) {
      _stripController.animateTo(
        index * 200.0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
    
    _showParkingDetails(parking);
  }

  Future<void> _navigateToParking(ParkingModel parking) async {
    if (_currentPosition == null || _isDisposed) return;

    final origin = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
    final destination = LatLng(parking.latitude, parking.longitude);

    final distanceKm = await _locationService.calculateDistance(
      origin.latitude, origin.longitude, destination.latitude, destination.longitude,
    );

    final directions = await _placesService.getDirections(origin, destination);

    if (!mounted || _isDisposed) return;

    setState(() {
      _routeDestination = parking;
      _routeDistance = distanceKm;
      _showRoute = true;
      _polylines.clear();

      if (directions.isNotEmpty) {
        _polylines.add(Polyline(
          polylineId: const PolylineId('active_route'),
          color: const Color(0xFF18D6C0),
          width: 5,
          points: directions,
        ));
      }
    });

    if (directions.isNotEmpty) {
      try {
        final bounds = _boundsFromPoints([origin, destination, ...directions]);
        _mapController?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
      } catch (e) {
        _mapController?.animateCamera(CameraUpdate.newCameraPosition(
          CameraPosition(target: destination, zoom: 16),
        ));
      }
    }

    _openExternalNavigation(parking);
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

    final latPadding = (maxLat - minLat) * 0.12;
    final lngPadding = (maxLng - minLng) * 0.12;

    return LatLngBounds(
      southwest: LatLng(minLat - latPadding, minLng - lngPadding),
      northeast: LatLng(maxLat + latPadding, maxLng + lngPadding),
    );
  }

  Future<void> _openExternalNavigation(ParkingModel parking) async {
    try {
      final uri = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}&travelmode=driving',
      );
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        _showSnackBar('Could not open Google Maps');
      }
    } catch (e) {
      debugPrint('Error opening navigation: $e');
    }
  }

  void _clearRoute() {
    if (_isDisposed) return;
    setState(() {
      _showRoute = false;
      _routeDestination = null;
      _routeDistance = null;
      _polylines.clear();
      _selectedParking = null;
    });
  }

  // =========================================================================
  // PARKING DETAILS SHEET
  // =========================================================================

  void _showParkingDetails(ParkingModel parking) {
    if (_isDisposed) return;
    setState(() => _selectedParking = parking);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildParkingDetailsSheet(parking),
    );
  }

  Widget _buildParkingDetailsSheet(ParkingModel parking) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final cardColor = isDark ? const Color(0xFF1A2740) : Colors.white;

    return DraggableScrollableSheet(
      initialChildSize: 0.58,
      minChildSize: 0.30,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              decoration: BoxDecoration(
                color: cardColor.withValues(alpha: 0.97),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                border: Border.all(
                  color: const Color(0xFF18D6C0).withValues(alpha: 0.10),
                  width: 1,
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Handle
                  Center(
                    child: Container(
                      margin: const EdgeInsets.only(top: 12),
                      width: 48,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey[700] : Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  
                  Expanded(
                    child: SingleChildScrollView(
                      controller: scrollController,
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header with status
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      parking.name,
                                      style: TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        color: isDark ? Colors.white : const Color(0xFF172033),
                                        letterSpacing: -0.3,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.location_on_rounded,
                                          size: 16,
                                          color: isDark ? Colors.grey[400] : Colors.grey[500],
                                        ),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            parking.address.isNotEmpty ? parking.address : 'Location unavailable',
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                                              height: 1.3,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Status Pill
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      parking.availabilityColor.withValues(alpha: 0.20),
                                      parking.availabilityColor.withValues(alpha: 0.05),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: parking.availabilityColor.withValues(alpha: 0.30),
                                    width: 1.2,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 7,
                                      height: 7,
                                      decoration: BoxDecoration(
                                        color: parking.availabilityColor,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      parking.availabilityStatus,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: parking.availabilityColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 18),

                          // Stats Row
                          Row(
                            children: [
                              _buildDetailChip(
                                icon: Icons.local_parking_rounded,
                                value: '${parking.availableSpots}',
                                label: 'Available',
                                isDark: isDark,
                                color: parking.availabilityColor,
                              ),
                              const SizedBox(width: 8),
                              _buildDetailChip(
                                icon: Icons.timer_rounded,
                                value: parking.formattedRate,
                                label: 'Per Hour',
                                isDark: isDark,
                              ),
                              const SizedBox(width: 8),
                              _buildDetailChip(
                                icon: Icons.near_me_rounded,
                                value: parking.formattedDistance,
                                label: 'Distance',
                                isDark: isDark,
                              ),
                            ],
                          ),

                          // Occupancy bar
                          if (parking.totalSpots > 0) ...[
                            const SizedBox(height: 18),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Occupancy',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                                        ),
                                      ),
                                      Text(
                                        '${(parking.occupancyRatio * 100).round()}%',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: isDark ? Colors.grey[300] : Colors.grey[700],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: LinearProgressIndicator(
                                      value: parking.occupancyRatio,
                                      minHeight: 8,
                                      backgroundColor: isDark ? const Color(0xFF0F1728) : Colors.grey[200],
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        parking.availabilityColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          // Amenities
                          if (parking.amenities.isNotEmpty) ...[
                            const SizedBox(height: 18),
                            Text(
                              'Amenities',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.grey[300] : Colors.grey[700],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: parking.amenities.map((amenity) {
                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        const Color(0xFF18D6C0).withValues(alpha: 0.12),
                                        const Color(0xFF0AA6C4).withValues(alpha: 0.05),
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: const Color(0xFF18D6C0).withValues(alpha: 0.20),
                                    ),
                                  ),
                                  child: Text(
                                    amenity,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: isDark ? Colors.grey[300] : const Color(0xFF172033),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],

                          const SizedBox(height: 20),

                          // Action Buttons
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.pop(context);
                                    _navigateToParking(parking);
                                  },
                                  icon: const Icon(Icons.navigation_rounded, size: 18),
                                  label: const Text('Navigate'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF18D6C0),
                                    side: const BorderSide(color: Color(0xFF18D6C0), width: 1.4),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                flex: 2,
                                child: Container(
                                  decoration: BoxDecoration(
                                    gradient: parking.hasAvailableSpots
                                        ? const LinearGradient(
                                            colors: [Color(0xFF18D6C0), Color(0xFF0AA6C4)],
                                            begin: Alignment.topLeft,
                                            end: Alignment.bottomRight,
                                          )
                                        : null,
                                    color: parking.hasAvailableSpots ? null : Colors.grey.withValues(alpha: 0.20),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: ElevatedButton.icon(
                                    onPressed: parking.hasAvailableSpots
                                        ? () {
                                            Navigator.pop(context);
                                            _bookParking(parking);
                                          }
                                        : null,
                                    icon: const Icon(Icons.bolt_rounded, size: 18),
                                    label: Text(
                                      parking.hasAvailableSpots ? 'Book Now' : 'Fully Booked',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 15,
                                      ),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      shadowColor: Colors.transparent,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailChip({
    required IconData icon,
    required String value,
    required String label,
    required bool isDark,
    Color? color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F1728) : Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? const Color(0xFF253248) : Colors.grey[200]!,
            width: 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color ?? const Color(0xFF18D6C0)),
            const SizedBox(height: 4),
            Text(
              value,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : const Color(0xFF172033),
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.grey[400] : Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // BOOKING
  // =========================================================================

  Future<void> _bookParking(ParkingModel parking) async {
    if (_isDisposed) return;

    final booking = await showNewBookingSheet(context, parking);
    if (booking == null || !mounted || _isDisposed) return;

    _showBookingConfirmation(parking, booking.durationHours);
  }

  void _showBookingConfirmation(ParkingModel parking, int hours) {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDark
                  ? [const Color(0xFF1A2740), const Color(0xFF0F1728)]
                  : [Colors.white, const Color(0xFFF8FAFC)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: const Color(0xFF18D6C0).withValues(alpha: 0.20),
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF18D6C0).withValues(alpha: 0.20),
                blurRadius: 40,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Success icon with gradient
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF18D6C0), Color(0xFF0AA6C4)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  color: Colors.white,
                  size: 40,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Booking Confirmed!',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF172033),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                parking.name,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF18D6C0),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F1728) : Colors.grey[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? const Color(0xFF253248) : Colors.grey[200]!,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      color: Color(0xFF18D6C0),
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$hours hour${hours > 1 ? 's' : ''} booked',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.grey[300] : Colors.grey[700],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Container(
                      width: 1,
                      height: 20,
                      color: isDark ? Colors.grey[700] : Colors.grey[300],
                    ),
                    const SizedBox(width: 16),
                    const Icon(
                      Icons.location_on_rounded,
                      color: Color(0xFF18D6C0),
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        parking.formattedDistance,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.grey[300] : Colors.grey[700],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const BookingsScreen()),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF18D6C0),
                        side: const BorderSide(color: Color(0xFF18D6C0), width: 1.2),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('View Bookings'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF18D6C0), Color(0xFF0AA6C4)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Got it'),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // UI HELPERS
  // =========================================================================

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : const Color(0xFF18D6C0),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(12),
      ),
    );
  }

  Future<bool> _showExitDialog() async {
    if (_isDisposed) return true;
    return await showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.10),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.exit_to_app_rounded,
                  color: Colors.red,
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Exit CityPulse?',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Are you sure you want to exit the app?',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context, false),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.grey,
                        side: const BorderSide(color: Colors.grey, width: 1.2),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Exit'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ) ?? false;
  }

  // =========================================================================
  // BUILD
  // =========================================================================

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final bgColor = isDark ? const Color(0xFF0F1728) : const Color(0xFFF5F7FA);

    return WillPopScope(
      onWillPop: _showExitDialog,
      child: Scaffold(
        backgroundColor: bgColor,
        body: Stack(
          children: [
            // Map
            if (_cameraPosition != null && !_isLoading)
              GoogleMap(
                onMapCreated: (controller) {
                  _mapController = controller;
                  _isMapReady = true;
                },
                initialCameraPosition: _cameraPosition!,
                markers: _markers,
                polylines: _polylines,
                myLocationEnabled: true,
                myLocationButtonEnabled: false,
                compassEnabled: true,
                zoomControlsEnabled: false,
                mapType: MapType.normal,
                style: isDark ? MapStyles.dark : null,
                onTap: (_) => setState(() {
                  _suggestions = [];
                  _selectedParking = null;
                }),
              )
            else
              Container(
                color: isDark ? Colors.grey[900] : Colors.grey[100],
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF18D6C0), Color(0xFF0AA6C4)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.local_parking_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF18D6C0)),
                        strokeWidth: 2.6,
                      ),
                    ],
                  ),
                ),
              ),

            // Floating Search Bar
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 52,
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF1A2740).withValues(alpha: 0.92)
                                    : Colors.white.withValues(alpha: 0.92),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isDark
                                      ? const Color(0xFF253248)
                                      : Colors.grey[200]!,
                                  width: 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.06),
                                    blurRadius: 16,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  const SizedBox(width: 14),
                                  Icon(
                                    Icons.search_rounded,
                                    color: const Color(0xFF18D6C0),
                                    size: 20,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: TextField(
                                      controller: _searchController,
                                      onChanged: _onSearchChanged,
                                      style: TextStyle(
                                        color: isDark ? Colors.white : const Color(0xFF172033),
                                        fontSize: 14,
                                      ),
                                      decoration: InputDecoration(
                                        hintText: 'Search for parking...',
                                        hintStyle: TextStyle(
                                          color: isDark ? Colors.grey[400] : Colors.grey[500],
                                          fontSize: 14,
                                        ),
                                        border: InputBorder.none,
                                        isDense: true,
                                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                                      ),
                                    ),
                                  ),
                                  if (_searchLoading)
                                    const Padding(
                                      padding: EdgeInsets.only(right: 12),
                                      child: SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF18D6C0)),
                                        ),
                                      ),
                                    )
                                  else if (_searchController.text.isNotEmpty)
                                    GestureDetector(
                                      onTap: _clearSearch,
                                      child: Padding(
                                        padding: const EdgeInsets.only(right: 12),
                                        child: Icon(
                                          Icons.close_rounded,
                                          size: 18,
                                          color: isDark ? Colors.grey[400] : Colors.grey[500],
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          // Theme Toggle
                          Container(
                            height: 52,
                            width: 52,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF18D6C0), Color(0xFF0AA6C4)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF18D6C0).withValues(alpha: 0.30),
                                  blurRadius: 16,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: IconButton(
                              onPressed: () => Provider.of<ThemeProvider>(context, listen: false).toggleTheme(),
                              icon: Icon(
                                isDark ? Icons.nightlight_round_rounded : Icons.wb_sunny_rounded,
                                color: Colors.white,
                                size: 22,
                              ),
                            ),
                          ),
                        ],
                      ),
                      // Suggestions
                      if (_suggestions.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(top: 8),
                          constraints: const BoxConstraints(maxHeight: 240),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1A2740) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark ? const Color(0xFF253248) : Colors.grey[200]!,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.08),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: ListView.separated(
                            shrinkWrap: true,
                            padding: EdgeInsets.zero,
                            itemCount: _suggestions.length,
                            separatorBuilder: (_, __) => Divider(
                              height: 1,
                              color: isDark ? const Color(0xFF253248) : Colors.grey[200],
                            ),
                            itemBuilder: (context, index) {
                              final s = _suggestions[index];
                              return ListTile(
                                dense: true,
                                leading: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF18D6C0).withValues(alpha: 0.10),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    Icons.place_rounded,
                                    color: const Color(0xFF18D6C0),
                                    size: 18,
                                  ),
                                ),
                                title: Text(
                                  s.description,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: isDark ? Colors.white : const Color(0xFF172033),
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
            if (_showRoute && _routeDestination != null)
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: SafeArea(
                  top: false,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A2740) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: const Color(0xFF18D6C0).withValues(alpha: 0.20),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.12),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF18D6C0), Color(0xFF0AA6C4)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.directions_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _routeDestination!.name,
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  color: isDark ? Colors.white : const Color(0xFF172033),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (_routeDistance != null)
                                Text(
                                  '${_routeDistance!.toStringAsFixed(1)} km away',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? Colors.grey[400] : Colors.grey[500],
                                  ),
                                ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: _clearRoute,
                          icon: Icon(
                            Icons.close_rounded,
                            size: 20,
                            color: isDark ? Colors.grey[400] : Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            // Parking Strip
            else if (_filteredParkings.isNotEmpty && !_isLoading && !_isFetching)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: SafeArea(
                  top: false,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Results count
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF18D6C0).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${_filteredParkings.length} ${_filteredParkings.length == 1 ? 'spot' : 'spots'}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF18D6C0),
                                ),
                              ),
                            ),
                            const Spacer(),
                            if (_searchedLocationLabel != null)
                              Text(
                                _searchedLocationLabel!,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? Colors.grey[400] : Colors.grey[500],
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                        ),
                      ),
                      // Horizontal scroll of parking cards
                      SizedBox(
                        height: 170,
                        child: ListView.separated(
                          controller: _stripController,
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredParkings.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) {
                            final parking = _filteredParkings[index];
                            final isSelected = _selectedParking?.id == parking.id;
                            return _buildParkingCard(parking, isDark, isSelected);
                          },
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              )
            // No results
            else if (_filteredParkings.isEmpty && !_isLoading && !_isFetching && _searchController.text.isNotEmpty)
              Positioned(
                left: 20,
                right: 20,
                bottom: 24,
                child: SafeArea(
                  top: false,
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A2740) : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: const Color(0xFF18D6C0).withValues(alpha: 0.20),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF18D6C0).withValues(alpha: 0.10),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: const Color(0xFF18D6C0).withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.search_off_rounded,
                            color: Color(0xFF18D6C0),
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'No parking found',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : const Color(0xFF172033),
                                ),
                              ),
                              Text(
                                'Try searching for a different location',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? Colors.grey[400] : Colors.grey[500],
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_searchController.text.isNotEmpty)
                          IconButton(
                            onPressed: _clearSearch,
                            icon: Icon(
                              Icons.close_rounded,
                              size: 20,
                              color: isDark ? Colors.grey[400] : Colors.grey[500],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
        bottomNavigationBar: const AppBottomNav(
          currentIndex: 0,
        ),
      ),
    );
  }

  // =========================================================================
  // PARKING CARD
  // =========================================================================

  Widget _buildParkingCard(ParkingModel parking, bool isDark, bool isSelected) {
    return GestureDetector(
      onTap: () => _onMarkerOrCardTap(parking),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        width: 190,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  colors: [
                    const Color(0xFF18D6C0).withValues(alpha: 0.08),
                    const Color(0xFF0AA6C4).withValues(alpha: 0.03),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: isDark ? const Color(0xFF1A2740) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF18D6C0)
                : (isDark ? const Color(0xFF253248) : Colors.grey[200]!),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? const Color(0xFF18D6C0).withValues(alpha: 0.20)
                  : Colors.black.withValues(alpha: isDark ? 0.20 : 0.04),
              blurRadius: isSelected ? 16 : 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Name and status dot
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    parking.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF172033),
                      letterSpacing: -0.2,
                    ),
                  ),
                ),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: parking.availabilityColor,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: parking.availabilityColor.withValues(alpha: 0.40),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                Icon(
                  Icons.location_on_rounded,
                  size: 12,
                  color: isDark ? Colors.grey[400] : Colors.grey[500],
                ),
                const SizedBox(width: 2),
                Expanded(
                  child: Text(
                    parking.formattedDistance,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.grey[400] : Colors.grey[500],
                    ),
                  ),
                ),
              ],
            ),
            const Spacer(),
            // Availability badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    parking.availabilityColor.withValues(alpha: 0.15),
                    parking.availabilityColor.withValues(alpha: 0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: parking.availabilityColor.withValues(alpha: 0.20),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    parking.isOpen ? '${parking.availableSpots} free' : 'Closed',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: parking.availabilityColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Text(
                    parking.formattedRate,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.grey[400] : Colors.grey[500],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 16,
                  color: isDark ? Colors.grey[500] : Colors.grey[400],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}