import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../utils/responsive.dart';

class PortalSection extends StatelessWidget {
  const PortalSection({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final isMobile = Responsive.isMobile(context);
    
    final portals = [
      {
        'icon': Icons.directions_car,
        'title': 'Driver App',
        'description': 'Find, book & navigate to verified parking in seconds.',
        'color': const Color(0xFF18D6C0),
      },
      {
        'icon': Icons.dashboard,
        'title': 'Authority Dashboard',
        'description': 'Heatmaps, AI alerts & warden dispatch in one command center.',
        'color': const Color(0xFF8B5CF6),
      },
      {
        'icon': Icons.business,
        'title': 'Owner Portal',
        'description': 'Monetize spaces with AI camera feeds & automated payouts.',
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
            'INTEGRATED USER PORTALS',
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: 11),
              fontWeight: FontWeight.w600,
              color: const Color(0xFF18D6C0),
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'One ecosystem, three\nexperiences',
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 22 : 28),
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
              height: 1.2,
            ),
          ),
          const SizedBox(height: 20),
          
          ...portals.map((portal) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _buildPortalCard(context, portal, isDark),
          )),
        ],
      ),
    );
  }

  Widget _buildPortalCard(BuildContext context, Map<String, dynamic> portal, bool isDark) {
    final isMobile = Responsive.isMobile(context);
    final color = portal['color'] as Color;
    
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Preview Image Placeholder
          Container(
            width: double.infinity,
            height: isMobile ? 140 : 180,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withOpacity(0.15), color.withOpacity(0.05)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: color.withOpacity(0.2),
              ),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    portal['icon'] as IconData,
                    color: color,
                    size: 48,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Preview',
                    style: TextStyle(
                      color: color,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Title with Icon
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Icon(
                    portal['icon'] as IconData,
                    color: color,
                    size: 16,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  portal['title'] as String,
                  style: TextStyle(
                    fontSize: Responsive.fontSize(context, base: isMobile ? 16 : 18),
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            portal['description'] as String,
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 12 : 14),
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {},
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 0),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              'Explore >',
              style: TextStyle(
                fontSize: Responsive.fontSize(context, base: isMobile ? 12 : 14),
                fontWeight: FontWeight.w600,
                color: const Color(0xFF18D6C0),
              ),
            ),
          ),
        ],
      ),
    );
  }
}