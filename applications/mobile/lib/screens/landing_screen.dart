import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../widgets/landing/landing_header.dart';
import '../../widgets/landing/hero_section.dart';
import '../../widgets/landing/feature_section.dart';
import '../../widgets/landing/portal_section.dart';
import '../../widgets/landing/impact_section.dart';
import '../../widgets/landing/footer_section.dart';

/// CityPulse Landing Page — mobile layout.
/// Matches Figma frames: "Landing / Mobile / Dark" and "Landing / Mobile / Light".
///
/// If your app already has a ThemeProvider (see AppTheme / ThemeProvider in
/// the auth work), replace the local `_isDark` state below with that
/// provider instead of keeping a second theme switch.
class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  bool _isDark = true; // Figma dark frame is the default state shown first

  void _toggleTheme() => setState(() => _isDark = !_isDark);

  void _openMenu() {
    // TODO: wire to your nav drawer / bottom sheet menu
  }

  @override
  Widget build(BuildContext context) {
    final background = _isDark ? AppColorsDark.background : AppColorsLight.background;

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              LandingHeader(
                isDark: _isDark,
                onToggleTheme: _toggleTheme,
                onMenuTap: _openMenu,
              ),
              HeroSection(isDark: _isDark),
              FeatureSection(isDark: _isDark),
              PortalSection(isDark: _isDark),
              ImpactSection(isDark: _isDark),
              FooterSection(isDark: _isDark),
            ],
          ),
        ),
      ),
    );
  }
}