import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../utils/responsive.dart';

class HeroSection extends StatelessWidget {
  const HeroSection({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final isMobile = Responsive.isMobile(context);
    
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: Responsive.paddingHorizontal(context).horizontal,
        vertical: isMobile ? 24 : 40,
      ),
      child: Column(
        children: [
          // Tagline with gradient background
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark 
                    ? [const Color(0xFF18D6C0).withOpacity(0.2), const Color(0xFF8B5CF6).withOpacity(0.2)]
                    : [const Color(0xFF00C9B1).withOpacity(0.15), const Color(0xFF8B5CF6).withOpacity(0.15)],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark ? const Color(0xFF18D6C0).withOpacity(0.3) : const Color(0xFF00C9B1).withOpacity(0.3),
              ),
            ),
            child: Text(
              '✨ SMARTER CITIES START HERE',
              style: TextStyle(
                fontSize: Responsive.fontSize(context, base: 10),
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
                letterSpacing: 1.5,
              ),
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Main Heading
          Text(
            'CityPulse: Intelligent\nParking & Traffic Control\nPlatform',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 26 : 32),
              fontWeight: FontWeight.w800,
              color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
              height: 1.2,
              letterSpacing: -0.5,
            ),
          ),
          
          const SizedBox(height: 12),
          
          // Subtitle
          Text(
            'Connecting Drivers, Space Owners & Authorities\nfor Smarter Cities.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 13 : 15),
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              height: 1.5,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildPrimaryButton(context, isDark, isMobile),
              const SizedBox(width: 12),
              _buildSecondaryButton(context, isDark, isMobile),
            ],
          ),
          
          const SizedBox(height: 28),
          
          // Stats
          _buildStats(context, isDark, isMobile),
          
          const SizedBox(height: 16),
          
          // Live 3D Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A2740) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
              ),
              boxShadow: [
                BoxShadow(
                  color: isDark 
                      ? Colors.transparent
                      : Colors.black.withOpacity(0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF22C55E),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'LIVE 3D',
                  style: TextStyle(
                    fontSize: Responsive.fontSize(context, base: 11),
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildPrimaryButton(BuildContext context, bool isDark, bool isMobile) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF18D6C0), Color(0xFF0BA697)],
        ),
        borderRadius: BorderRadius.circular(11),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF18D6C0).withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 8),
            spreadRadius: 4,
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Get Started - Coming Soon!'),
              duration: Duration(seconds: 2),
            ),
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          shadowColor: Colors.transparent,
          padding: EdgeInsets.symmetric(
            horizontal: isMobile ? 24 : 32,
            vertical: isMobile ? 14 : 18,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(11),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Get Started',
              style: TextStyle(
                fontSize: Responsive.fontSize(context, base: isMobile ? 13 : 15),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.arrow_forward,
              size: isMobile ? 16 : 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecondaryButton(BuildContext context, bool isDark, bool isMobile) {
    return OutlinedButton(
      onPressed: () {
        _showDownloadDialog(context, isDark);
      },
      style: OutlinedButton.styleFrom(
        foregroundColor: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
        side: BorderSide(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
        ),
        padding: EdgeInsets.symmetric(
          horizontal: isMobile ? 20 : 28,
          vertical: isMobile ? 14 : 18,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(11),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.download_outlined,
            size: isMobile ? 16 : 20,
          ),
          const SizedBox(width: 8),
          Text(
            'Download App',
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 13 : 15),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStats(BuildContext context, bool isDark, bool isMobile) {
    final stats = [
      {'value': '12.4K+', 'label': 'Vehicles daily'},
      {'value': '2.1K+', 'label': 'Smart spots'},
      {'value': '98%', 'label': 'Flow index'},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: stats.map((stat) {
        return Container(
          padding: EdgeInsets.symmetric(
            horizontal: isMobile ? 16 : 24,
            vertical: 8,
          ),
          child: Column(
            children: [
              Text(
                stat['value']!,
                style: TextStyle(
                  fontSize: Responsive.fontSize(context, base: isMobile ? 20 : 24),
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                ),
              ),
              Text(
                stat['label']!,
                style: TextStyle(
                  fontSize: Responsive.fontSize(context, base: isMobile ? 10 : 12),
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  void _showDownloadDialog(BuildContext context, bool isDark) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1A2740) : Colors.white,
        title: Text(
          'Download App',
          style: TextStyle(
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildDownloadOption(context, 'App Store', isDark, Icons.apple),
            const SizedBox(height: 12),
            _buildDownloadOption(context, 'Google Play', isDark, Icons.android),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDownloadOption(BuildContext context, String title, bool isDark, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
        border: Border.all(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, size: 28, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                  ),
                ),
                Text(
                  'Download now',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.arrow_forward_ios,
            size: 16,
            color: Color(0xFF18D6C0),
          ),
        ],
      ),
    );
  }
}