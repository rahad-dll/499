import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../common/app_icon.dart';

class _FeatureData {
  final String icon;
  final String title;
  final String description;
  final bool highlighted;

  const _FeatureData(this.icon, this.title, this.description, {this.highlighted = false});
}

const List<_FeatureData> _features = [
  _FeatureData('activity', 'Real-time Detection',
      'Live traffic & slot data streamed to drivers for proactive routing.'),
  _FeatureData('video-camera', 'AI Surveillance',
      'Smart AI cameras auto-detect incidents & illegal parking 24/7.',
      highlighted: true),
  _FeatureData('chart-bar', 'Analytics',
      'Predictive dashboards for infrastructure planning insights.'),
];

class FeatureSection extends StatelessWidget {
  final bool isDark;
  const FeatureSection({super.key, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark ? AppColorsDark.textPrimary : AppColorsLight.textPrimary;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColorsLight.textSecondary;
    final accentTeal = isDark ? AppColorsDark.accentTeal : AppColorsLight.accentTeal;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'PLATFORM FEATURE SUITE',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: accentTeal),
          ),
          const SizedBox(height: 8),
          Text(
            'Everything a smart city needs',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: textPrimary),
          ),
          const SizedBox(height: 20),
          ..._features.map((f) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _FeatureCard(data: f, isDark: isDark, textPrimary: textPrimary, textSecondary: textSecondary, accentTeal: accentTeal),
              )),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final _FeatureData data;
  final bool isDark;
  final Color textPrimary;
  final Color textSecondary;
  final Color accentTeal;

  const _FeatureCard({
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
    final accentPurple = isDark ? AppColorsDark.accentPurple : AppColorsLight.accentPurple;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: data.highlighted ? accentPurple : border,
          width: data.highlighted ? 1.4 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: accentTeal.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: AppIcon(data.icon, size: 20, color: accentTeal),
          ),
          const SizedBox(height: 14),
          Text(data.title, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: textPrimary)),
          const SizedBox(height: 6),
          Text(data.description, style: TextStyle(fontSize: 13.5, height: 1.45, color: textSecondary)),
          const SizedBox(height: 10),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Learn more', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: accentTeal)),
              const SizedBox(width: 4),
              AppIcon('arrow-right', size: 14, color: accentTeal),
            ],
          ),
        ],
      ),
    );
  }
}