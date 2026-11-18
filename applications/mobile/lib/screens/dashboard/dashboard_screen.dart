// lib/screens/dashboard/dashboard_screen.dart
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../models/booking_model.dart';
import '../../models/parking_model.dart';
import '../../services/booking_events.dart';
import '../../services/booking_service.dart';
import '../../services/location_service.dart';
import '../../services/map_prefs_service.dart';
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
import '../../widgets/dashboard/active_booking_banner.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
import '../../widgets/dashboard/booking_confirmation_dialog.dart';
import '../../widgets/dashboard/dashboard_colors.dart';
import '../../widgets/dashboard/dashboard_map.dart';
import '../../widgets/dashboard/dashboard_search_bar.dart';
import '../../widgets/dashboard/exit_dialog.dart';
import '../../widgets/dashboard/map_filter_bar.dart';
import '../../widgets/dashboard/map_layers_sheet.dart';
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

  // Auto-refresh of the nearby lots (see _scheduleRefresh).
  bool _appActive = true; // false while the app is in the background
  int _refreshFailures = 0; // failed loads in a row → longer wait

  // ── Premium map ──────────────────────────────────────────────────────
  final MapPrefsService _mapPrefs = MapPrefsService();
  MapFilters _filters = const MapFilters(); // chips under the search bar
  Set<String> _savedIds = <String>{}; // favourite lots (kept on the phone)
  String? _bestId; // lot marked "Best pick"
  MapType _mapType = MapType.normal;
  double _radiusKm = 5; // GET /spaces/nearby?radiusKm=
  bool _glowOn = true; // availability halo under each lot
  bool _ringOn = true; // ring around the searched area
  bool _view3d = false; // tilted, heading-up "street level" view
  CameraPosition? _camera; // where the map is looking right now
  bool _showSearchArea = false; // "Search this area" pill
  BookingModel? _liveBooking; // upcoming / ongoing booking banner

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
    _startUp();
    BookingEvents.changes.addListener(_onBookingsChanged);
    _scheduleRefresh();
    _loadLiveBooking();
  }

  /// Auto-refresh of the nearby lots, about once a minute, built so that
  /// many phones do not overload the server:
  ///  - nothing is requested while the app is in the background or another
  ///    screen / sheet is on top of the map (nobody is looking at the pins);
  ///  - after failed loads the wait doubles (1 → 2 → 4 → 5 min max), so
  ///    phones back off instead of hammering a server that is struggling;
  ///  - a few random seconds are added, so phones do not all ask at the
  ///    same moment.
  void _scheduleRefresh() {
    _refreshTimer?.cancel();
    if (_isDisposed) return;

    final steps = _refreshFailures > 3 ? 3 : _refreshFailures;
    var seconds = 60 * (1 << steps);
    if (seconds > 300) seconds = 300;
    seconds += math.Random().nextInt(10);

    _refreshTimer = Timer(Duration(seconds: seconds), () async {
      if (_isDisposed || !mounted) return;
      final onTop = ModalRoute.of(context)?.isCurrent ?? true;
      if (_appActive && onTop && !_isFetching) {
        await _refreshParkings();
      }
      _scheduleRefresh();
    });
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
    _loadLiveBooking();
  }

  /// Saved map choices first (radius, map type...), so the very first
  /// search already uses the driver's radius; then the GPS + first load.
  Future<void> _startUp() async {
    final prefs = await _mapPrefs.load();
    if (!mounted || _isDisposed) return;
    setState(() {
      _savedIds = Set<String>.from(prefs.savedLots);
      _mapType = mapTypeFromName(prefs.mapType);
      _radiusKm = prefs.radiusKm;
      _glowOn = prefs.glowOn;
      _ringOn = prefs.ringOn;
    });
    await _initializeLocation();
  }

  void _onFocusChanged() {
    if (mounted && !_isDisposed) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appActive = state == AppLifecycleState.resumed;
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
      parkings = await _parkingApi.fetchNearby(center, radiusKm: _radiusKm);
    } catch (e) {
      debugPrint('Error loading parkings: $e');
    }

    if (!mounted || _isDisposed || seq != _fetchSeq) return;

    setState(() {
      // Keep the previous data when a request fails instead of blanking.
      if (parkings != null) {
        _nearbyParkings = parkings;
        _filteredParkings = applyMapFilters(parkings, _filters, _savedIds);
        _bestId = pickBestLot(_filteredParkings)?.id;
        _showSearchArea = false;
        _refreshFailures = 0;
      } else {
        _refreshFailures++;
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
      visible = _filteredParkings; // respects the filter chips
    } else {
      visible = [_routeDestination!];
    }

    final markers = await buildDashboardMarkers(
      parkings: visible,
      selectedId: _selectedParking?.id,
      bestId: _nav.status == NavStatus.idle ? _bestId : null,
      savedIds: _savedIds,
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

    // Places already known for this text (or for the letters typed just
    // before) are shown at once, while the fresh answer is on its way.
    final instant = _placesService.instant(q);
    final stillMatching = instant.isNotEmpty
        ? instant
        : _places
            .where((s) => s.description.toLowerCase().contains(lq))
            .toList();

    setState(() {
      _query = q;
      _localMatches = local;
      _places = stillMatching;
      _searchLoading = q.length >= 2;
    });
    if (q.length < 2) return;

    _debounce = Timer(const Duration(milliseconds: 120), () async {
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
      _filteredParkings = applyMapFilters(_nearbyParkings, _filters, _savedIds);
      _bestId = pickBestLot(_filteredParkings)?.id;
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
      isSaved: _savedIds.contains(parking.id),
      onToggleSaved: (saved) => _setSaved(parking.id, saved),
      onStreetView: () => _openStreetView(parking),
    );
  }

  // =========================================================================
  // PREMIUM MAP: filters, saved lots, layers, 3D view, search this area
  // =========================================================================

  /// Re-applies the chips to the lots already loaded (no request).
  void _refilter() {
    if (_isDisposed || !mounted) return;
    setState(() {
      _filteredParkings = applyMapFilters(_nearbyParkings, _filters, _savedIds);
      _bestId = pickBestLot(_filteredParkings)?.id;
    });
    _updateMarkers();
    if (_stripController.hasClients) _stripController.jumpTo(0);
  }

  void _onFiltersChanged(MapFilters filters) {
    HapticFeedback.selectionClick();
    _filters = filters;
    _refilter();
  }

  void _onRadiusChanged(double km) {
    if (km == _radiusKm) return;
    HapticFeedback.selectionClick();
    setState(() => _radiusKm = km);
    _mapPrefs.setRadiusKm(km);
    _refreshParkings();

    // zoom so the whole ring is on screen
    final center = _lastFetchCenter;
    if (center != null && !_view3d) {
      final zoom = km <= 1 ? 15.2 : (km <= 2 ? 14.2 : (km <= 5 ? 12.9 : 11.9));
      _mapController?.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(target: center, zoom: zoom),
        ),
      );
    }
  }

  void _setSaved(String lotId, bool saved) {
    if (saved) {
      _savedIds.add(lotId);
    } else {
      _savedIds.remove(lotId);
    }
    _mapPrefs.setSavedLots(_savedIds);
    _refilter();
  }

  void _openLayers() {
    _searchFocus.unfocus();
    showMapLayersSheet(
      context,
      mapType: _mapType,
      trafficOn: _trafficOn,
      glowOn: _glowOn,
      ringOn: _ringOn,
      onMapType: (type) {
        if (!mounted) return;
        setState(() => _mapType = type);
        _mapPrefs.setMapType(mapTypeName(type));
      },
      onTraffic: (on) {
        if (mounted) setState(() => _trafficOn = on);
      },
      onGlow: (on) {
        if (!mounted) return;
        setState(() => _glowOn = on);
        _mapPrefs.setGlow(on);
      },
      onRing: (on) {
        if (!mounted) return;
        setState(() => _ringOn = on);
        _mapPrefs.setRing(on);
      },
    );
  }

  /// One tap between the normal map and satellite. Satellite is shown as
  /// "hybrid" (photo + road names), so streets stay readable while
  /// driving. Works while browsing and during navigation; remembered.
  void _toggleSatellite() {
    HapticFeedback.selectionClick();
    final toSatellite =
        _mapType != MapType.hybrid && _mapType != MapType.satellite;
    final type = toSatellite ? MapType.hybrid : MapType.normal;
    setState(() => _mapType = type);
    _mapPrefs.setMapType(mapTypeName(type));

    // Satellite photos stop near zoom 18; step back so the picture is sharp
    final cam = _camera;
    if (toSatellite && cam != null && cam.zoom > 18) {
      _programmaticUntil = DateTime.now().add(const Duration(seconds: 1));
      _mapController?.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: cam.target,
            zoom: 17.8,
            tilt: cam.tilt,
            bearing: cam.bearing,
          ),
        ),
      );
    }
    // no message while driving: it would cover the navigation panel
    if (mounted && _nav.status == NavStatus.idle) {
      showAppSnackBar(
        context,
        toSatellite ? 'Satellite view on' : 'Map view on',
      );
    }
  }

  bool get _satelliteOn =>
      _mapType == MapType.hybrid || _mapType == MapType.satellite;

  /// 3D view: the camera tilts, zooms to street level and turns to the way
  /// the phone is travelling, with 3D buildings — the map as seen from the
  /// road. Tapping again goes back to the flat north-up map.
  void _toggle3d() {
    HapticFeedback.selectionClick();
    setState(() => _view3d = !_view3d);

    final cam = _camera;
    final here = _currentPosition;
    final target = cam?.target ??
        (here != null ? LatLng(here.latitude, here.longitude) : null);
    if (target == null) return;
    final zoom = cam?.zoom ?? 15.5;

    if (_view3d) {
      final heading = here?.heading ?? -1;
      _mapController?.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: target,
            zoom: _satelliteOn
                ? (zoom < 17.0 ? 17.0 : (zoom > 17.6 ? 17.6 : zoom))
                : (zoom < 17.3 ? 17.3 : zoom),
            tilt: 60,
            bearing: (heading.isFinite && heading >= 0)
                ? heading
                : (cam?.bearing ?? 0),
          ),
        ),
      );
    } else {
      _mapController?.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(target: target, zoom: zoom > 16 ? 16 : zoom),
        ),
      );
    }
  }

  void _onCameraMove(CameraPosition position) {
    _camera = position; // no setState: this fires on every frame of a pan
  }

  /// After the map stops: offer "Search this area" when the driver has
  /// moved the map well away from the area that was searched.
  void _onCameraIdle() {
    if (_isDisposed || !mounted) return;
    if (_nav.status != NavStatus.idle) return;
    final cam = _camera;
    final last = _lastFetchCenter;
    if (cam == null || last == null) return;
    final far =
        GeoUtils.distanceM(last, cam.target) > _radiusKm * 1000 * 0.6;
    if (far != _showSearchArea) setState(() => _showSearchArea = far);
  }

  void _searchThisArea() {
    final cam = _camera;
    if (cam == null) return;
    HapticFeedback.selectionClick();
    setState(() {
      _searchedLocation = cam.target;
      _searchedLocationLabel = 'Map area';
      _searchController.text = 'Map area';
      _showSearchArea = false;
    });
    _loadNearbyParkings(center: cam.target);
  }

  /// Street-level photos of the lot's entrance (Google Street View).
  Future<void> _openStreetView(ParkingModel parking) async {
    try {
      final uri = Uri.parse(
        'https://www.google.com/maps/@?api=1&map_action=pano'
        '&viewpoint=${parking.latitude},${parking.longitude}',
      );
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        showAppSnackBar(context, 'Could not open Street View', isError: true);
      }
    } catch (e) {
      debugPrint('Error opening Street View: $e');
    }
  }

  /// The driver's next / ongoing booking for the banner on the map.
  Future<void> _loadLiveBooking() async {
    try {
      final page = await BookingService().getBookingsPage(
        statuses: const [BookingStatus.confirmed, BookingStatus.pending],
        limit: 20,
      );
      final live = page.items.where((b) => b.isLive).toList()
        ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
      if (!mounted || _isDisposed) return;
      setState(() => _liveBooking = live.isEmpty ? null : live.first);
    } catch (_) {
      // the banner is optional — the map works without it
    }
  }

  Future<void> _openLiveBooking() async {
    final booking = _liveBooking;
    if (booking == null) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BookingDetailsScreen(booking: booking),
      ),
    );
    if (!mounted || _isDisposed) return;
    _loadLiveBooking();
    _refreshParkings();
  }

  void _navigateToLiveBooking() {
    final booking = _liveBooking;
    if (booking == null) return;
    // the lot as the map knows it (free slots, price) when it is loaded
    ParkingModel? lot;
    for (final p in _nearbyParkings) {
      if (p.id == booking.spaceId) {
        lot = p;
        break;
      }
    }
    final ParkingModel target = lot ??
        ParkingModel(
          id: booking.spaceId,
          name: booking.spaceName,
          address: booking.spaceAddress,
          latitude: booking.latitude,
          longitude: booking.longitude,
          availableSpots: 1,
          totalSpots: 1,
          distance: 0,
        );
    _navigateToParking(target);
  }

  /// Availability halo under each lot + the ring of the searched area.
  Set<Circle> _buildCircles() {
    if (_nav.status != NavStatus.idle) return const <Circle>{};
    final circles = <Circle>{};

    final center = _lastFetchCenter;
    if (_ringOn && center != null) {
      circles.add(
        Circle(
          circleId: const CircleId('search_ring'),
          center: center,
          radius: _radiusKm * 1000,
          strokeWidth: 2,
          strokeColor: DashColors.teal.withValues(alpha: 0.55),
          fillColor: DashColors.teal.withValues(alpha: 0.04),
        ),
      );
    }

    if (_glowOn) {
      for (final p in _filteredParkings) {
        final free = p.availableSpots > 20 ? 20 : p.availableSpots;
        circles.add(
          Circle(
            circleId: CircleId('glow_${p.id}'),
            center: LatLng(p.latitude, p.longitude),
            radius: 45 + free * 2.5, // more free slots → wider halo
            strokeWidth: 0,
            fillColor: p.availabilityColor.withValues(alpha: 0.20),
          ),
        );
      }
    }
    return circles;
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
    var zoom = speed > 16 ? 16.6 : (speed > 8 ? 17.2 : 17.9);
    // satellite photos are sharp up to ~18; a little lower looks crisper
    if (_satelliteOn && zoom > 17.6) zoom = 17.6;
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
    final heading = here.heading;
    _mapController?.animateCamera(CameraUpdate.newCameraPosition(
      _view3d
          ? CameraPosition(
              target: LatLng(here.latitude, here.longitude),
              zoom: _satelliteOn ? 17.4 : 17.5,
              tilt: 60,
              bearing: (heading.isFinite && heading >= 0) ? heading : 0,
            )
          : CameraPosition(
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
    final sat = _satelliteOn;

    final lines = <Polyline>{
      // Casing: gives the route contrast on any map colour.
      Polyline(
        polylineId: const PolylineId('route_casing'),
        points: remaining,
        color: (dark && !sat) ? const Color(0xFF0B1220) : Colors.white,
        width: sat ? 12 : 10,
        jointType: JointType.round,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
        zIndex: 1,
      ),
      Polyline(
        polylineId: const PolylineId('route_line'),
        points: remaining,
        // on satellite photos a brighter cyan stands out from trees / roofs
        color: sat ? const Color(0xFF00C2FF) : DashColors.teal,
        width: sat ? 7 : 6,
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

    // Premium map overlays (only while browsing, never over the search panel)
    final topPad = MediaQuery.of(context).padding.top;
    final showMapChrome = browsing && !showPanel && !_isLoading;
    final liveBooking = _liveBooking;
    final showLiveBooking = showMapChrome && liveBooking != null;
    final filtersHideAll = browsing &&
        _nearbyParkings.isNotEmpty &&
        _filteredParkings.isEmpty &&
        !_isLoading &&
        !_isFetching;

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
                mapType: _mapType,
                circles: _buildCircles(),
                padding: EdgeInsets.only(
                  top: navStatus == NavStatus.navigating
                      ? 130
                      : (navStatus == NavStatus.idle ? 124 : 80),
                  bottom: bottomInset,
                ),
                onMapCreated: (controller) => _mapController = controller,
                onCameraMoveStarted: _onCameraMoveStarted,
                onCameraMove: _onCameraMove,
                onCameraIdle: _onCameraIdle,
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

            // Filter chips under the search bar
            if (showMapChrome)
              Positioned(
                top: topPad + 74,
                left: 0,
                right: 0,
                child: MapFilterBar(
                  filters: _filters,
                  radiusKm: _radiusKm,
                  radii: MapPrefsService.radii,
                  onChanged: _onFiltersChanged,
                  onRadiusChanged: _onRadiusChanged,
                ),
              ),

            // The driver's upcoming / ongoing booking
            if (showMapChrome && liveBooking != null)
              Positioned(
                top: topPad + 124,
                left: 16,
                right: 16,
                child: ActiveBookingBanner(
                  booking: liveBooking,
                  onOpen: _openLiveBooking,
                  onNavigate: _navigateToLiveBooking,
                ),
              ),

            // "Search this area" after the map was moved away
            if (showMapChrome && _showSearchArea)
              Positioned(
                top: topPad + (showLiveBooking ? 186 : 126),
                left: 0,
                right: 0,
                child: Center(
                  child: Material(
                    color: DashColors.title,
                    elevation: 6,
                    shadowColor: Colors.black.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(22),
                    child: InkWell(
                      onTap: _searchThisArea,
                      borderRadius: BorderRadius.circular(22),
                      child: const Padding(
                        padding:
                            EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.search_rounded,
                                size: 17, color: Colors.white),
                            SizedBox(width: 6),
                            Text(
                              'Search this area',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
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
                      icon: Icons.layers_rounded,
                      tooltip: 'Map layers',
                      active: _trafficOn || _mapType == MapType.terrain,
                      onTap: _openLayers,
                    ),
                    // satellite on / off — also while driving
                    const SizedBox(height: 10),
                    MapRoundButton(
                      icon: _satelliteOn
                          ? Icons.map_rounded
                          : Icons.satellite_alt_rounded,
                      tooltip: _satelliteOn ? 'Map view' : 'Satellite view',
                      active: _satelliteOn,
                      onTap: _toggleSatellite,
                    ),
                    if (navStatus == NavStatus.idle) ...[
                      const SizedBox(height: 10),
                      MapRoundButton(
                        icon: Icons.view_in_ar_rounded,
                        tooltip: '3D view',
                        active: _view3d,
                        onTap: _toggle3d,
                      ),
                    ],
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
                  bestId: _bestId,
                  savedIds: _savedIds,
                  sortLabel: _filters.sort == MapSort.nearest
                      ? null
                      : '${mapSortLabel(_filters.sort)} first',
                ),
              )
            else if (filtersHideAll)
              Positioned(
                left: 20,
                right: 20,
                bottom: 24,
                child: NoFilterMatchCard(
                  onClear: () => _onFiltersChanged(_filters.cleared()),
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
