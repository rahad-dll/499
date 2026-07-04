# create_all_files.ps1
# Run from inside applications\mobile\ (after `flutter create .`)
# Invoke it from Command Prompt with:
#   powershell -ExecutionPolicy Bypass -File create_all_files.ps1

$ErrorActionPreference = "Stop"

Write-Host "Creating folders..."
New-Item -ItemType Directory -Force -Path "assets\images" | Out-Null
New-Item -ItemType Directory -Force -Path "lib\theme" | Out-Null
New-Item -ItemType Directory -Force -Path "lib\screens" | Out-Null

Write-Host "Copying logo assets..."
Copy-Item "..\support\logo\logo.png" "assets\images\logo.png" -Force
Copy-Item "..\support\logo\logo-light.png" "assets\images\logo_light.png" -Force

Write-Host "Writing lib\theme\app_colors.dart..."
@'
import 'package:flutter/material.dart';

/// CityPulse design tokens — Light Mode
/// Source: applications/support/color-palette/color.png & colors.pdf
class AppColorsLight {
  static const background = Color(0xFFF7F9FC);
  static const foreground = Color(0xFF172033);

  static const primary = Color(0xFF1A2B4A);
  static const primaryForeground = Color(0xFFFFFFFF);

  static const secondary = Color(0xFFE8EEF7);
  static const secondaryForeground = Color(0xFF223250);

  static const accent = Color(0xFF00C9B1);
  static const accentForeground = Color(0xFFFFFFFF);

  static const muted = Color(0xFFF1F5F9);
  static const mutedForeground = Color(0xFF64748B);

  static const card = Color(0xFFFFFFFF);
  static const cardForeground = Color(0xFF172033);

  static const border = Color(0xFFD8E1EC);
  static const input = Color(0xFFFFFFFF);
  static const ring = Color(0xFF00C9B1);

  static const destructive = Color(0xFFDC2626);
  static const destructiveForeground = Color(0xFFFFFFFF);

  static const warning = Color(0xFFD97706);
  static const warningForeground = Color(0xFFFFFFFF);

  static const success = Color(0xFF15803D);
  static const successForeground = Color(0xFFFFFFFF);
}

/// CityPulse design tokens — Dark Mode
class AppColorsDark {
  static const background = Color(0xFF0F1728);
  static const foreground = Color(0xFFF8FAFC);

  static const primary = Color(0xFF23385F);
  static const primaryForeground = Color(0xFFFFFFFF);

  static const secondary = Color(0xFF172235);
  static const secondaryForeground = Color(0xFFD6E2F0);

  static const accent = Color(0xFF18D6C0);
  static const accentForeground = Color(0xFF082B27);

  static const muted = Color(0xFF172235);
  static const mutedForeground = Color(0xFF94A3B8);

  static const card = Color(0xFF141E30);
  static const cardForeground = Color(0xFFF8FAFC);

  static const border = Color(0xFF253248);
  static const input = Color(0xFF172235);
  static const ring = Color(0xFF18D6C0);

  static const destructive = Color(0xFFEF4444);
  static const destructiveForeground = Color(0xFFFFFFFF);

  static const warning = Color(0xFFF59E0B);
  static const warningForeground = Color(0xFFFFFFFF);

  static const success = Color(0xFF22C55E);
  static const successForeground = Color(0xFF052E16);
}
'@ | Set-Content -Path "lib\theme\app_colors.dart" -Encoding UTF8

