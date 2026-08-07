import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../common/app_icon.dart';

class FooterSection extends StatelessWidget {
  final bool isDark;
  const FooterSection({super.key, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark ? AppColorsDark.textPrimary : AppColorsLight.textPrimary;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColorsLight.textSecondary;
    final textMuted = isDark ? AppColorsDark.textMuted : AppColorsLight.textMuted;
    final accentTeal = isDark ? AppColorsDark.accentTeal : AppColorsLight.accentTeal;
    final border = isDark ? AppColorsDark.border : AppColorsLight.border;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 24),
      decoration: BoxDecoration(border: Border(top: BorderSide(color: border))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Text(
              'OUR PARTNERS & CAPITALIZATION',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: textMuted),
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 22,
            runSpacing: 12,
            children: [
              _PartnerLogo(
                isDark: isDark,
                icon: 'waveform', 
                label: 'CityPulse', 
                textPrimary: textPrimary,
              ),
              _PartnerLogo(
                isDark: isDark,
                icon: 'globe', 
                label: 'BTRC', 
                textPrimary: textPrimary,
              ),
              _PartnerLogo(
                isDark: isDark,
                icon: 'heart', 
                label: 'DNCC', 
                textPrimary: textPrimary,
              ),
              _PartnerLogo(
                isDark: isDark,
                icon: 'roboflow-logo', 
                label: 'roboflow', 
                textPrimary: textPrimary,
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Brand row with waveform dark/light images
          Row(
            children: [
              isDark
                  ? Image.asset(
                      'assets/icons/waveform_dark.png',
                      width: 22,
                      height: 22,
                    )
                  : Image.asset(
                      'assets/icons/waveform_light.png',
                      width: 22,
                      height: 22,
                    ),
              const SizedBox(width: 8),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: 'City', style: TextStyle(color: textPrimary, fontWeight: FontWeight.w800, fontSize: 17)),
                    TextSpan(text: 'Pulse', style: TextStyle(color: accentTeal, fontWeight: FontWeight.w800, fontSize: 17)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Flex row for Explore, Contact, Legal with proper margins
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 1,
                child: Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: _FooterColumn(
                    textPrimary: textPrimary,
                    textSecondary: textSecondary,
                    title: 'Explore',
                    items: const ['Solutions', 'Case Studies', 'API Docs', 'Support'],
                  ),
                ),
              ),
              Expanded(
                flex: 1,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: _FooterColumn(
                    textPrimary: textPrimary,
                    textSecondary: textSecondary,
                    title: 'Contact',
                    items: const ['info@citypulse.com', '+880 (2) 723-4750', 'Gulshan Ave, Dhaka'],
                  ),
                ),
              ),
              Expanded(
                flex: 1,
                child: Padding(
                  padding: const EdgeInsets.only(left: 12),
                  child: _FooterColumn(
                    textPrimary: textPrimary,
                    textSecondary: textSecondary,
                    title: 'Legal',
                    items: const ['Terms', 'Privacy', 'Security'],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          Center(
            child: Text(
              '© 2026 CityPulse — Made in Dhaka',
              style: TextStyle(fontSize: 12, color: textMuted),
            ),
          ),
        ],
      ),
    );
  }
}

class _PartnerLogo extends StatelessWidget {
  final bool isDark;
  final String icon;
  final String label;
  final Color textPrimary;

  const _PartnerLogo({
    required this.isDark,
    required this.icon, 
    required this.label, 
    required this.textPrimary,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // For waveform icon, use image asset from assets/icons/
        if (icon == 'waveform')
          Image.asset(
            'assets/icons/waveform.png',
            width: 16,
            height: 16,
          )
        else
          AppIcon(icon, size: 16, color: textPrimary),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textPrimary)),
      ],
    );
  }
}

class _FooterColumn extends StatelessWidget {
  final String title;
  final List<String> items;
  final Color textPrimary;
  final Color textSecondary;

  const _FooterColumn({
    required this.title,
    required this.items,
    required this.textPrimary,
    required this.textSecondary,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title, 
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: textPrimary),
        ),
        const SizedBox(height: 10),
        ...items.map((i) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                i, 
                style: TextStyle(fontSize: 13, color: textSecondary),
              ),
            )),
      ],
    );
  }
}