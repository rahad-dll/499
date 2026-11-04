// lib/services/navigation_controller.dart
//
// In-app turn-by-turn navigation state machine.
//
//   idle -> previewing -> navigating -> arrived -> idle
//
// While navigating it listens to a high-rate GPS stream, snaps every fix
// onto the route, advances the current step, computes remaining
// distance/ETA, detects off-route driving and reroutes automatically.
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models/route_models.dart';
import '../utils/geo_utils.dart';
import 'routing_service.dart';

enum NavStatus { idle, previewing, navigating, arrived }

class NavigationController extends ChangeNotifier {
  NavigationController({RoutingService? routing, this.onSpeak})
      : _routing = routing ?? RoutingService();

  final RoutingService _routing;

  /// Spoken guidance hook ("In 200 meters, turn left"). Optional.
  final void Function(String text)? onSpeak;

  /// True while a virtual drive (debug "Simulate drive") is running.
  bool simulating = false;

  // ---- public state -------------------------------------------------------
  NavStatus status = NavStatus.idle;
  bool isLoadingRoute = false;
  bool isRerouting = false;
  String? error;

  RouteInfo? route;
  String destinationName = '';

  /// Vehicle position (snapped to the route while on it).
  LatLng? position;
  double heading = 0;
  double speedMps = 0;

  double remainingM = 0;
  double remainingS = 0;
  double distanceToNextM = 0;
  int stepIndex = 0;

  /// The instruction the driver must execute next; null = arrival.
  RouteStep? upcoming;

  List<LatLng> remainingPoints = const [];
  List<LatLng> traveledPoints = const [];

  bool get isActive => status != NavStatus.idle;
  bool get isNavigating => status == NavStatus.navigating;
  DateTime get eta => DateTime.now().add(Duration(seconds: remainingS.round()));

  // ---- internals ----------------------------------------------------------
  StreamSubscription<Position>? _sub;
  int _hint = 0;
  int _offRouteCount = 0;
  int _reqId = 0;
  DateTime? _lastReroute;
  LatLng? _destination;
  Timer? _simTimer;
  double _simAlongM = 0;
  final Set<String> _spoken = {};

  // -------------------------------------------------------------------------
  // Preview
  // -------------------------------------------------------------------------

  Future<bool> preview({
    required LatLng origin,
    required LatLng destination,
    required String name,
  }) async {
    final id = ++_reqId;
    _sub?.cancel();
    _sub = null;
    isLoadingRoute = true;
    isRerouting = false;
    error = null;
    destinationName = name;
    _destination = destination;
    notifyListeners();

    final r = await _routing.route(origin, destination);
    if (id != _reqId) return false; // superseded or cancelled

    isLoadingRoute = false;
    if (r == null) {
      error = 'No route found';
      status = NavStatus.idle;
      route = null;
      notifyListeners();
      return false;
    }

    route = r;
    status = NavStatus.previewing;
    heading = GeoUtils.bearing(r.points[0], r.points[1]);
    position = origin;
    _resetProgress();
    notifyListeners();
    return true;
  }

  void _resetProgress() {
    final r = route;
    if (r == null) return;
    _hint = 0;
    _offRouteCount = 0;
    _spoken.clear();
    stepIndex = 0;
    remainingM = r.distanceM;
    remainingS = r.durationS;
    remainingPoints = r.points;
    traveledPoints = const [];
    upcoming = r.steps.length > 1 ? r.steps[1] : null;
    distanceToNextM =
        r.stepEndAlongM.isNotEmpty ? r.stepEndAlongM.first : r.distanceM;
  }

  // -------------------------------------------------------------------------
  // Navigate
  // -------------------------------------------------------------------------

