import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand Colors - Based on Figma
  static const Color primaryCyan = Color(0xFF18D6C0);
  static const Color primaryCyanDark = Color(0xFF00C9B1);
  static const Color tealDeep = Color(0xFF0BA697);
  static const Color purple = Color(0xFF8B5CF6);
  static const Color orange = Color(0xFFF59E0B);
  
  // Background Colors
  static const Color lightBg = Color(0xFFF7F9FC);
  static const Color darkBg = Color(0xFF0F1728);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color darkCard = Color(0xFF1A2740);
  
  // Text Colors
  static const Color lightTextPrimary = Color(0xFF172033);
  static const Color lightTextSecondary = Color(0xFF64748B);
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextSecondary = Color(0xFF94A3B8);
  
  // Border Colors
  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color darkBorder = Color(0xFF2A3B57);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: lightBg,
    textTheme: GoogleFonts.interTextTheme(),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      backgroundColor: Colors.transparent,
      foregroundColor: lightTextPrimary,
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: darkBg,
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      backgroundColor: Colors.transparent,
      foregroundColor: darkTextPrimary,
    ),
  );
}