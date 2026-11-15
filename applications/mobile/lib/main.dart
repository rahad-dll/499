import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'screens/auth/sign_in_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'services/api_service.dart';
import 'services/deleted_bookings_service.dart';
import 'services/recent_searches_service.dart';
import 'services/session_expiry.dart';
import 'services/session_service.dart';

/// Lets code outside the widget tree (an expired session) change screens
/// and show a message.
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<ScaffoldMessengerState> appMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

/// The server refused this login (revoked on another device, password
/// reset / changed elsewhere, or expired): forget it and go to sign-in.
Future<void> _handleSessionExpired() async {
  await SessionService.clearSession();
  DeletedBookingsService().clearAll();
  await RecentSearchesService().clear();

  final navigator = appNavigatorKey.currentState;
  if (navigator == null) return;
  navigator.pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const SignInScreen()),
    (route) => false,
  );
  appMessengerKey.currentState?.showSnackBar(
    const SnackBar(
      content: Text('Your session has ended. Please sign in again.'),
      backgroundColor: Colors.red,
      duration: Duration(seconds: 4),
    ),
  );
}

void main() {
  SessionExpiry.onExpired = () {
    _handleSessionExpired();
  };
  // GET / — wakes the backend (Render free tier sleeps when idle)
  ApiService.ping();
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
          navigatorKey: appNavigatorKey,
          scaffoldMessengerKey: appMessengerKey,
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
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        
        if (snapshot.data == true) {
          return const DashboardScreen();
        }
        
        // No landing/home page: anyone who isn't signed in goes straight to login.
        return const SignInScreen();
      },
    );
  }

  Future<bool> _checkAuth() async {
    try {
      final user = await SessionService.getSession();
      final token = await SessionService.getAccessToken();
      // A saved user without a token (e.g. left over from an old sign-up)
      // would open the dashboard and then fail every request with 401.
      return user != null && token != null && token.isNotEmpty;
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