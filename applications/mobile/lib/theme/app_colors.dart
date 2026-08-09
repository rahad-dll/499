import 'package:flutter/material.dart';

/// Central color tokens for the CityPulse Landing page.
/// Values are pulled directly from the Figma file (Landing / Mobile — Dark & Light).
/// If you already have `AppColorsLight` / `AppColorsDark` from the auth/theme
/// work, merge these tokens into that file instead of keeping two sources.
class AppColorsLight {
  AppColorsLight._();

  static const Color background = Color(0xFFF7F9FC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceAlt = Color(0xFFEFF3F8);

  static const Color textPrimary = Color(0xFF1A2B4A);
  static const Color textSecondary = Color(0xFF5B6B85);
  static const Color textMuted = Color(0xFF8A96AC);

  static const Color border = Color(0xFFE3E8F0);
  static const Color borderStrong = Color(0xFFD3DAE6);

  static const Color primary = Color(0xFF1A2B4A);
  static const Color accentTeal = Color(0xFF00C9B1);
  static const Color accentPurple = Color(0xFF7C5CFF);

  // Impact section icon colors (same across themes)
  static const Color purple = Color(0xFF8B5CF6);
  static const Color orange = Color(0xFFFFA500);
  static const Color green = Color(0xFF10B981);
  static const Color blue = Color(0xFF2563EB);
  static const Color red = Color(0xFFEF4444);
  static const Color cyan = Color(0xFF00C9B1);
}

class AppColorsDark {
  AppColorsDark._();

  static const Color background = Color(0xFF0F1728);
  static const Color surface = Color(0xFF16223A);
  static const Color surfaceAlt = Color(0xFF1B2942);

  static const Color textPrimary = Color(0xFFF7F9FC);
  static const Color textSecondary = Color(0xFFA7B2C6);
  static const Color textMuted = Color(0xFF6E7A91);

  static const Color border = Color(0xFF243350);
  static const Color borderStrong = Color(0xFF2E3F60);

  static const Color primary = Color(0xFFFFFFFF);
  static const Color accentTeal = Color(0xFF18D6C0);
  static const Color accentPurple = Color(0xFF8E7CFF);

  // Impact section icon colors (same across themes)
  static const Color purple = Color(0xFF8B5CF6);
  static const Color orange = Color(0xFFFFA500);
  static const Color green = Color(0xFF10B981);
  static const Color blue = Color(0xFF2563EB);
  static const Color red = Color(0xFFEF4444);
  static const Color cyan = Color(0xFF18D6C0);
}

/// Gradient used on the hero title ("Parking & Traffic Control") and on the
/// primary CTA buttons.
const LinearGradient kBrandGradient = LinearGradient(
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
  colors: [Color(0xFF00C9B1), Color(0xFF7C5CFF)],
);