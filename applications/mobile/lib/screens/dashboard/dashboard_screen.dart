import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        centerTitle: true,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              PhosphorIcons.mapPin,
              size: 80,
              color: isDark
                  ? const Color(0xFF18D6C0)
                  : const Color(0xFF0BA697),
            ),
            const SizedBox(height: 16),
            Text(
              'Dashboard Coming Soon',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: isDark
                    ? const Color(0xFFF8FAFC)
                    : const Color(0xFF172033),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Sprint 5 - Parking Search & Booking',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: isDark
                    ? const Color(0xFF94A3B8)
                    : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(PhosphorIcons.mapPin),
            label: 'Parking',
          ),
          BottomNavigationBarItem(
            icon: Icon(PhosphorIcons.user),
            label: 'Profile',
          ),
          BottomNavigationBarItem(
            icon: Icon(PhosphorIcons.gear),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}