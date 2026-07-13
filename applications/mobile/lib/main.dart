import 'package:flutter/material.dart';
import 'theme/app_theme.dart';

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
    );
  }
}