  Future<void> start() async {
    if (route == null) return;
    status = NavStatus.navigating;
    simulating = false;
    _simTimer?.cancel();
    _resetProgress();
    notifyListeners();

    final first = route!.steps.isNotEmpty ? route!.steps.first.instruction : '';
    onSpeak?.call('Starting navigation to $destinationName. $first');

    await _sub?.cancel();
    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 4,
      ),
    ).listen(
      _onPosition,
      onError: (Object e) => debugPrint('Navigation GPS error: $e'),
    );
  }

  void _onPosition(Position p) => _process(
        LatLng(p.latitude, p.longitude),
        headingDeg: p.heading,
        speed: p.speed,
        accuracy: p.accuracy,
      );

  /// One GPS fix (real or simulated).
  void _process(
    LatLng raw, {
    required double headingDeg,
    required double speed,
    required double accuracy,
  }) {
    final r = route;
    if (r == null || status != NavStatus.navigating) return;

    final snap = r.geometry.snap(raw, hintSegment: _hint);

    speedMps = (speed.isFinite && speed > 0) ? speed : 0;
    if (speedMps > 1.5 && headingDeg.isFinite && headingDeg >= 0) {
      heading = headingDeg;
    }

    // GPS jitter tolerance grows with the reported accuracy.
    final threshold = math.max(35.0, accuracy * 1.5);
    final onRoute = snap.offRouteM <= threshold;

    if (onRoute) {
      _offRouteCount = 0;
      _hint = snap.segmentIndex;
      position = snap.point;
      _updateProgress(snap);
      _announce();
    } else {
      position = raw;
      _offRouteCount++;
      if (_offRouteCount >= 3) _maybeReroute(raw, headingDeg);
    }

    final toDestination = GeoUtils.distanceM(raw, r.destination);
    if (toDestination <= 25 || (onRoute && remainingM <= 20)) {
      _arrive();
      return;
    }
    notifyListeners();
  }

  void _updateProgress(RouteSnap snap) {
    final r = route!;
    final total = r.geometry.totalM;

    remainingM = math.max(0.0, total - snap.alongM);
    remainingS = total > 0 ? r.durationS * (remainingM / total) : 0;

    final ends = r.stepEndAlongM;
    var i = stepIndex;
    while (i < ends.length - 1 && snap.alongM >= ends[i] - 5) {
      i++;
    }
    stepIndex = i;
    upcoming = (i + 1 < r.steps.length) ? r.steps[i + 1] : null;
    distanceToNextM =
        ends.isEmpty ? remainingM : math.max(0.0, ends[i] - snap.alongM);

    remainingPoints = [snap.point, ...r.points.sublist(snap.segmentIndex + 1)];
    traveledPoints = [...r.points.sublist(0, snap.segmentIndex + 1), snap.point];
  }

  Future<void> _maybeReroute(LatLng raw, double headingDeg) async {
    if (simulating) return;
    if (isRerouting) return;
    final now = DateTime.now();
    if (_lastReroute != null &&
        now.difference(_lastReroute!) < const Duration(seconds: 10)) {
      return;
    }
    _lastReroute = now;
    isRerouting = true;
    notifyListeners();
    onSpeak?.call('Rerouting');

    final id = ++_reqId;
    final dest = _destination ?? route!.destination;
    final fresh = await _routing.route(
      raw,
      dest,
      headingDeg: speedMps > 2 ? headingDeg : null,
    );

    if (id != _reqId || status != NavStatus.navigating) return;
    isRerouting = false;
    if (fresh != null) {
      route = fresh;
      _resetProgress();
    }
    notifyListeners();
  }

  void _arrive() {
    _sub?.cancel();
    _sub = null;
    _simTimer?.cancel();
    simulating = false;
    status = NavStatus.arrived;
    remainingM = 0;
    remainingS = 0;
    distanceToNextM = 0;
    upcoming = null;
    isRerouting = false;
    onSpeak?.call('You have arrived at $destinationName');
    notifyListeners();
  }

  // -------------------------------------------------------------------------
  // Voice guidance
  // -------------------------------------------------------------------------

  void _announce() {
    final r = route;
    final up = upcoming;
    if (onSpeak == null || r == null || up == null) return;
    if (up.maneuver == Maneuver.arrive) return; // _arrive() speaks that one
    if (stepIndex >= r.steps.length) return;

    final stepLen = r.steps[stepIndex].distanceM;
    final d = distanceToNextM;

    void say(String tag, String text) {
      if (_spoken.add('$stepIndex:$tag')) onSpeak!(text);
    }

    if (d <= 40) {
      say('now', up.instruction);
    } else if (d <= 180 && stepLen > 220) {
      say('near', 'In ${_spokenDistance(d)}, ${up.instruction}');
    } else if (d <= 650 && stepLen > 1000) {
      say('far', 'In ${_spokenDistance(d)}, ${up.instruction}');
    }
  }

  static String _spokenDistance(double m) {
    if (m < 1000) {
      final r = (m / 50).round() * 50;
      return '${r < 50 ? 50 : r} meters';
    }
    return '${(m / 1000).toStringAsFixed(1)} kilometers';
  }

  // -------------------------------------------------------------------------
  // Simulated drive (debug / demo): feeds fake GPS fixes along the route
  // -------------------------------------------------------------------------

  void startSimulation({double speedMps = 16}) {
    final r = route;
    if (status != NavStatus.navigating || r == null) return;

    _sub?.cancel();
    _sub = null;
    _simTimer?.cancel();
    simulating = true;
    _simAlongM = 0;

    final g = r.geometry;
    _simTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (route == null || status != NavStatus.navigating) {
        t.cancel();
        return;
      }
      _simAlongM = math.min(_simAlongM + speedMps, g.totalM);

      var i = 0;
      while (i < g.points.length - 2 && g.cum[i + 1] < _simAlongM) {
        i++;
      }
      final segLen = g.cum[i + 1] - g.cum[i];
      final f = segLen > 0 ? (_simAlongM - g.cum[i]) / segLen : 0.0;
      final a = g.points[i];
      final b = g.points[i + 1];
      final pos = LatLng(
        a.latitude + (b.latitude - a.latitude) * f,
        a.longitude + (b.longitude - a.longitude) * f,
      );

      _process(
        pos,
        headingDeg: GeoUtils.bearing(a, b),
        speed: speedMps,
        accuracy: 5,
      );
      if (_simAlongM >= g.totalM) t.cancel();
    });
    notifyListeners();
  }

  // -------------------------------------------------------------------------
  // Stop / dispose
  // -------------------------------------------------------------------------

  void stop() {
    _reqId++;
    _sub?.cancel();
    _sub = null;
    _simTimer?.cancel();
    simulating = false;
    _spoken.clear();
    status = NavStatus.idle;
    isLoadingRoute = false;
    isRerouting = false;
    route = null;
    position = null;
    speedMps = 0;
    remainingPoints = const [];
    traveledPoints = const [];
    upcoming = null;
    error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _sub?.cancel();
    _simTimer?.cancel();
    _routing.dispose();
    super.dispose();
  }
}
