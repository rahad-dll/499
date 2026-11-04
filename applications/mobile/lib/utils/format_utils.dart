// lib/utils/format_utils.dart
import 'package:intl/intl.dart';

/// 250 m, 1.2 km, 14 km
String formatDistance(double meters) {
  final m = meters < 0 ? 0.0 : meters;
  if (m < 1000) {
    final rounded = (m / 10).round() * 10;
    return '$rounded m';
  }
  final km = m / 1000;
  return km >= 10 ? '${km.round()} km' : '${km.toStringAsFixed(1)} km';
}

/// 1 min, 12 min, 1 h 5 min
String formatDuration(double seconds) {
  final minutes = (seconds / 60).round();
  if (minutes < 1) return '1 min';
  if (minutes < 60) return '$minutes min';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return m == 0 ? '$h h' : '$h h $m min';
}

/// 3:42 PM
String formatClock(DateTime time) => DateFormat('h:mm a').format(time);
