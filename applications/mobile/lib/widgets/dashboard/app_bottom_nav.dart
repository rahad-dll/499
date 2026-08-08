// lib/widgets/dashboard/app_bottom_nav.dart
//
// The old bug: Map/Bookings/Profile each built their own bottom bar (or
// none at all — BookingsScreen and ProfileScreen had no bottomNavigationBar
// at all before), so the highlight never matched the page you were on.
// Fix: one shared widget, each screen just tells it which index IT is.

import 'package:flutter/material.dart';
import '../../screens/dashboard/dashboard_screen.dart';
import '../../screens/dashboard/bookings_screen.dart';
import '../../screens/dashboard/profile_screen.dart';

class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;  // এই লাইন যোগ করুন

  const AppBottomNav({
    super.key, 
    required this.currentIndex,
    required this.onTap,  // এই লাইন যোগ করুন
  });

  void _go(BuildContext context, int index) {
    if (index == currentIndex) return;

    late final Widget target;
    switch (index) {
      case 0:
        target = const DashboardScreen();
        break;
      case 1:
        target = const BookingsScreen();
        break;
      case 2:
      default:
        target = const ProfileScreen();
        break;
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => target),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: (index) {
        onTap(index);  // প্রথমে parent-কে notify করবে
        _go(context, index);  // তারপর navigation করবে
      },
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.map_outlined),
          activeIcon: Icon(Icons.map),
          label: 'Map',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.book_online_outlined),
          activeIcon: Icon(Icons.book_online),
          label: 'Bookings',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline),
          activeIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
    );
  }
}