Write-Host "Writing lib\theme\app_theme.dart..."
@'
import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColorsLight.background,
      colorScheme: const ColorScheme.light(
        primary: AppColorsLight.primary,
        onPrimary: AppColorsLight.primaryForeground,
        secondary: AppColorsLight.secondary,
        onSecondary: AppColorsLight.secondaryForeground,
        tertiary: AppColorsLight.accent,
        onTertiary: AppColorsLight.accentForeground,
        surface: AppColorsLight.card,
        onSurface: AppColorsLight.cardForeground,
        error: AppColorsLight.destructive,
        onError: AppColorsLight.destructiveForeground,
        outline: AppColorsLight.border,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 40,
          fontWeight: FontWeight.w800,
          color: AppColorsLight.foreground,
          height: 1.1,
        ),
        titleMedium: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w500,
          color: AppColorsLight.mutedForeground,
        ),
        bodyMedium: TextStyle(
          fontSize: 15,
          color: AppColorsLight.mutedForeground,
          height: 1.45,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColorsLight.primary,
          foregroundColor: AppColorsLight.primaryForeground,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColorsLight.foreground,
          side: const BorderSide(color: AppColorsLight.border),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: AppColorsLight.foreground),
      ),
    );
  }

  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColorsDark.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColorsDark.primary,
        onPrimary: AppColorsDark.primaryForeground,
        secondary: AppColorsDark.secondary,
        onSecondary: AppColorsDark.secondaryForeground,
        tertiary: AppColorsDark.accent,
        onTertiary: AppColorsDark.accentForeground,
        surface: AppColorsDark.card,
        onSurface: AppColorsDark.cardForeground,
        error: AppColorsDark.destructive,
        onError: AppColorsDark.destructiveForeground,
        outline: AppColorsDark.border,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 40,
          fontWeight: FontWeight.w800,
          color: AppColorsDark.foreground,
          height: 1.1,
        ),
        titleMedium: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w500,
          color: AppColorsDark.mutedForeground,
        ),
        bodyMedium: TextStyle(
          fontSize: 15,
          color: AppColorsDark.mutedForeground,
          height: 1.45,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColorsDark.primary,
          foregroundColor: AppColorsDark.primaryForeground,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColorsDark.foreground,
          side: const BorderSide(color: AppColorsDark.border),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: AppColorsDark.foreground),
      ),
    );
  }
}
'@ | Set-Content -Path "lib\theme\app_theme.dart" -Encoding UTF8

Write-Host "Writing lib\screens\landing_screen.dart..."
@'
import 'package:flutter/material.dart';

class LandingScreen extends StatelessWidget {
  final bool isDarkMode;
  final VoidCallback onToggleTheme;

  const LandingScreen({
    super.key,
    required this.isDarkMode,
    required this.onToggleTheme,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        actions: [
          IconButton(
            tooltip: isDarkMode ? 'Switch to light mode' : 'Switch to dark mode',
            icon: Icon(
              isDarkMode ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
            ),
            onPressed: onToggleTheme,
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset(
                  'assets/images/logo.png',
                  width: 140,
                  height: 140,
                ),
                const SizedBox(height: 28),
                Text(
                  'CityPulse',
                  style: theme.textTheme.headlineLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  'Intelligent Parking & Traffic Control Platform',
                  style: theme.textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Connecting Drivers, Parking Owners & Authorities for Smarter Cities',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                Wrap(
                  spacing: 16,
                  runSpacing: 12,
                  alignment: WrapAlignment.center,
                  children: [
                    ElevatedButton(
                      onPressed: () {
                        // TODO: navigate to onboarding / auth flow
                      },
                      child: const Text('Get Started'),
                    ),
                    OutlinedButton(
                      onPressed: () {
                        // TODO: navigate to an "about" / learn-more page
                      },
                      child: const Text('Learn More'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
'@ | Set-Content -Path "lib\screens\landing_screen.dart" -Encoding UTF8

Write-Host "Writing lib\main.dart..."
@'
import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'screens/landing_screen.dart';

void main() {
  runApp(const CityPulseApp());
}

class CityPulseApp extends StatefulWidget {
  const CityPulseApp({super.key});

  @override
  State<CityPulseApp> createState() => _CityPulseAppState();
}

class _CityPulseAppState extends State<CityPulseApp> {
  ThemeMode _themeMode = ThemeMode.light;

  void _toggleTheme() {
    setState(() {
      _themeMode =
          _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CityPulse',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: _themeMode,
      home: LandingScreen(
        isDarkMode: _themeMode == ThemeMode.dark,
        onToggleTheme: _toggleTheme,
      ),
    );
  }
}
'@ | Set-Content -Path "lib\main.dart" -Encoding UTF8

Write-Host ""
Write-Host "Done. Now merge this block into your pubspec.yaml's flutter: section:"
Write-Host ""
Write-Host "flutter:"
Write-Host "  uses-material-design: true"
Write-Host "  assets:"
Write-Host "    - assets/images/logo.png"
Write-Host "    - assets/images/logo_light.png"
Write-Host ""
Write-Host "Then run: flutter pub get && flutter run"
