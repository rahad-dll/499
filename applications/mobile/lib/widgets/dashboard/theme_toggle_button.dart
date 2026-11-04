// lib/widgets/dashboard/theme_toggle_button.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import 'dashboard_colors.dart';

class ThemeToggleButton extends StatelessWidget {
  const ThemeToggleButton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Container(
      height: 52,
      width: 52,
      decoration: BoxDecoration(
        gradient: DashColors.brandGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: DashColors.teal.withValues(alpha: 0.30),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: IconButton(
        onPressed: () =>
            Provider.of<ThemeProvider>(context, listen: false).toggleTheme(),
        icon: Icon(
          isDark ? Icons.nightlight_round_rounded : Icons.wb_sunny_rounded,
          color: Colors.white,
          size: 22,
        ),
      ),
    );
  }
}