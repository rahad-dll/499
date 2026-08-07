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
          AppIcon('waveform', size: 22, color: accentTeal),
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
          Container(
            height: 36,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(gradient: kBrandGradient, borderRadius: BorderRadius.circular(10)),
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
                  child: Text('Get Started', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          _CircleButton(
            surface: surface,
            border: border,
            child: AppIcon(isDark ? 'sun' : 'moon-stars', size: 16, color: textPrimary),
            onTap: onToggleTheme,
          ),
          const SizedBox(width: 8),
          _CircleButton(
            surface: surface,
            border: border,
            child: AppIcon('list', size: 16, color: textPrimary),
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

  const _CircleButton({required this.child, required this.surface, required this.border, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: surface,
      shape: CircleBorder(side: BorderSide(color: border)),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 36, height: 36, child: Center(child: child)),
      ),
    );
  }
}