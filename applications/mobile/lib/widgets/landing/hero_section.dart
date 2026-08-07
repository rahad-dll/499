import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../screens/auth/sign_in_screen.dart';
import '../common/app_icon.dart';

class HeroSection extends StatelessWidget {
  final bool isDark;
  const HeroSection({super.key, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark ? AppColorsDark.textPrimary : AppColorsLight.textPrimary;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColorsLight.textSecondary;
    final accentTeal = isDark ? AppColorsDark.accentTeal : AppColorsLight.accentTeal;
    final border = isDark ? AppColorsDark.border : AppColorsLight.border;
    final surface = isDark ? AppColorsDark.surface : AppColorsLight.surface;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 40, 20, 40), // Increased top padding from 24 to 40
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Eyebrow badge — "SMARTER CITIES START HERE"
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              border: Border.all(color: accentTeal.withOpacity(0.5)),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(color: accentTeal, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Text(
                  'SMARTER CITIES START HERE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.6,
                    color: accentTeal,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Title — mixed color spans
          RichText(
            text: TextSpan(
              style: TextStyle(
                fontSize: 34,
                height: 1.2,
                fontWeight: FontWeight.w800,
                color: textPrimary,
              ),
              children: [
                const TextSpan(text: 'CityPulse: Intelligent '),
                TextSpan(
                  text: 'Parking & Traffic Control',
                  style: TextStyle(
                    foreground: Paint()
                      ..shader = kBrandGradient.createShader(const Rect.fromLTWH(0, 0, 260, 70)),
                  ),
                ),
                const TextSpan(text: ' Platform'),
              ],
            ),
          ),
          const SizedBox(height: 14),

          Text(
            'Connecting Drivers, Space Owners & Authorities for Smarter Cities.',
            style: TextStyle(fontSize: 15, height: 1.5, color: textSecondary),
          ),
          const SizedBox(height: 24),

          // Primary CTA — gradient "Get Started"
          Container(
            width: double.infinity,
            height: 52,
            decoration: BoxDecoration(
              gradient: kBrandGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SignInScreen()),
                  );
                },
                child: const Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Get Started',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(width: 8),
                      AppIcon('arrow-right', size: 18, color: Colors.white),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Secondary CTA — outlined "Download App"
          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                backgroundColor: surface,
                side: BorderSide(color: border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () {},
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  AppIcon('download-simple', size: 18, color: textPrimary),
                  const SizedBox(width: 8),
                  Text(
                    'Download App',
                    style: TextStyle(color: textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),

          // Stats row
          Row(
            children: [
              _StatItem(value: '12.4K+', label: 'Vehicles daily', color: textPrimary, sub: textSecondary),
              _StatItem(value: '2.1K+', label: 'Smart spots', color: textPrimary, sub: textSecondary),
              _StatItem(value: '98%', label: 'Flow index', color: textPrimary, sub: textSecondary),
            ],
          ),
          const SizedBox(height: 28),

          // City illustration card - Live 3D removed
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: AppImage(
              isDark ? 'hero_city_illustration_dark' : 'hero_city_illustration_light',
              width: double.infinity,
              height: 260,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  final Color color;
  final Color sub;

  const _StatItem({required this.value, required this.label, required this.color, required this.sub});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 12, color: sub)),
        ],
      ),
    );
  }
}