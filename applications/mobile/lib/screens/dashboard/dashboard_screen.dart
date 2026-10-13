// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../main.dart';
import '../../models/parking_model.dart';
import '../../services/location_service.dart';
import '../../services/parking_api_service.dart';
import '../../services/places_service.dart';
import '../../utils/app_snackbar.dart';
import '../../utils/map_utils.dart';
import '../../utils/marker_builder.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
import '../../widgets/dashboard/booking_confirmation_dialog.dart';
import '../../widgets/dashboard/dashboard_colors.dart';
import '../../widgets/dashboard/dashboard_map.dart';
import '../../widgets/dashboard/dashboard_search_bar.dart';
import '../../widgets/dashboard/exit_dialog.dart';
import '../../widgets/dashboard/map_loading_placeholder.dart';
import '../../widgets/dashboard/no_results_card.dart';
import '../../widgets/dashboard/parking_details_sheet.dart';
import '../../widgets/dashboard/parking_strip.dart';
import '../../widgets/dashboard/route_info_card.dart';
import 'bookings_screen.dart';
import 'new_booking_sheet.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with WidgetsBindingObserver {
  // Controllers & Services
  late final PlacesService _placesService;
  final ParkingApiService _parkingApi = ParkingApiService();
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _stripController = ScrollController();
  final LocationService _locationService = LocationService();

  // Map & Location
  GoogleMapController? _mapController;
  Position? _currentPosition;
  StreamSubscription<Position>? _positionSub;
  CameraPosition? _cameraPosition;

  // Data
  List<ParkingModel> _nearbyParkings = [];
  List<PlaceSuggestion> _suggestions = [];
  List<ParkingModel> _filteredParkings = [];
  Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};

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

  // Debounce / lifecycle
  Timer? _debounce;
  bool _isDisposed = false;

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

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
    _searchController.dispose();
    _placesService.dispose();
    _parkingApi.dispose();
    _stripController.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _currentPosition != null &&
        mounted) {
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
        showAppSnackBar(
          context,
          'Unable to get location. Please enable GPS.',
          isError: true,
        );
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

    setState(() => _isFetching = true);

    List<ParkingModel> parkings = [];
    try {
      parkings = await _parkingApi.fetchNearby(center);
    } catch (e) {
      debugPrint('Error loading parkings: $e');
    }

    if (!mounted || _isDisposed) return;

    setState(() {
      _nearbyParkings = parkings;
      _filteredParkings = parkings;
      _isFetching = false;
    });
    _updateMarkers(parkings);
  }

  // =========================================================================
  // MAP MARKERS
  // =========================================================================

  void _updateMarkers(List<ParkingModel> parkings) {
    if (_isDisposed) return;

    final markers = buildDashboardMarkers(
      parkings: parkings,
      currentPosition: _currentPosition,
      searchedLocation: _searchedLocation,
      searchedLocationLabel: _searchedLocationLabel,
      onParkingTap: _onMarkerOrCardTap,
    );

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

      // আগে local parking filter
      final query = value.toLowerCase().trim();
      final filtered = _nearbyParkings
          .where((p) =>
              p.name.toLowerCase().contains(query) ||
              p.address.toLowerCase().contains(query))
          .toList();

      setState(() => _filteredParkings = filtered);

      // তারপর location suggestion
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
      final here =
          LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
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

  void _showParkingDetails(ParkingModel parking) {
    if (_isDisposed) return;
    setState(() => _selectedParking = parking);

    ParkingDetailsSheet.show(
      context,
      parking: parking,
      onNavigate: () => _navigateToParking(parking),
      onBook: () => _bookParking(parking),
    );
  }

  Future<void> _navigateToParking(ParkingModel parking) async {
    if (_currentPosition == null || _isDisposed) return;

    final origin =
        LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
    final destination = LatLng(parking.latitude, parking.longitude);

    final distanceKm = await _locationService.calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
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
          color: DashColors.teal,
          width: 5,
          points: directions,
        ));
      }
    });

    if (directions.isNotEmpty) {
      try {
        final bounds = boundsFromPoints([origin, destination, ...directions]);
        _mapController?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
      } catch (e) {
        _mapController?.animateCamera(CameraUpdate.newCameraPosition(
          CameraPosition(target: destination, zoom: 16),
        ));
      }
    }

    _openExternalNavigation(parking);
  }

  Future<void> _openExternalNavigation(ParkingModel parking) async {
    try {
      final uri = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}&travelmode=driving',
      );
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        showAppSnackBar(context, 'Could not open Google Maps');
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
  // BOOKING
  // =========================================================================

  Future<void> _bookParking(ParkingModel parking) async {
    if (_isDisposed) return;

    final booking = await showNewBookingSheet(context, parking);
    if (booking == null || !mounted || _isDisposed) return;

    await showBookingConfirmationDialog(
      context,
      parking: parking,
      hours: booking.durationHours,
      onViewBookings: () {
        if (!mounted) return;
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const BookingsScreen()),
        );
      },
    );
  }

  // =========================================================================
  // BUILD
  // =========================================================================

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final bgColor = isDark ? DashColors.darkBg : DashColors.lightBg;

    final canShowStrip =
        _filteredParkings.isNotEmpty && !_isLoading && !_isFetching;
    final canShowNoResults = _filteredParkings.isEmpty &&
        !_isLoading &&
        !_isFetching &&
        _searchController.text.isNotEmpty;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldExit = await showExitDialog(context);
        if (shouldExit) await SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: bgColor,
        body: Stack(
          children: [
            // Map
            if (_cameraPosition != null && !_isLoading)
              DashboardMap(
                initialCameraPosition: _cameraPosition!,
                markers: _markers,
                polylines: _polylines,
                onMapCreated: (controller) => _mapController = controller,
                onTap: () => setState(() {
                  _suggestions = [];
                  _selectedParking = null;
                }),
              )
            else
              const MapLoadingPlaceholder(),

            // Search bar
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: DashboardSearchBar(
                controller: _searchController,
                onChanged: _onSearchChanged,
                onClear: _clearSearch,
                isLoading: _searchLoading,
                suggestions: _suggestions,
                onSuggestionSelected: _onSuggestionSelected,
              ),
            ),

            // Bottom area: route card, parking strip, বা "no results"
            if (_showRoute && _routeDestination != null)
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: RouteInfoCard(
                  destination: _routeDestination!,
                  distanceKm: _routeDistance,
                  onClose: _clearRoute,
                ),
              )
            else if (canShowStrip)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: ParkingStrip(
                  parkings: _filteredParkings,
                  selectedParking: _selectedParking,
                  scrollController: _stripController,
                  onParkingTap: _onMarkerOrCardTap,
                  searchedLocationLabel: _searchedLocationLabel,
                ),
              )
            else if (canShowNoResults)
              Positioned(
                left: 20,
                right: 20,
                bottom: 24,
                child: NoResultsCard(onClear: _clearSearch),
              ),
          ],
        ),
        bottomNavigationBar: const AppBottomNav(currentIndex: 0),
      ),
    );
  }
}