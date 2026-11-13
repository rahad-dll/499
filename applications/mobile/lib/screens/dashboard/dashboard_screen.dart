// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';

import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../models/parking_model.dart';
import '../../services/booking_events.dart';
import '../../services/location_service.dart';
import '../../services/navigation_controller.dart';
import '../../services/parking_api_service.dart';
import '../../services/places_service.dart';
import '../../services/recent_searches_service.dart';
import '../../services/voice_guide.dart';
import '../../theme/map_style.dart';
import '../../utils/app_snackbar.dart';
import '../../utils/geo_utils.dart';
import '../../utils/map_utils.dart';
import '../../utils/marker_builder.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
import '../../widgets/dashboard/booking_confirmation_dialog.dart';
import '../../widgets/dashboard/dashboard_colors.dart';
import '../../widgets/dashboard/dashboard_map.dart';
import '../../widgets/dashboard/dashboard_search_bar.dart';
import '../../widgets/dashboard/exit_dialog.dart';
import '../../widgets/dashboard/map_loading_placeholder.dart';
import '../../widgets/dashboard/navigation_widgets.dart';
import '../../widgets/dashboard/no_results_card.dart';
import '../../widgets/dashboard/parking_details_sheet.dart';
import '../../widgets/dashboard/parking_strip.dart';
import '../../widgets/dashboard/search_panel.dart';
import 'booking_details_screen.dart';
import 'new_booking_sheet.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with WidgetsBindingObserver {
  // Services & controllers
  late final PlacesService _placesService;
  final RecentSearchesService _recentService = RecentSearchesService();
  final ParkingApiService _parkingApi = ParkingApiService();
  final LocationService _locationService = LocationService();
  final VoiceGuide _voice = VoiceGuide();
  late final NavigationController _nav =
      NavigationController(onSpeak: (text) => _voice.speak(text));
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  final ScrollController _stripController = ScrollController();

  // Map & location
  GoogleMapController? _mapController;
  Position? _currentPosition;
  StreamSubscription<Position>? _positionSub;
  CameraPosition? _cameraPosition;
  LatLng? _lastFetchCenter;
  bool _trafficOn = false;

  // Data
  List<ParkingModel> _nearbyParkings = [];
  List<ParkingModel> _filteredParkings = [];
  Set<Marker> _markers = {};

  // Search
  List<PlaceSuggestion> _places = [];
  List<ParkingModel> _localMatches = [];
  List<PlaceSuggestion> _recents = [];
  String _query = '';
  bool _searchLoading = false;
  int _searchSeq = 0;
  Timer? _debounce;

  // State
  bool _isLoading = true;
  bool _isFetching = false;
  int _fetchSeq = 0;
  int _markerGen = 0;

  // Selection
  ParkingModel? _selectedParking;
  ParkingModel? _routeDestination;
  String? _searchedLocationLabel;
  LatLng? _searchedLocation;

  // Navigation camera
  bool _followUser = true;
  DateTime _lastCameraMove = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _programmaticUntil = DateTime.fromMillisecondsSinceEpoch(0);
  NavStatus _lastNavStatus = NavStatus.idle;

  bool _isDisposed = false;
  Timer? _refreshTimer;

  // Layout constants
  static const double _stripInset = 235;
  static const double _previewInset = 190;
  static const double _navInset = 110;

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

  @override
  void initState() {
    super.initState();
    _placesService = PlacesService();
    WidgetsBinding.instance.addObserver(this);
    _searchFocus.addListener(_onFocusChanged);
    _nav.addListener(_onNavChanged);
    _voice.init();
    _loadRecents();
    _initializeLocation();
    BookingEvents.changes.addListener(_onBookingsChanged);
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => _refreshParkings(),
    );
  }

  @override
  void dispose() {
    _isDisposed = true;
    BookingEvents.changes.removeListener(_onBookingsChanged);
    _nav.removeListener(_onNavChanged);
    _nav.dispose();
    _voice.dispose();
    _setAwake(false);
    _searchFocus.removeListener(_onFocusChanged);
    _searchFocus.dispose();
    _debounce?.cancel();
    _refreshTimer?.cancel();
    _positionSub?.cancel();
    _searchController.dispose();
    _placesService.dispose();
    _parkingApi.dispose();
    _stripController.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _onBookingsChanged() {
    if (_isDisposed || !mounted) return;
    _refreshParkings();
  }

  void _onFocusChanged() {
    if (mounted && !_isDisposed) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _currentPosition != null &&
        _searchedLocation == null &&
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
        if (!mounted || _isDisposed) return;
        _currentPosition = position;
        // While navigating the NavigationController owns the GPS updates.
        if (_nav.status != NavStatus.idle || _searchedLocation != null) return;

        final here = LatLng(position.latitude, position.longitude);
        final last = _lastFetchCenter;
        // Only refetch after moving ~150 m: fewer requests, no flicker.
        if (last == null || GeoUtils.distanceM(last, here) > 150) {
          _loadNearbyParkings(center: here);
        }
      },
      onError: (error) => debugPrint('Location stream error: $error'),
    );
  }

  Future<void> _loadRecents() async {
    final list = await _recentService.load();
    if (!mounted || _isDisposed) return;
    setState(() => _recents = list);
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================

  Future<void> _loadNearbyParkings({required LatLng center}) async {
    if (_isDisposed) return;
    final seq = ++_fetchSeq; // latest request wins, older ones are dropped
    _lastFetchCenter = center;
    setState(() => _isFetching = true);

    List<ParkingModel>? parkings;
    try {
      parkings = await _parkingApi.fetchNearby(center);
    } catch (e) {
      debugPrint('Error loading parkings: $e');
    }

    if (!mounted || _isDisposed || seq != _fetchSeq) return;

    setState(() {
      // Keep the previous data when a request fails instead of blanking.
      if (parkings != null) {
        _nearbyParkings = parkings;
        _filteredParkings = parkings;
      }
      _isFetching = false;
    });
    _updateMarkers();
  }

  Future<void> _refreshParkings() async {
    if (_isDisposed || !mounted) return;
    LatLng? center = _searchedLocation;
    if (center == null && _currentPosition != null) {
      center = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
    }
    if (center == null) return;
    await _loadNearbyParkings(center: center);
  }

  // =========================================================================
  // MAP MARKERS
  // =========================================================================

  Future<void> _updateMarkers() async {
    if (_isDisposed || !mounted) return;
    final gen = ++_markerGen;
    final dpr = MediaQuery.of(context).devicePixelRatio;

    // While a route is active only the destination pin is shown.
    final List<ParkingModel> visible;
    if (_nav.status == NavStatus.idle || _routeDestination == null) {
      visible = _nearbyParkings;
    } else {
      visible = [_routeDestination!];
    }

    final markers = await buildDashboardMarkers(
      parkings: visible,
      selectedId: _selectedParking?.id,
      searchedLocation:
          _nav.status == NavStatus.idle ? _searchedLocation : null,
      searchedLocationLabel: _searchedLocationLabel,
      devicePixelRatio: dpr,
      onParkingTap: _onMarkerOrCardTap,
    );

    if (!mounted || _isDisposed || gen != _markerGen) return;
    setState(() => _markers = markers);
  }

  // =========================================================================
  // SEARCH
  // =========================================================================

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    final q = value.trim();
    final seq = ++_searchSeq;

    if (q.isEmpty) {
      setState(() {
        _query = '';
        _places = [];
        _localMatches = [];
        _searchLoading = false;
      });
      return;
    }

    // Parking spaces already loaded are matched instantly, no network.
    final lq = q.toLowerCase();
    final local = _nearbyParkings
        .where((p) =>
            p.name.toLowerCase().contains(lq) ||
            p.address.toLowerCase().contains(lq))
        .toList();

    setState(() {
      _query = q;
      _localMatches = local;
      _searchLoading = q.length >= 2;
    });
    if (q.length < 2) return;

    _debounce = Timer(const Duration(milliseconds: 220), () async {
      if (_isDisposed) return;
      final bias = _currentPosition != null
          ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
          : null;

      final results = await _placesService.autocomplete(q, bias: bias);
      if (!mounted || _isDisposed || seq != _searchSeq) return; // stale

      setState(() {
        _places = results;
        _searchLoading = false;
      });
    });
  }

  /// Keyboard "search" key: open the best match straight away.
  void _onSearchSubmitted(String value) {
    if (_localMatches.isNotEmpty) {
      _onParkingPicked(_localMatches.first);
    } else if (_places.isNotEmpty) {
      _onPlaceSelected(_places.first);
    }
  }

  void _onParkingPicked(ParkingModel parking) {
    _searchFocus.unfocus();
    setState(() {
      _searchController.text = parking.name;
      _query = '';
      _places = [];
      _localMatches = [];
    });
    _mapController?.animateCamera(CameraUpdate.newCameraPosition(
      CameraPosition(
        target: LatLng(parking.latitude, parking.longitude),
        zoom: 16.5,
      ),
    ));
    _onMarkerOrCardTap(parking);
  }

  Future<void> _onPlaceSelected(PlaceSuggestion suggestion) async {
    if (_isDisposed) return;
    _searchFocus.unfocus();
    setState(() {
      _searchController.text = suggestion.primary;
      _query = '';
      _places = [];
      _localMatches = [];
      _searchLoading = true;
    });

    final target = await _placesService.resolve(suggestion);
    if (!mounted || _isDisposed) return;
    setState(() => _searchLoading = false);

    if (target == null) {
      showAppSnackBar(context, 'Could not open that place. Try another.',
          isError: true);
      return;
    }

    _recentService.add(suggestion.withLocation(target)).then((_) {
      _loadRecents();
    });

    setState(() {
      _searchedLocation = target;
      _searchedLocationLabel = suggestion.primary;
    });

    _mapController?.animateCamera(CameraUpdate.newCameraPosition(
      CameraPosition(target: target, zoom: 15.5),
    ));
    await _loadNearbyParkings(center: target);
  }

  void _clearSearch() {
    if (_isDisposed) return;
    _debounce?.cancel();
    _searchSeq++;

    setState(() {
      _searchController.clear();
      _query = '';
      _places = [];
      _localMatches = [];
      _searchLoading = false;
      _searchedLocation = null;
      _searchedLocationLabel = null;
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

  /// Long-press anywhere on the map to look for parking around that spot.
  void _onMapLongPress(LatLng point) {
    if (_nav.status != NavStatus.idle) return;
    HapticFeedback.mediumImpact();
    _searchFocus.unfocus();
    setState(() {
      _searchedLocation = point;
      _searchedLocationLabel = 'Dropped pin';
      _searchController.text = 'Dropped pin';
      _query = '';
      _places = [];
      _localMatches = [];
    });
    _loadNearbyParkings(center: point);
  }

  // =========================================================================
  // PARKING INTERACTIONS
  // =========================================================================

  void _onMarkerOrCardTap(ParkingModel parking) {
    if (_isDisposed) return;
    _searchFocus.unfocus();
    setState(() => _selectedParking = parking);
    _updateMarkers();

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

    ParkingDetailsSheet.show(
      context,
      parking: parking,
      onNavigate: () => _navigateToParking(parking),
      onBook: () => _bookParking(parking),
    );
  }

  // =========================================================================
  // NAVIGATION
  // =========================================================================

  void _onNavChanged() {
    if (!mounted || _isDisposed) return;
    final st = _nav.status;
    if (st != _lastNavStatus) {
      _lastNavStatus = st;
      if (st == NavStatus.arrived) _setAwake(false);
      _updateMarkers();
    }
    setState(() {});
    if (st == NavStatus.navigating && _followUser) _followCamera();
  }

  Future<void> _navigateToParking(ParkingModel parking) async {
    if (_isDisposed) return;
    if (_currentPosition == null) {
      showAppSnackBar(context, 'Waiting for your GPS location...',
          isError: true);
      return;
    }

    final origin =
        LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
    final destination = LatLng(parking.latitude, parking.longitude);

    setState(() {
      _routeDestination = parking;
      _selectedParking = parking;
    });

    final ok = await _nav.preview(
      origin: origin,
      destination: destination,
      name: parking.name,
    );
    if (!mounted || _isDisposed) return;

    if (!ok) {
      setState(() => _routeDestination = null);
      showAppSnackBar(
        context,
        'Could not find a route in-app. Opening Google Maps instead.',
        isError: true,
      );
      _openExternalNavigation(parking);
      return;
    }

    _fitRoute();
  }

  void _fitRoute() {
    final route = _nav.route;
    if (route == null) return;
    try {
      _mapController?.animateCamera(
        CameraUpdate.newLatLngBounds(boundsFromPoints(route.points), 70),
      );
    } catch (_) {
      _mapController?.animateCamera(CameraUpdate.newCameraPosition(
        CameraPosition(target: route.destination, zoom: 15.5),
      ));
    }
  }

  Future<void> _startNavigation({bool simulate = false}) async {
    _followUser = true;
    _lastCameraMove = DateTime.fromMillisecondsSinceEpoch(0);
    _setAwake(true);
    await _nav.start();
    if (simulate) _nav.startSimulation();
    _followCamera();
  }

  Future<void> _setAwake(bool on) async {
    try {
      if (on) {
        await WakelockPlus.enable();
      } else {
        await WakelockPlus.disable();
      }
    } catch (e) {
      debugPrint('Wakelock error: $e');
    }
  }

  void _toggleVoice() {
    setState(() => _voice.enabled = !_voice.enabled);
    if (!_voice.enabled) _voice.stop();
  }

  void _endNavigation() {
    final here = _currentPosition;
    _nav.stop();
    _voice.stop();
    _setAwake(false);
    setState(() {
      _routeDestination = null;
      _selectedParking = null;
      _followUser = true;
    });
    _updateMarkers();
    if (here != null) {
      _programmaticUntil = DateTime.now().add(const Duration(seconds: 2));
      _mapController?.animateCamera(CameraUpdate.newCameraPosition(
        CameraPosition(
          target: LatLng(here.latitude, here.longitude),
          zoom: 15.5,
        ),
      ));
    }
  }

  /// Camera follows the vehicle: heading-up, tilted, zoom by speed, with the
  /// vehicle shifted toward the bottom of the screen like real nav apps.
  void _followCamera() {
    final pos = _nav.position;
    if (pos == null || _mapController == null) return;

    final now = DateTime.now();
    if (now.difference(_lastCameraMove) < const Duration(milliseconds: 700)) {
      return;
    }
    _lastCameraMove = now;
    _programmaticUntil = now.add(const Duration(milliseconds: 1500));

    final speed = _nav.speedMps;
    final zoom = speed > 16 ? 16.6 : (speed > 8 ? 17.2 : 17.9);
    final ahead =
        GeoUtils.offset(pos, _nav.heading, speed > 16 ? 120 : 55);

    _mapController!.animateCamera(CameraUpdate.newCameraPosition(
      CameraPosition(
        target: ahead,
        zoom: zoom,
        bearing: _nav.heading,
        tilt: 50,
      ),
    ));
  }

  void _onCameraMoveStarted() {
    if (_nav.status == NavStatus.navigating &&
        _followUser &&
        DateTime.now().isAfter(_programmaticUntil)) {
      setState(() => _followUser = false); // user panned the map
    }
  }

  void _recenter() {
    if (_nav.status == NavStatus.navigating) {
      setState(() => _followUser = true);
      _lastCameraMove = DateTime.fromMillisecondsSinceEpoch(0);
      _followCamera();
      return;
    }
    final here = _currentPosition;
    if (here == null) return;
    _mapController?.animateCamera(CameraUpdate.newCameraPosition(
      CameraPosition(
        target: LatLng(here.latitude, here.longitude),
        zoom: 15.5,
      ),
    ));
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

  // =========================================================================
  // BOOKING
  // =========================================================================

  Future<void> _bookParking(ParkingModel parking) async {
    if (_isDisposed) return;

    final booking = await showNewBookingSheet(context, parking);
    if (booking == null || !mounted || _isDisposed) return;

    _refreshParkings();

    await showBookingConfirmationDialog(
      context,
      parking: parking,
      hours: booking.durationHours,
      onViewBookings: () async {
        if (!mounted) return;
        // Straight to the new booking: pay, check in, extend from there.
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => BookingDetailsScreen(booking: booking),
          ),
        );
        if (mounted && !_isDisposed) _refreshParkings();
      },
    );
  }

  // =========================================================================
  // BUILD
  // =========================================================================

  Set<Polyline> _buildPolylines() {
    final route = _nav.route;
    if (route == null) return const {};

    final remaining =
        _nav.remainingPoints.length >= 2 ? _nav.remainingPoints : route.points;
    final dark = Theme.of(context).brightness == Brightness.dark;

    final lines = <Polyline>{
      // Casing: gives the route contrast on any map colour.
      Polyline(
        polylineId: const PolylineId('route_casing'),
        points: remaining,
        color: dark ? const Color(0xFF0B1220) : Colors.white,
        width: 10,
        jointType: JointType.round,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
        zIndex: 1,
      ),
      Polyline(
        polylineId: const PolylineId('route_line'),
        points: remaining,
        color: DashColors.teal,
        width: 6,
        jointType: JointType.round,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
        zIndex: 2,
      ),
    };

    if (_nav.traveledPoints.length >= 2) {
      lines.add(Polyline(
        polylineId: const PolylineId('route_traveled'),
        points: _nav.traveledPoints,
        color: const Color(0xFF9CA3AF),
        width: 6,
        jointType: JointType.round,
        zIndex: 2,
      ));
    }
    return lines;
  }

  @override
  Widget build(BuildContext context) {
    final navStatus = _nav.status;
    final browsing = navStatus == NavStatus.idle && !_nav.isLoadingRoute;

    final canShowStrip = browsing &&
        _filteredParkings.isNotEmpty &&
        !_isLoading &&
        !_isFetching &&
        !_searchFocus.hasFocus;
    final canShowNoResults = browsing &&
        _nearbyParkings.isEmpty &&
        !_isLoading &&
        !_isFetching &&
        _searchedLocation != null;

    double bottomInset = 24;
    if (navStatus == NavStatus.previewing) {
      bottomInset = _previewInset;
    } else if (navStatus == NavStatus.navigating ||
        navStatus == NavStatus.arrived) {
      bottomInset = _navInset;
    } else if (canShowStrip) {
      bottomInset = _stripInset;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final showPanel = browsing && _searchFocus.hasFocus;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (_nav.status != NavStatus.idle) {
          _endNavigation();
          return;
        }
        if (_searchFocus.hasFocus) {
          _searchFocus.unfocus();
          return;
        }
        final shouldExit = await showExitDialog(context);
        if (shouldExit) await SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: DashColors.background,
        body: Stack(
          children: [
            // Map
            if (_cameraPosition != null && !_isLoading)
              DashboardMap(
                initialCameraPosition: _cameraPosition!,
                markers: _markers,
                polylines: _buildPolylines(),
                style: isDark ? MapStyles.dark : MapStyles.light,
                trafficEnabled: _trafficOn,
                padding: EdgeInsets.only(
                  top: navStatus == NavStatus.navigating ? 130 : 80,
                  bottom: bottomInset,
                ),
                onMapCreated: (controller) => _mapController = controller,
                onCameraMoveStarted: _onCameraMoveStarted,
                onLongPress: _onMapLongPress,
                onTap: () {
                  _searchFocus.unfocus();
                  setState(() => _selectedParking = null);
                  _updateMarkers();
                },
              )
            else
              const MapLoadingPlaceholder(),

            // Top: search bar (browsing) or maneuver banner (navigating)
            if (navStatus == NavStatus.navigating)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: NavigationBanner(nav: _nav),
              )
            else if (navStatus == NavStatus.idle)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: DashboardSearchBar(
                  controller: _searchController,
                  focusNode: _searchFocus,
                  onChanged: _onSearchChanged,
                  onClear: _clearSearch,
                  onSubmitted: _onSearchSubmitted,
                  isLoading: _searchLoading,
                  panel: showPanel
                      ? SearchPanel(
                          query: _query,
                          parkings: _localMatches,
                          places: _places,
                          recents: _recents,
                          isLoading: _searchLoading,
                          onParkingTap: _onParkingPicked,
                          onPlaceTap: _onPlaceSelected,
                          onClearRecents: () async {
                            await _recentService.clear();
                            _loadRecents();
                          },
                        )
                      : null,
                ),
              ),

            // Map buttons (right side)
            if (!showPanel && navStatus != NavStatus.arrived)
              Positioned(
                right: 16,
                bottom: bottomInset + 14,
                child: Column(
                  children: [
                    MapRoundButton(
                      icon: Icons.traffic_rounded,
                      tooltip: 'Traffic',
                      active: _trafficOn,
                      onTap: () => setState(() => _trafficOn = !_trafficOn),
                    ),
                    const SizedBox(height: 10),
                    MapRoundButton(
                      icon: navStatus == NavStatus.navigating && !_followUser
                          ? Icons.navigation_rounded
                          : Icons.my_location_rounded,
                      tooltip: 'My location',
                      active:
                          navStatus == NavStatus.navigating && !_followUser,
                      onTap: _recenter,
                    ),
                  ],
                ),
              ),

            // Bottom area
            if (_nav.isLoadingRoute)
              const Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: RouteLoadingPill(),
              )
            else if (navStatus == NavStatus.previewing)
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: RoutePreviewCard(
                  nav: _nav,
                  onStart: _startNavigation,
                  onOpenGoogleMaps: () {
                    final d = _routeDestination;
                    if (d != null) _openExternalNavigation(d);
                  },
                  onClose: _endNavigation,
                  onSimulate:
                      kDebugMode ? () => _startNavigation(simulate: true) : null,
                ),
              )
            else if (navStatus == NavStatus.navigating)
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: NavigationBottomPanel(
                  nav: _nav,
                  onEnd: _endNavigation,
                  voiceOn: _voice.enabled,
                  onToggleVoice: _toggleVoice,
                ),
              )
            else if (navStatus == NavStatus.arrived)
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: ArrivalCard(
                  destinationName: _nav.destinationName,
                  onDone: _endNavigation,
                  onBook: () {
                    final d = _routeDestination;
                    _endNavigation();
                    if (d != null) _bookParking(d);
                  },
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
        bottomNavigationBar:
            navStatus == NavStatus.navigating || navStatus == NavStatus.arrived
                ? null
                : const AppBottomNav(currentIndex: 0),
      ),
    );
  }
}
