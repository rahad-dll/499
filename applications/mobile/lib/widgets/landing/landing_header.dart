import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../screens/auth/sign_in_screen.dart';
import '../common/app_icon.dart';

class LandingHeader extends StatelessWidget {
  final bool isDark;
  final VoidCallback onToggleTheme;
  final VoidCallback onMenuTap;

  const LandingHeader({
    super.key,
    required this.isDark,
    required this.onToggleTheme,
    required this.onMenuTap,
  });

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark ? AppColorsDark.textPrimary : AppColorsLight.textPrimary;
    final accentTeal = isDark ? AppColorsDark.accentTeal : AppColorsLight.accentTeal;
    final surface = isDark ? AppColorsDark.surface : AppColorsLight.surface;
    final border = isDark ? AppColorsDark.border : AppColorsLight.border;
    final background = isDark ? AppColorsDark.background : AppColorsLight.background;

    return Container(
      color: background,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        children: [
          // Brand logo with dark/light mode images (raw images without color overlay)
          isDark
              ? Image.asset(
                  'assets/icons/waveform_dark.png',
                  width: 22,
                  height: 22,
                )
              : Image.asset(
                  'assets/icons/waveform_light.png',
                  width: 22,
                  height: 22,
                ),
          const SizedBox(width: 8),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(text: 'City', style: TextStyle(color: textPrimary, fontWeight: FontWeight.w800, fontSize: 17)),
                TextSpan(text: 'Pulse', style: TextStyle(color: accentTeal, fontWeight: FontWeight.w800, fontSize: 17)),
              ],
            ),
          ),
          const Spacer(),
          
          // Get Started button
          Container(
            height: 36,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              gradient: kBrandGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SignInScreen()),
                  );
                },
                child: const Center(
                  child: Text(
                    'Get Started',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          
          // Theme toggle button
          _CircleButton(
            surface: surface,
            border: border,
            child: Icon(
              isDark ? Icons.light_mode : Icons.dark_mode,
              size: 16,
              color: textPrimary,
            ),
            onTap: onToggleTheme,
          ),
          const SizedBox(width: 8),
          
          // Menu button - using Icon with color based on theme
          _CircleButton(
            surface: surface,
            border: border,
            child: Icon(
              Icons.menu,
              size: 16,
              color: textPrimary, // Changes color based on theme
            ),
            onTap: onMenuTap,
          ),
        ],
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  final Widget child;
  final Color surface;
  final Color border;
  final VoidCallback onTap;

  const _CircleButton({
    required this.child,
    required this.surface,
    required this.border,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: surface,
      shape: CircleBorder(
        side: BorderSide(color: border),
      ),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: Center(child: child),
        ),
      ),
    );
  }
}