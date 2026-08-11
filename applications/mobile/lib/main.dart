// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'theme/app_theme.dart';
import 'screens/auth/sign_in_screen.dart';
import 'screens/dashboard/dashboard_shell.dart';   // dashboard_screen.dart এর বদলে এইটা import করোimport 'services/session_service.dart';
import 'widgets/landing/landing_screen.dart'; // ← LandingScreen import করুন
import 'services/session_service.dart';  // এই import ঠিক আছে
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          title: 'CityPulse',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeProvider.isDarkMode ? ThemeMode.dark : ThemeMode.light,
          home: const AuthWrapper(),
        );
      },
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: _checkAuth(),
      builder: (context, snapshot) {
        // লোডিং অবস্থায় CircularProgressIndicator দেখাবে
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        
        // ✅ যদি User Logged In থাকে → Dashboard দেখাবে
        if (snapshot.data == true) {
          return const DashboardShell();
        }
        
        // ❌ যদি User Logged Out থাকে → Landing Page দেখাবে
        return const LandingScreen();
      },
    );
  }

  Future<bool> _checkAuth() async {
    try {
      final user = await SessionService.getSession();
      return user != null;
    } catch (e) {
      return false;
    }
  }
}

class ThemeProvider extends ChangeNotifier {
  bool _isDarkMode = false;

  bool get isDarkMode => _isDarkMode;

  void toggleTheme() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
  }

  void setTheme(bool isDark) {
    _isDarkMode = isDark;
    notifyListeners();
  }
}