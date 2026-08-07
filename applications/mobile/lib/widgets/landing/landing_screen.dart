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
        child: CustomScrollView(
          slivers: [
            // Sticky header - pinned at top
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverAppBarDelegate(
                minHeight: 70,
                maxHeight: 70,
                child: LandingHeader(
                  isDark: _isDark,
                  onToggleTheme: _toggleTheme,
                  onMenuTap: _openMenu,
                ),
              ),
            ),
            
            // Scrollable content
            SliverList(
              delegate: SliverChildListDelegate([
                HeroSection(isDark: _isDark),
                FeatureSection(isDark: _isDark),
                PortalSection(isDark: _isDark),
                ImpactSection(isDark: _isDark),
                FooterSection(isDark: _isDark),
                const SizedBox(height: 20), // Extra bottom padding
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

// Delegate class for SliverPersistentHeader
class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final double minHeight;
  final double maxHeight;
  final Widget child;

  _SliverAppBarDelegate({
    required this.minHeight,
    required this.maxHeight,
    required this.child,
  });

  @override
  double get minExtent => minHeight;
  @override
  double get maxExtent => maxHeight;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return SizedBox.expand(child: child);
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return maxHeight != oldDelegate.maxHeight ||
           minHeight != oldDelegate.minHeight ||
           child != oldDelegate.child;
  }
}