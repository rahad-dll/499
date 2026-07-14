import 'package:flutter/material.dart';

class Responsive {
  static double screenWidth(BuildContext context) => MediaQuery.of(context).size.width;
  static double screenHeight(BuildContext context) => MediaQuery.of(context).size.height;
  
  static const double mobileBreakpoint = 480;
  static const double tabletBreakpoint = 768;
  
  static bool isMobile(BuildContext context) => screenWidth(context) < mobileBreakpoint;
  static bool isTablet(BuildContext context) => screenWidth(context) >= mobileBreakpoint && screenWidth(context) < tabletBreakpoint;
  static bool isDesktop(BuildContext context) => screenWidth(context) >= tabletBreakpoint;
  
  static EdgeInsets paddingHorizontal(BuildContext context) {
    final width = screenWidth(context);
    if (width < 380) return const EdgeInsets.symmetric(horizontal: 16);
    if (width < 480) return const EdgeInsets.symmetric(horizontal: 20);
    if (width < 768) return const EdgeInsets.symmetric(horizontal: 32);
    return const EdgeInsets.symmetric(horizontal: 48);
  }
  
  static double fontSize(BuildContext context, {required double base}) {
    final width = screenWidth(context);
    if (width < 380) return base * 0.85;
    if (width < 480) return base * 0.95;
    return base;
  }
  
  static double spacing(BuildContext context, {required double base}) {
    final width = screenWidth(context);
    if (width < 380) return base * 0.8;
    if (width < 480) return base * 0.9;
    return base;
  }
}