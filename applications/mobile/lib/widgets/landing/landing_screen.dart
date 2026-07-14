import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../utils/responsive.dart';
import 'hero_section.dart';
import 'feature_section.dart';
import 'portal_section.dart';
import 'impact_section.dart';
import 'footer_section.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    
    return Scaffold(
      body: Stack(
        children: [
          // Background with Glow Effects
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? [
                        const Color(0xFF0F1728),
                        const Color(0xFF1A2740),
                        const Color(0xFF0F1728),
                      ]
                    : [
                        const Color(0xFFF7F9FC),
                        const Color(0xFFE8EEF7),
                        const Color(0xFFF7F9FC),
                      ],
              ),
            ),
          ),
          
          // Glow Effects - Light Mode
          if (!isDark) ...[
            Positioned(
              left: -80,
              top: -60,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  color: const Color(0xFF7FE9DD).withOpacity(0.25),
                  borderRadius: BorderRadius.circular(150),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),
            Positioned(
              right: -80,
              top: 100,
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  color: const Color(0xFFC4B5FD).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(140),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),
            Positioned(
              left: -40,
              bottom: 200,
              child: Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(
                  color: const Color(0xFFBFD4FF).withOpacity(0.18),
                  borderRadius: BorderRadius.circular(160),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),
          ],
          
          // Glow Effects - Dark Mode
          if (isDark) ...[
            Positioned(
              left: -80,
              top: -60,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  color: const Color(0xFF18D6C0).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(150),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),
            Positioned(
              right: -80,
              top: 100,
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  color: const Color(0xFF8B5CF6).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(140),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),
            Positioned(
              left: -40,
              bottom: 200,
              child: Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(160),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),
          ],
          
          // Main Content
          CustomScrollView(
            slivers: [
              SliverAppBar(
                floating: true,
                pinned: true,
                elevation: 0,
                backgroundColor: isDark 
                    ? const Color(0xFF0F1728).withOpacity(0.85)
                    : const Color(0xFFF7F9FC).withOpacity(0.85),
                title: _buildLogo(isDark, context),
                centerTitle: false,
                actions: [
                  _buildThemeToggle(isDark, themeProvider, context),
                  const SizedBox(width: 16),
                ],
              ),
              SliverList(
                delegate: SliverChildListDelegate([
                  const HeroSection(),
                  const FeatureSection(),
                  const PortalSection(),
                  const ImpactSection(),
                  const FooterSection(),
                ]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLogo(bool isDark, BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: isMobile ? 32 : 38,
          height: isMobile ? 32 : 38,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDark 
                  ? [const Color(0xFF18D6C0), const Color(0xFF0BA697)]
                  : [const Color(0xFF00C9B1), const Color(0xFF0BA697)],
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Icon(
              Icons.location_city,
              color: Colors.white,
              size: isMobile ? 16 : 20,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          'CityPulse',
          style: TextStyle(
            fontSize: Responsive.fontSize(context, base: isMobile ? 16 : 18),
            fontWeight: FontWeight.w700,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
            letterSpacing: -0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildThemeToggle(bool isDark, ThemeProvider themeProvider, BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    
    return GestureDetector(
      onTap: themeProvider.toggleTheme,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A2740) : Colors.white,
          border: Border.all(
            color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isDark ? Icons.dark_mode : Icons.light_mode,
              size: isMobile ? 14 : 18,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 4),
            Container(
              width: isMobile ? 30 : 36,
              height: isMobile ? 16 : 20,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F1728) : const Color(0xFFE8EEF7),
                borderRadius: BorderRadius.circular(10),
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: isMobile ? 12 : 14,
                  height: isMobile ? 12 : 14,
                  margin: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF18D6C0), Color(0xFF0BA697)],
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}