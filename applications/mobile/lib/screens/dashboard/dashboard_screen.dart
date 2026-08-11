// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';
import 'dart:convert';
import 'dart:ui';
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
import '../../utils/currency_formatter.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
import 'bookings_screen.dart';
import 'profile_screen.dart';
import 'new_booking_sheet.dart';

// Brand tokens — same gradient used across auth screens, keep it consistent
// everywhere so the app doesn't feel stitched together from different UIs.
const Color _kTeal = Color(0xFF18D6C0);
const Color _kBlue = Color(0xFF0AA6C4);
const LinearGradient _kBrandGradient = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [_kTeal, _kBlue],
);

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with WidgetsBindingObserver {
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
  late final PlacesService _placesService;

  // Search related
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  List<PlaceSuggestion> _suggestions = [];
  bool _searchLoading = false;

  LatLng? _searchedLocation;
  String? _searchedLocationLabel;

  ParkingModel? _routeDestination;
  double? _routeDistanceKm;

  // Which card in the nearby strip is highlighted / selected on the map
  String? _selectedParkingId;
  final ScrollController _stripController = ScrollController();

  // API base URL
  static const String _apiBaseUrl = 'https://four99-b6wg.onrender.com';

  // Cancellation tokens for ongoing requests
  http.Client? _apiClient;
  bool _isDisposed = false;

  bool get _showNoResultsCard =>
      !_isLoading && !_isFetching && _nearbyParkings.isEmpty && _cameraPosition != null;

  bool get _showNearbyStrip =>
      !_isLoading && _nearbyParkings.isNotEmpty && _routeDestination == null;

  @override
  void initState() {
    super.initState();
    _placesService = PlacesService();
    WidgetsBinding.instance.addObserver(this);
    _initializeLocation();
  }

  @override
  void dispose() {
    _isDisposed = true;
    _debounce?.cancel();
    _positionSub?.cancel();
    _positionSub = null;
    _searchController.dispose();
    _placesService.dispose();
    _apiClient?.close();
    _apiClient = null;
    _stripController.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Handle app lifecycle changes
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Refresh data when app comes back
      if (_currentPosition != null && mounted) {
        _loadNearbyParkings(
          center: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
        );
      }
    }
  }

  Future<void> _initializeLocation() async {
    try {
      final position = await _locationService.getCurrentLocation();
      if (!mounted || _isDisposed) return;

      setState(() {
        _currentPosition = position;
        _cameraPosition = CameraPosition(
          target: LatLng(position.latitude, position.longitude),
          zoom: 15,
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error getting location: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _startLocationUpdates() {
    // Cancel existing subscription if any
    _positionSub?.cancel();

    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 30,
      ),
    ).listen(
      (position) {
        if (!mounted || _isDisposed) return;
        setState(() => _currentPosition = position);

        // Only refresh if not searching
        if (_searchedLocation == null && !_isFetching) {
          _loadNearbyParkings(
            center: LatLng(position.latitude, position.longitude),
          );
        }
      },
      onError: (error) {
        debugPrint('Location stream error: $error');
      },
    );
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();

    if (value.trim().isEmpty) {
      setState(() => _suggestions = []);
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 500), () async {
      if (_isDisposed) return;
      setState(() => _searchLoading = true);

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
    });
    FocusScope.of(context).unfocus();

    final target = LatLng(suggestion.lat, suggestion.lng);

    setState(() {
      _searchedLocation = target;
      _searchedLocationLabel = suggestion.description.split(',').first.trim();
    });

    _mapController?.animateCamera(CameraUpdate.newCameraPosition(
      CameraPosition(target: target, zoom: 15),
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
    });

    if (_currentPosition != null) {
      final here = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
      _mapController?.animateCamera(CameraUpdate.newCameraPosition(
        CameraPosition(target: here, zoom: 15),
      ));
      _loadNearbyParkings(center: here);
    }
  }

  Future<void> _loadNearbyParkings({required LatLng center}) async {
    if (_isFetching || _isDisposed) return;

    // Cancel previous API request
    _apiClient?.close();
    _apiClient = http.Client();

    setState(() => _isFetching = true);

    try {
      final url = Uri.parse(
        '$_apiBaseUrl/spaces/nearby?lat=${center.latitude}&lng=${center.longitude}'
      );

      final response = await _apiClient!
          .get(
            url,
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(const Duration(seconds: 20));

      if (!mounted || _isDisposed) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        List<ParkingModel> parkings = [];

        if (data == null || (data is List && data.isEmpty)) {
          setState(() {
            _nearbyParkings = [];
            _isFetching = false;
            _markers.clear();
            _selectedParkingId = null;
          });
          _updateMarkers([]);
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
            _selectedParkingId = null;
          });
          _updateMarkers([]);
          return;
        }

        parkings = spaces
            .whereType<Map<String, dynamic>>()
            .map((json) => ParkingModel.fromJson(json))
            .toList();

        // Closest first — matches what the backend already sorts by, but
        // guards us if a future endpoint doesn't sort.
        parkings.sort((a, b) => a.distance.compareTo(b.distance));

        if (mounted && !_isDisposed) {
          setState(() {
            _nearbyParkings = parkings;
            _isFetching = false;
          });
          _updateMarkers(parkings);
        }
      } else {
        if (mounted && !_isDisposed) {
          setState(() {
            _isFetching = false;
            _nearbyParkings = [];
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
        });
        _updateMarkers([]);
      }
    } finally {
      _apiClient?.close();
      _apiClient = null;
    }
  }

  void _updateMarkers(List<ParkingModel> parkings) {
    if (_isDisposed) return;

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
      if (!parking.isOpen) {
        markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRose);
      } else if (parking.availableSpots > 5) {
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
          onTap: () => _onMarkerOrCardTap(parking),
          infoWindow: InfoWindow(
            title: parking.name,
            snippet: '${parking.availableSpots} spots • ${parking.availabilityStatus}',
            onTap: () => _showParkingDetails(parking),
          ),
        ),
      );
    }

    if (mounted && !_isDisposed) {
      setState(() {});
    }
  }

  void _onMarkerOrCardTap(ParkingModel parking) {
    if (_isDisposed) return;
    setState(() => _selectedParkingId = parking.id);
    _mapController?.animateCamera(CameraUpdate.newLatLng(
      LatLng(parking.latitude, parking.longitude),
    ));

    // Scroll the strip so the tapped card is visible
    final index = _nearbyParkings.indexWhere((p) => p.id == parking.id);
    if (index != -1 && _stripController.hasClients) {
      _stripController.animateTo(
        index * 208.0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _navigateToParking(ParkingModel parking) async {
    if (_currentPosition == null || _isDisposed) return;

    final origin = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
    final destination = LatLng(parking.latitude, parking.longitude);

    // Calculate distance
    final distanceKm = await _locationService.calculateDistance(
      origin.latitude, origin.longitude, destination.latitude, destination.longitude,
    );

    // Get directions
    final directions = await _placesService.getDirections(origin, destination);

    if (!mounted || _isDisposed) return;

    setState(() {
      _routeDestination = parking;
      _routeDistanceKm = distanceKm;
      _polylines.clear();

      if (directions.isNotEmpty) {
        _polylines.add(Polyline(
          polylineId: const PolylineId('active_route'),
          color: _kTeal,
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
        debugPrint('Error animating camera: $e');
        // Fallback: just zoom to destination
        _mapController?.animateCamera(CameraUpdate.newCameraPosition(
          CameraPosition(target: destination, zoom: 16),
        ));
      }
    }

    // Open external navigation
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

    // Add some padding
    final latPadding = (maxLat - minLat) * 0.1;
    final lngPadding = (maxLng - minLng) * 0.1;

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
        if (mounted && !_isDisposed) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open Google Maps')),
          );
        }
      }
    } catch (e) {
      debugPrint('Error opening navigation: $e');
    }
  }

  void _clearRoute() {
    if (_isDisposed) return;
    setState(() {
      _routeDestination = null;
      _routeDistanceKm = null;
      _polylines.clear();
    });
  }

  void _showParkingDetails(ParkingModel parking) {
    if (_isDisposed) return;
    setState(() => _selectedParkingId = parking.id);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildParkingDetailsSheet(parking),
    );
  }

  Widget _buildParkingDetailsSheet(ParkingModel parking) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final cardColor = isDark ? const Color(0xFF16223A) : Colors.white;

    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.35,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              decoration: BoxDecoration(
                color: cardColor.withValues(alpha: 0.97),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                border: Border.all(
                  color: _kTeal.withValues(alpha: 0.15),
                ),
              ),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey[700] : Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
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
                                fontSize: 21,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(Icons.location_on_rounded,
                                    size: 15,
                                    color: isDark ? Colors.grey[400] : Colors.grey[600]),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    parking.address.isNotEmpty
                                        ? parking.address
                                        : 'Address unavailable',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: isDark ? Colors.grey[400] : Colors.grey[600],
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
                      const SizedBox(width: 10),
                      _statusPill(parking),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Occupancy bar — visual read of how full the space is
                  if (parking.totalSpots > 0) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: parking.occupancyRatio,
                        minHeight: 8,
                        backgroundColor: isDark
                            ? const Color(0xFF0F1728)
                            : Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          parking.availabilityColor,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${parking.availableSpots} of ${parking.totalSpots} spots free',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  Row(
                    children: [
                      _statChip(
                        icon: Icons.local_parking_rounded,
                        label: 'Available',
                        value: '${parking.availableSpots}',
                        isDark: isDark,
                      ),
                      const SizedBox(width: 10),
                      _statChip(
                        icon: Icons.attach_money_rounded,
                        label: 'Price/Hour',
                        value: parking.hasRate
                            ? formatTaka(parking.rate!)
                            : 'N/A',
                        isDark: isDark,
                      ),
                      const SizedBox(width: 10),
                      _statChip(
                        icon: Icons.near_me_rounded,
                        label: 'Distance',
                        value: parking.formattedDistance,
                        isDark: isDark,
                        small: true,
                      ),
                    ],
                  ),

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
                          padding:
                              const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF0F1728) : Colors.grey[100],
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: _kTeal.withValues(alpha: 0.2),
                            ),
                          ),
                          child: Text(
                            amenity,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: isDark ? Colors.grey[300] : Colors.grey[700],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _navigateToParking(parking);
                          },
                          icon: const Icon(Icons.directions_rounded),
                          label: const Text('Navigate'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: _kTeal,
                            side: const BorderSide(color: _kTeal, width: 1.4),
                            padding: const EdgeInsets.symmetric(vertical: 15),
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
                                ? _kBrandGradient
                                : null,
                            color: parking.hasAvailableSpots
                                ? null
                                : Colors.grey.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: ElevatedButton.icon(
                            onPressed: parking.hasAvailableSpots
                                ? () {
                                    Navigator.pop(context);
                                    _bookParking(parking);
                                  }
                                : null,
                            icon: const Icon(Icons.bolt_rounded),
                            label: Text(
                              parking.hasAvailableSpots ? 'Book Now' : 'Fully Booked',
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 15),
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
        );
      },
    );
  }

  Widget _statusPill(ParkingModel parking) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: parking.availabilityColor.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: parking.availabilityColor.withValues(alpha: 0.4)),
      ),
      child: Text(
        parking.availabilityStatus,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: parking.availabilityColor,
        ),
      ),
    );
  }

  Widget _statChip({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    bool small = false,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F1728) : Colors.grey[50],
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark ? const Color(0xFF253248) : Colors.grey[200]!,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, size: 19, color: _kTeal),
            const SizedBox(height: 6),
            Text(
              value,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: small ? 12.5 : 15,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10.5,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _bookParking(ParkingModel parking) async {
    if (_isDisposed) return;

    final booking = await showNewBookingSheet(context, parking);
    if (booking == null || !mounted || _isDisposed) return;

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

  Future<bool> _showExitDialog() async {
    if (_isDisposed) return true;

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

  Widget _buildNoResultsCard(bool isDark) {
    return TweenAnimationBuilder<double>(
      key: ValueKey(_searchedLocationLabel ?? 'current_location'),
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) => Transform.translate(
        offset: Offset(0, (1 - value) * 30),
        child: Opacity(opacity: value, child: child),
      ),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A2740) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: _kTeal.withValues(alpha: 0.25),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: _kTeal.withValues(alpha: 0.15),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: _kTeal.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.local_parking_rounded,
                color: _kTeal,
                size: 28,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _searchedLocationLabel != null
                        ? 'Nothing here yet'
                        : 'Nothing near you yet',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _searchedLocationLabel != null
                        ? 'Parking spaces will be available soon near ${_searchedLocationLabel!}.'
                        : 'Parking spaces will be available soon near your location.',
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            if (_searchedLocation != null)
              IconButton(
                icon: Icon(Icons.close, size: 18, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                onPressed: _clearSearch,
                tooltip: 'Clear search',
              ),
          ],
        ),
      ),
    );
  }

  // Horizontal strip of every nearby space, closest first. Tapping a card
  // pans the map to that pin and opens the details sheet.
  Widget _buildNearbyStrip(bool isDark) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 20, right: 20, bottom: 10),
          child: Row(
            children: [
              Icon(Icons.tune_rounded,
                  size: 16, color: isDark ? Colors.grey[400] : Colors.grey[600]),
              const SizedBox(width: 6),
              Text(
                _searchedLocationLabel != null
                    ? 'Near ${_searchedLocationLabel!}'
                    : 'Near you',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const Spacer(),
              Text(
                '${_nearbyParkings.length} found',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: _kTeal,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 158,
          child: ListView.separated(
            controller: _stripController,
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _nearbyParkings.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final parking = _nearbyParkings[index];
              final selected = parking.id == _selectedParkingId;
              return _buildNearbyCard(parking, isDark, selected);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildNearbyCard(ParkingModel parking, bool isDark, bool selected) {
    return GestureDetector(
      onTap: () {
        _onMarkerOrCardTap(parking);
        _showParkingDetails(parking);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 196,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A2740) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected ? _kTeal : (isDark ? const Color(0xFF253248) : Colors.grey[200]!),
            width: selected ? 1.6 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: selected
                  ? _kTeal.withValues(alpha: 0.25)
                  : Colors.black.withValues(alpha: isDark ? 0.25 : 0.06),
              blurRadius: selected ? 16 : 10,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              parking.formattedDistance,
              style: TextStyle(
                fontSize: 11.5,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(
                color: parking.availabilityColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: parking.availabilityColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      parking.isOpen
                          ? '${parking.availableSpots} spots free'
                          : 'Closed',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: parking.availabilityColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Text(
                    parking.formattedRate,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.grey[300] : Colors.grey[700],
                    ),
                  ),
                ),
                Icon(Icons.chevron_right_rounded,
                    size: 18, color: isDark ? Colors.grey[500] : Colors.grey[400]),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return WillPopScope(
      onWillPop: _showExitDialog,
      child: Scaffold(
        body: Stack(
          children: [
            // Map
            if (_cameraPosition != null && !_isLoading)
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
              Container(
                color: isDark ? Colors.grey[900] : Colors.grey[100],
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ShaderMask(
                        shaderCallback: (bounds) => _kBrandGradient.createShader(bounds),
                        child: const Icon(Icons.local_parking_rounded,
                            size: 40, color: Colors.white),
                      ),
                      const SizedBox(height: 14),
                      const CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(_kTeal),
                        strokeWidth: 2.6,
                      ),
                    ],
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
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: BackdropFilter(
                                filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14),
                                  decoration: BoxDecoration(
                                    color: isDark
                                        ? const Color(0xFF1A2740).withValues(alpha: 0.85)
                                        : Colors.white.withValues(alpha: 0.9),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isDark
                                          ? const Color(0xFF253248)
                                          : Colors.grey[200]!,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                                        blurRadius: 16,
                                        offset: const Offset(0, 6),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      ShaderMask(
                                        shaderCallback: (bounds) =>
                                            _kBrandGradient.createShader(bounds),
                                        child: const Icon(Icons.search_rounded,
                                            color: Colors.white, size: 20),
                                      ),
                                      const SizedBox(width: 10),
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
                                            contentPadding:
                                                const EdgeInsets.symmetric(vertical: 14),
                                          ),
                                        ),
                                      ),
                                      if (_searchLoading)
                                        const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            valueColor:
                                                AlwaysStoppedAnimation<Color>(_kTeal),
                                          ),
                                        )
                                      else if (_searchController.text.isNotEmpty)
                                        GestureDetector(
                                          onTap: _clearSearch,
                                          child: Icon(
                                            Icons.close_rounded,
                                            size: 18,
                                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          GestureDetector(
                            onTap: () =>
                                Provider.of<ThemeProvider>(context, listen: false)
                                    .toggleTheme(),
                            child: Container(
                              padding: const EdgeInsets.all(13),
                              decoration: BoxDecoration(
                                gradient: _kBrandGradient,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: _kTeal.withValues(alpha: 0.35),
                                    blurRadius: 14,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: Icon(
                                isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                      // Search Suggestions
                      if (_suggestions.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(top: 8),
                          constraints: const BoxConstraints(maxHeight: 260),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1A2740) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark ? const Color(0xFF253248) : Colors.grey[200]!,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                                blurRadius: 16,
                                offset: const Offset(0, 8),
                              ),
                            ],
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
                                  color: _kTeal,
                                ),
                                title: Text(
                                  s.description,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
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
                child: SafeArea(
                  top: false,
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A2740) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            gradient: _kBrandGradient,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.directions_rounded,
                              color: Colors.white, size: 18),
                        ),
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
                          icon: const Icon(Icons.close_rounded),
                          onPressed: _clearRoute,
                        ),
                      ],
                    ),
                  ),
                ),
              )
            // Nearby places strip — every place near the searched/current location
            else if (_showNearbyStrip)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _buildNearbyStrip(isDark),
                  ),
                ),
              )
            // "No parking nearby" card
            else if (_showNoResultsCard)
              Positioned(
                left: 20,
                right: 20,
                bottom: 24,
                child: SafeArea(top: false, child: _buildNoResultsCard(isDark)),
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