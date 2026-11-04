// lib/widgets/dashboard/dashboard_colors.dart
import 'package:flutter/material.dart';

/// Dashboard-এর সব রং এক জায়গায় (শুধু light mode)।
class DashColors {
  DashColors._();

  // Brand
  static const Color teal = Color(0xFF18D6C0);
  static const Color blue = Color(0xFF0AA6C4);

  // Surfaces
  static const Color background = Color(0xFFF5F7FA);
  static const Color card = Colors.white;
  static const Color cardAlt = Color(0xFFFAFAFA);
  static const Color border = Color(0xFFEEEEEE);

  // Text
  static const Color title = Color(0xFF172033);
  static const Color label = Color(0xFF616161);
  static const Color subtle = Color(0xFF757575);
  static const Color muted = Color(0xFF9E9E9E);

  // Misc
  static const Color handle = Color(0xFFE0E0E0);
  static const Color chevron = Color(0xFFBDBDBD);

  static const LinearGradient brandGradient = LinearGradient(
    colors: [teal, blue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}