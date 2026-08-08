import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../theme/app_colors.dart';
import '../../widgets/landing/landing_header.dart';
import '../../widgets/landing/hero_section.dart';
import '../../widgets/landing/feature_section.dart';
import '../../widgets/landing/portal_section.dart';
import '../../widgets/landing/impact_section.dart';
import '../../widgets/landing/footer_section.dart';

/// CityPulse Landing Page — mobile layout.
/// Matches Figma frames: "Landing / Mobile / Dark" and "Landing / Mobile / Light".
class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  void _openMenu() {
    // TODO: wire to your nav drawer / bottom sheet menu
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final background = isDark ? AppColorsDark.background : AppColorsLight.background;

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
                  isDark: isDark,
                  onMenuTap: _openMenu,
                ),
              ),
            ),
            
            // Scrollable content
            SliverList(
              delegate: SliverChildListDelegate([
                HeroSection(isDark: isDark),
                FeatureSection(isDark: isDark),
                PortalSection(isDark: isDark),
                ImpactSection(isDark: isDark),
                FooterSection(isDark: isDark),
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