// lib/widgets/dashboard/dashboard_colors.dart
import 'package:flutter/material.dart';

/// Dashboard-এর সব রং এক জায়গায়।
class DashColors {
  DashColors._();

  static const Color teal = Color(0xFF18D6C0);
  static const Color blue = Color(0xFF0AA6C4);
  static const Color darkCard = Color(0xFF1A2740);
  static const Color darkBg = Color(0xFF0F1728);
  static const Color darkBorder = Color(0xFF253248);
  static const Color lightBg = Color(0xFFF5F7FA);
  static const Color textDark = Color(0xFF172033);

  static const LinearGradient brandGradient = LinearGradient(
    colors: [teal, blue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static Color card(bool isDark) => isDark ? darkCard : Colors.white;
  static Color title(bool isDark) => isDark ? Colors.white : textDark;
  static Color? muted(bool isDark) =>
      isDark ? Colors.grey[400] : Colors.grey[500];
  static Color? border(bool isDark) =>
      isDark ? darkBorder : Colors.grey[200];
}