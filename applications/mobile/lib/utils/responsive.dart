import 'package:flutter/material.dart';

class Responsive {
  // Get screen size
  static double screenWidth(BuildContext context) => MediaQuery.of(context).size.width;
  static double screenHeight(BuildContext context) => MediaQuery.of(context).size.height;
  
  // Breakpoints
  static const double mobileBreakpoint = 480;
  static const double tabletBreakpoint = 768;
  static const double desktopBreakpoint = 1024;
  
  // Device type detection
  static bool isMobile(BuildContext context) => screenWidth(context) < mobileBreakpoint;
  static bool isTablet(BuildContext context) => screenWidth(context) >= mobileBreakpoint && screenWidth(context) < tabletBreakpoint;
  static bool isDesktop(BuildContext context) => screenWidth(context) >= tabletBreakpoint;
  
  // Responsive padding
  static EdgeInsets paddingAll(BuildContext context) {
    final width = screenWidth(context);
    if (width < 480) return const EdgeInsets.all(16);
    if (width < 768) return const EdgeInsets.all(24);
    return const EdgeInsets.all(32);
  }
  
  static EdgeInsets paddingHorizontal(BuildContext context) {
    final width = screenWidth(context);
    if (width < 480) return const EdgeInsets.symmetric(horizontal: 16);
    if (width < 768) return const EdgeInsets.symmetric(horizontal: 24);
    return const EdgeInsets.symmetric(horizontal: 48);
  }
  
  // Responsive font sizes
  static double fontSize(BuildContext context, {required double base}) {
    final width = screenWidth(context);
    if (width < 480) return base * 0.9;
    if (width < 768) return base;
    return base * 1.2;
  }
  
  // Responsive spacing
  static double spacing(BuildContext context, {required double base}) {
    final width = screenWidth(context);
    if (width < 480) return base * 0.8;
    if (width < 768) return base;
    return base * 1.3;
  }
  
  // Responsive container width
  static double containerWidth(BuildContext context) {
    final width = screenWidth(context);
    if (width < 480) return width - 32;
    if (width < 768) return width * 0.85;
    if (width < 1024) return width * 0.6;
    return width * 0.45;
  }
  
  // Responsive card padding
  static EdgeInsets cardPadding(BuildContext context) {
    final width = screenWidth(context);
    if (width < 480) return const EdgeInsets.all(16);
    if (width < 768) return const EdgeInsets.all(22);
    return const EdgeInsets.all(32);
  }
}