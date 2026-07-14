import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../utils/responsive.dart';

class FeatureSection extends StatelessWidget {
  const FeatureSection({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final isMobile = Responsive.isMobile(context);
    
    final features = [
      {
        'icon': Icons.radar,
        'title': 'Real-time Detection',
        'description': 'Live traffic & slot data streamed to drivers for proactive routing.',
        'color': const Color(0xFF18D6C0),
      },
      {
        'icon': Icons.visibility,
        'title': 'AI Surveillance',
        'description': 'Smart AI cameras auto-detect incidents & illegal parking 24/7.',
        'color': const Color(0xFF8B5CF6),
      },
      {
        'icon': Icons.analytics,
        'title': 'Analytics',
        'description': 'Predictive dashboards for infrastructure planning insights.',
        'color': const Color(0xFFF59E0B),
      },
    ];

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: Responsive.paddingHorizontal(context).horizontal,
        vertical: isMobile ? 32 : 48,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'PLATFORM FEATURE SUITE',
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: 11),
              fontWeight: FontWeight.w600,
              color: const Color(0xFF18D6C0),
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Everything a smart city needs',
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 22 : 28),
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
            ),
          ),
          const SizedBox(height: 20),
          
          ...features.map((feature) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _buildFeatureCard(context, feature, isDark),
          )),
        ],
      ),
    );
  }

  Widget _buildFeatureCard(BuildContext context, Map<String, dynamic> feature, bool isDark) {
    final isMobile = Responsive.isMobile(context);
    final color = feature['color'] as Color;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2740) : Colors.white,
        border: Border.all(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
          width: 1,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.transparent : Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              feature['icon'] as IconData,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  feature['title'] as String,
                  style: TextStyle(
                    fontSize: Responsive.fontSize(context, base: isMobile ? 15 : 17),
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  feature['description'] as String,
                  style: TextStyle(
                    fontSize: Responsive.fontSize(context, base: isMobile ? 12 : 14),
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {},
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 0),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Learn more >',
                    style: TextStyle(
                      fontSize: Responsive.fontSize(context, base: isMobile ? 12 : 14),
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF18D6C0),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}