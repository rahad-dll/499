// lib/screens/dashboard/dashboard_shell.dart
//
// Root shell after login. Back button behavior:
// - কোনো screen push করা থাকলে (booking details ইত্যাদি) → normal back কাজ করে (Flutter default)
// - Bookings/Profile ট্যাবে থাকলে → back চাপলে প্রথমে Map ট্যাবে ফিরে আসবে
// - Map ট্যাবে (একদম শেষ page) থাকলে → back চাপলে "app থেকে বের হতে চান?" জিজ্ঞেস করবে

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dashboard_screen.dart';
import 'bookings_screen.dart';
import 'profile_screen.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';

class DashboardShell extends StatefulWidget {
  const DashboardShell({super.key});

  @override
  State<DashboardShell> createState() => _DashboardShellState();
}

class _DashboardShellState extends State<DashboardShell> {
  int _currentIndex = 0;

  final List<Widget> _tabs = const [
    DashboardScreen(),
    BookingsScreen(),
    ProfileScreen(),
  ];

  Future<bool> _confirmExit() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('App থেকে বের হবেন?'),
        content: const Text('আপনি কি সত্যিই CityPulse থেকে বের হতে চান?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('না'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('হ্যাঁ, বের হও'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (_currentIndex != 0) {
          setState(() => _currentIndex = 0);
          return;
        }
        final shouldExit = await _confirmExit();
        if (shouldExit) SystemNavigator.pop();
      },
      child: Scaffold(
        body: IndexedStack(index: _currentIndex, children: _tabs),
        bottomNavigationBar: AppBottomNav(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
        ),
      ),
    );
  }
}