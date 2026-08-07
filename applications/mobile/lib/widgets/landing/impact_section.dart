import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../common/app_icon.dart';

class _ImpactData {
  final String icon;
  final String title;
  final String value;
  final Color Function(bool isDark) color;

  const _ImpactData(this.icon, this.title, this.value, this.color);
}

final List<_ImpactData> _impacts = [
  _ImpactData('trend-down', 'Congestion Reduction', '-32% avg transit time',
      (isDark) => isDark ? AppColorsDark.purple : AppColorsLight.purple),
  _ImpactData('car-simple', 'Parking Efficiency', '+41% slot utilization',
      (isDark) => isDark ? AppColorsDark.orange : AppColorsLight.orange),
  _ImpactData('currency-dollar', 'Economic Savings', '\$2.4M saved monthly',
      (isDark) => isDark ? AppColorsDark.green : AppColorsLight.green),
  _ImpactData('scan', 'Computer Vision', 'YOLO detection pipeline',
      (isDark) => isDark ? AppColorsDark.blue : AppColorsLight.blue),
  _ImpactData('cpu', 'Machine Learning', 'Demand forecasting',
      (isDark) => isDark ? AppColorsDark.red : AppColorsLight.red),
  _ImpactData('lightning', 'Real-time WebSocket', 'Sub-second updates',
      (isDark) => isDark ? AppColorsDark.cyan : AppColorsLight.cyan),
];

class ImpactSection extends StatelessWidget {
  final bool isDark;
  const ImpactSection({super.key, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark ? AppColorsDark.textPrimary : AppColorsLight.textPrimary;
    final textSecondary = isDark ? AppColorsDark.textSecondary : AppColorsLight.textSecondary;
    final accentTeal = isDark ? AppColorsDark.accentTeal : AppColorsLight.accentTeal;
    final surface = isDark ? AppColorsDark.surface : AppColorsLight.surface;
    final border = isDark ? AppColorsDark.border : AppColorsLight.border;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'IMPACT & CORE TECHNOLOGIES',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: accentTeal),
          ),
          const SizedBox(height: 8),
          Text(
            'Built to move a whole city',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: textPrimary),
          ),
          const SizedBox(height: 20),
          ..._impacts.map((item) {
            final color = item.color(isDark);
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: border),
              ),
              child: Row(
                children: [
                  // Icon without container - directly showing the icon
                  AppIcon(item.icon, size: 40, color: color),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.title, style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: textPrimary)),
                        const SizedBox(height: 2),
                        Text(item.value, style: TextStyle(fontSize: 13, color: color, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}