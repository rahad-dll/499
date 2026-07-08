import 'package:flutter/material.dart';

/// Tokens pulled from the Figma "Login — Mobile — Dark" dev-mode export.
/// These extend (not replace) AppColorsDark — some values overlap
/// (e.g. border, background) but auth screens use extra translucency
/// (glass cards, frosted pills) that the flat landing page doesn't need,
/// so they live in their own file to keep app_colors.dart general-purpose.
class AuthColors {
  // Page background base (gradient built in login_screen.dart on top of this)
  static const pageBackground = Color(0xFF0F1728);

  // Brand
  static const cyanBright = Color(0xFF18D6C0);
  static const purple = Color(0xFF8B5CF6);
  static const success = Color(0xFF22C55E);

  // Logo mark badge (top bar)
  static const logoMarkBg = Color(0xE60E2436); // rgba(14,36,54,0.9)
  static const logoMarkBorder = Color(0xCC18D6C0); // rgba(24,214,192,0.8)

  // Theme toggle pill
  static const toggleTrackBg = Color(0xFF1A2740);
  static const switchBg = Color(0xFF0F1728);
  static const switchBorder = Color(0xFF2A3B57);

  // Text / neutrals (Figma "Neutral" scale used across this screen)
  static const neutral50 = Color(0xFFF8FAFC);
  static const neutral200 = Color(0xFFE2E8F0);
  static const neutral300 = Color(0xFFCBD5E1);
  static const neutral400 = Color(0xFF94A3B8);
  static const neutral500 = Color(0xFF64748B);

  // Status pills
  static const pillBg = Color(0xB30E1D36); // rgba(14,29,54,0.7)
  static const pillBorder = Color(0xCC22344F); // rgba(34,52,79,0.8)

  // Login card (glass)
  static const cardBg = Color(0xB8141E30); // rgba(20,30,48,0.72)
  static const cardBorder = Color(0xE6253248); // rgba(37,50,72,0.9)
  static const cardBlurSigma = 11.0;

  // Inputs
  static const inputBg = Color(0xE60E1728); // rgba(14,23,40,0.9)
  static const inputBorder = Color(0xFF253248);

  // Primary CTA gradient
  static const ctaGradientStart = Color(0xFF18D6C0);
  static const ctaGradientEnd = Color(0xFF0AA6C4);

  // Social buttons
  static const socialBtnBg = Color(0x990E1728); // rgba(14,23,40,0.6)
}