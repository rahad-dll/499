import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:ui';
import '../../main.dart';
import '../../utils/responsive.dart';

class ImpactSection extends StatelessWidget {
  const ImpactSection({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final isMobile = Responsive.isMobile(context);
    
    final impacts = [
      {'value': '-32%', 'label': 'avg transit time', 'sub': 'Congestion Reduction'},
      {'value': '+41%', 'label': 'slot utilization', 'sub': 'Parking Efficiency'},
      {'value': '₹2.4M', 'label': 'saved monthly', 'sub': 'Economic Savings'},
    ];

    final technologies = [
      {'icon': Icons.visibility, 'label': 'Computer Vision', 'sub': 'YOLO detection pipeline'},
      {'icon': Icons.auto_awesome, 'label': 'Machine Learning', 'sub': 'Demand forecasting'},
      {'icon': Icons.wifi, 'label': 'Real-time WebSocket', 'sub': 'Sub-second updates'},
    ];

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: Responsive.paddingHorizontal(context).horizontal,
        vertical: isMobile ? 32 : 48,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header
          Text(
            'IMPACT & CORE TECHNOLOGIES',
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: 11),
              fontWeight: FontWeight.w600,
              color: const Color(0xFF18D6C0),
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Built to move a whole city',
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 22 : 28),
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
            ),
          ),
          const SizedBox(height: 20),
          
          // Impact Cards - 3 in a row with proper styling
          Row(
            children: impacts.asMap().entries.map((entry) {
              final index = entry.key;
              final impact = entry.value;
              return Expanded(
                child: _buildImpactCard(context, impact, isDark, index),
              );
            }).toList(),
          ),
          
          const SizedBox(height: 32),
          
          // Technologies
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: technologies.map((tech) {
              return _buildTechChip(context, tech, isDark);
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildImpactCard(BuildContext context, Map<String, dynamic> impact, bool isDark, int index) {
    final isMobile = Responsive.isMobile(context);
    
    // Different colors for each card
    final List<Color> cardColors = [
      const Color(0xFF18D6C0),  // Cyan
      const Color(0xFF8B5CF6),  // Purple
      const Color(0xFFF59E0B),  // Orange
    ];
    
    final color = cardColors[index % cardColors.length];
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: EdgeInsets.symmetric(
        vertical: isMobile ? 16 : 20,
        horizontal: isMobile ? 8 : 12,
      ),
      decoration: BoxDecoration(
        color: isDark 
            ? const Color(0xFF1A2740).withOpacity(0.8)
            : Colors.white,
        border: Border.all(
          color: isDark 
              ? const Color(0xFF2A3B57)
              : const Color(0xFFE2E8F0),
          width: 1,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: isDark 
                ? color.withOpacity(0.08)
                : color.withOpacity(0.12),
            blurRadius: 20,
            offset: const Offset(0, 8),
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        children: [
          // Value
          Text(
            impact['value'] as String,
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 22 : 28),
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          // Label
          Text(
            impact['label'] as String,
            style: TextStyle(
              fontSize: Responsive.fontSize(context, base: isMobile ? 10 : 12),
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          // Subtitle (with colored background)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: color.withOpacity(0.2),
                width: 0.5,
              ),
            ),
            child: Text(
              impact['sub'] as String,
              style: TextStyle(
                fontSize: Responsive.fontSize(context, base: isMobile ? 8 : 10),
                fontWeight: FontWeight.w600,
                color: color,
                letterSpacing: 0.3,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTechChip(BuildContext context, Map<String, dynamic> tech, bool isDark) {
    final isMobile = Responsive.isMobile(context);
    
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 16 : 20,
        vertical: isMobile ? 12 : 16,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark 
              ? [const Color(0xFF1A2740), const Color(0xFF0F1728)]
              : [Colors.white, const Color(0xFFF8FAFC)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: isDark 
              ? const Color(0xFF2A3B57)
              : const Color(0xFFE2E8F0),
          width: 1,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: isDark 
                ? const Color(0xFF8B5CF6).withOpacity(0.08)
                : const Color(0xFF8B5CF6).withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Icon with gradient background
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFF8B5CF6), const Color(0xFF6D28D9)],
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              tech['icon'] as IconData,
              color: Colors.white,
              size: isMobile ? 16 : 20,
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tech['label'] as String,
                style: TextStyle(
                  fontSize: Responsive.fontSize(context, base: isMobile ? 13 : 15),
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                ),
              ),
              Text(
                tech['sub'] as String,
                style: TextStyle(
                  fontSize: Responsive.fontSize(context, base: isMobile ? 10 : 12),
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}