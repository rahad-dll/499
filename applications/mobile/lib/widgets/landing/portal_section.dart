import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../common/app_icon.dart';

class _PortalData {
  final String previewImage;
  final String title;
  final String description;

  const _PortalData(this.previewImage, this.title, this.description);
}

const List<_PortalData> _portals = [
  _PortalData('portal_driver_preview', 'Driver App', 'Find, book & navigate to verified parking in seconds.'),
  _PortalData('portal_authority_preview', 'Authority Dashboard', 'Heatmaps, AI alerts & warden dispatch in one command center.'),
  _PortalData('portal_owner_preview', 'Owner Portal', 'Monetize spaces with AI camera feeds & automated payouts.'),
];

class PortalSection extends StatelessWidget {
  final bool isDark;
  const PortalSection({super.key, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark ? AppColorsDark.textPrimary : AppColorsLight.textPrimary;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColorsLight.textSecondary;
    final accentTeal = isDark ? AppColorsDark.accentTeal : AppColorsLight.accentTeal;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'INTEGRATED USER PORTALS',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: accentTeal),
          ),
          const SizedBox(height: 8),
          Text(
            'One ecosystem, three experiences',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: textPrimary),
          ),
          const SizedBox(height: 20),
          ..._portals.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 18),
                child: _PortalCard(data: p, isDark: isDark, textPrimary: textPrimary, textSecondary: textSecondary, accentTeal: accentTeal),
              )),
        ],
      ),
    );
  }
}

class _PortalCard extends StatelessWidget {
  final _PortalData data;
  final bool isDark;
  final Color textPrimary;
  final Color textSecondary;
  final Color accentTeal;

  const _PortalCard({
    required this.data,
    required this.isDark,
    required this.textPrimary,
    required this.textSecondary,
    required this.accentTeal,
  });

  @override
  Widget build(BuildContext context) {
    final surface = isDark ? AppColorsDark.surface : AppColorsLight.surface;
    final border = isDark ? AppColorsDark.border : AppColorsLight.border;

    return Container(
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppImage(data.previewImage, width: double.infinity, height: 190),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(data.title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: textPrimary)),
                const SizedBox(height: 6),
                Text(data.description, style: TextStyle(fontSize: 13.5, height: 1.45, color: textSecondary)),
                const SizedBox(height: 10),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Explore', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: accentTeal)),
                    const SizedBox(width: 4),
                    AppIcon('arrow-right', size: 14, color: accentTeal),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}