// lib/models/route_models.dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../utils/geo_utils.dart';

enum Maneuver {
  depart,
  straight,
  slightLeft,
  left,
  sharpLeft,
  slightRight,
  right,
  sharpRight,
  uTurnLeft,
  uTurnRight,
  roundaboutLeft,
  roundaboutRight,
  merge,
  forkLeft,
  forkRight,
  rampLeft,
  rampRight,
  arrive,
}

extension ManeuverIcon on Maneuver {
  IconData get icon {
    switch (this) {
      case Maneuver.depart:
        return Icons.navigation_rounded;
      case Maneuver.straight:
        return Icons.straight_rounded;
      case Maneuver.slightLeft:
        return Icons.turn_slight_left_rounded;
      case Maneuver.left:
        return Icons.turn_left_rounded;
      case Maneuver.sharpLeft:
        return Icons.turn_sharp_left_rounded;
      case Maneuver.slightRight:
        return Icons.turn_slight_right_rounded;
      case Maneuver.right:
        return Icons.turn_right_rounded;
      case Maneuver.sharpRight:
        return Icons.turn_sharp_right_rounded;
      case Maneuver.uTurnLeft:
        return Icons.u_turn_left_rounded;
      case Maneuver.uTurnRight:
        return Icons.u_turn_right_rounded;
      case Maneuver.roundaboutLeft:
        return Icons.roundabout_left_rounded;
      case Maneuver.roundaboutRight:
        return Icons.roundabout_right_rounded;
      case Maneuver.merge:
        return Icons.merge_rounded;
      case Maneuver.forkLeft:
        return Icons.fork_left_rounded;
      case Maneuver.forkRight:
        return Icons.fork_right_rounded;
      case Maneuver.rampLeft:
        return Icons.ramp_left_rounded;
      case Maneuver.rampRight:
        return Icons.ramp_right_rounded;
      case Maneuver.arrive:
        return Icons.flag_rounded;
    }
  }
}

/// One instruction. `instruction` describes the action to take at the
/// START of the step; `distanceM` is how far the step then runs.
class RouteStep {
  const RouteStep({
    required this.instruction,
    required this.maneuver,
    required this.distanceM,
    required this.durationS,
    this.street,
  });

  final String instruction;
  final Maneuver maneuver;
  final double distanceM;
  final double durationS;
  final String? street;
}

class RouteInfo {
  RouteInfo({
    required this.points,
    required this.distanceM,
    required this.durationS,
    required this.steps,
    required this.source,
    this.trafficAware = false,
  }) : geometry = RouteGeometry(points);

  final List<LatLng> points;
  final RouteGeometry geometry;
  final double distanceM;
  final double durationS;
  final List<RouteStep> steps;

  /// 'google' or 'osrm'
  final String source;

  /// True when [durationS] already includes live traffic.
  final bool trafficAware;

  LatLng get destination => points.last;

  /// Distance along the route (metres) at which step i ends, i.e. where
  /// the instruction of step i+1 must be executed.
  late final List<double> stepEndAlongM = _computeStepEnds();

  List<double> _computeStepEnds() {
    final out = <double>[];
    var acc = 0.0;
    for (final s in steps) {
      acc += s.distanceM;
      out.add(acc);
    }
    // Step lengths and polyline length differ by a few metres; rescale so
    // both agree on "total".
    final total = geometry.totalM;
    if (acc > 0 && total > 0) {
      final k = total / acc;
      for (var i = 0; i < out.length; i++) {
        out[i] = out[i] * k;
      }
    }
    return out;
  }
}
