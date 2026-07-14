import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../utils/responsive.dart';

class FooterSection extends StatelessWidget {
  const FooterSection({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final isMobile = Responsive.isMobile(context);
    
    final exploreLinks = ['Solutions', 'Case Studies', 'API Docs', 'Support'];
    final contactInfo = ['info@citypulse.com', '+880 (2) 723-4750', 'Gulshan Ave, Dhaka'];
    final legalLinks = ['Terms', 'Privacy', 'Security'];

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: Responsive.paddingHorizontal(context).horizontal,
        vertical: isMobile ? 32 : 48,
      ),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
            width: 1,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
          _buildLogo(isDark, context),
          const SizedBox(height: 20),
          
          // Partner Logos
          _buildPartnerLogos(context, isDark),
          const SizedBox(height: 24),
          
          // Footer Links
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _buildLinkColumn('Explore', exploreLinks, context, isDark),
              ),
              Expanded(
                child: _buildLinkColumn('Contact', contactInfo, context, isDark),
              ),
              Expanded(
                child: _buildLinkColumn('Legal', legalLinks, context, isDark),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          Divider(
            color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
          ),
          const SizedBox(height: 16),
          
          Text(
            '© 2026 CityPulse — Made in Dhaka',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: 12),
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
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
          width: isMobile ? 28 : 32,
          height: isMobile ? 28 : 32,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0E2436) : const Color(0xFFF0FDFA),
            border: Border.all(
              color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF00C9B1),
              width: 1.5,
            ),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Center(
            child: Icon(
              Icons.location_city,
              color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
              size: isMobile ? 14 : 18,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          'CityPulse',
          style: TextStyle(
            fontSize: Responsive.fontSize(context, base: isMobile ? 14 : 16),
            fontWeight: FontWeight.w700,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
        ),
      ],
    );
  }

  Widget _buildPartnerLogos(BuildContext context, bool isDark) {
    final partners = ['BTRC', 'DNCC', 'Roboflow'];
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: partners.map((name) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A2740) : Colors.white,
            border: Border.all(
              color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
              width: 1,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F1728) : const Color(0xFFF7F9FC),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Icon(
                  Icons.business,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  size: 12,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                name,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildLinkColumn(String title, List<String> links, BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: Responsive.fontSize(context, base: 13),
            fontWeight: FontWeight.w600,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
        ),
        const SizedBox(height: 12),
        ...links.map((link) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            link,
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: 12),
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
        )),
      ],
    );
  }
}