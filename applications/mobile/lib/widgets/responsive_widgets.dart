import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/responsive.dart';

// ============== RESPONSIVE LOGO ==============
class ResponsiveLogo extends StatelessWidget {
  final bool isDark;
  final double? size;
  
  const ResponsiveLogo({
    super.key,
    required this.isDark,
    this.size,
  });

  @override
  Widget build(BuildContext context) {
    final logoSize = size ?? (Responsive.isMobile(context) ? 38 : 50);
    final fontSize = Responsive.fontSize(context, base: 19);
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: logoSize,
          height: logoSize,
          decoration: BoxDecoration(
            color: isDark 
                ? const Color(0xFF0E2436).withOpacity(0.9)
                : const Color(0xFFF0FDFA).withOpacity(0.9),
            border: Border.all(
              color: isDark 
                  ? const Color(0xFF18D6C0).withOpacity(0.8)
                  : const Color(0xFF00C9B1).withOpacity(0.8),
              width: 1.5,
            ),
            borderRadius: BorderRadius.circular(logoSize / 2),
          ),
          child: Center(
            child: Icon(
              Icons.location_city,
              color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
              size: logoSize * 0.55,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'City',
              style: GoogleFonts.inter(
                fontSize: fontSize,
                fontWeight: FontWeight.w700,
                color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
              ),
            ),
            Text(
              'Pulse',
              style: GoogleFonts.inter(
                fontSize: fontSize,
                fontWeight: FontWeight.w700,
                color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ============== RESPONSIVE THEME TOGGLE ==============
class ResponsiveThemeToggle extends StatelessWidget {
  final bool isDark;
  final VoidCallback onTap;
  
  const ResponsiveThemeToggle({
    super.key,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A2740) : Colors.white,
          border: Border.all(
            color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
          ),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isDark ? Icons.dark_mode : Icons.light_mode,
              size: isMobile ? 16 : 20,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 6),
            Container(
              width: isMobile ? 38 : 46,
              height: isMobile ? 22 : 26,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F1728) : const Color(0xFFE8EEF7),
                border: Border.all(
                  color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFD8E1EC),
                ),
                borderRadius: BorderRadius.circular(isMobile ? 11 : 13),
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: isMobile ? 16 : 20,
                  height: isMobile ? 16 : 20,
                  margin: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF00C9B1),
                    borderRadius: BorderRadius.circular(isMobile ? 8 : 10),
                    boxShadow: [
                      BoxShadow(
                        color: (isDark ? const Color(0xFF18D6C0) : const Color(0xFF00C9B1))
                            .withOpacity(0.3),
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============== RESPONSIVE STATUS PILLS ==============
class ResponsiveStatusPills extends StatelessWidget {
  final bool isDark;
  
  const ResponsiveStatusPills({super.key, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    final pillPadding = isMobile 
        ? const EdgeInsets.symmetric(horizontal: 11, vertical: 7)
        : const EdgeInsets.symmetric(horizontal: 16, vertical: 10);
    final fontSize = Responsive.fontSize(context, base: 11.5);
    
    final List<Map<String, dynamic>> pills = [
      {'label': 'Live tracking', 'color': const Color(0xFF22C55E)},
      {'label': 'AI online', 'color': const Color(0xFF8B5CF6)},
      {'label': '98% flow', 'color': isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697)},
    ];

    return Wrap(
      spacing: isMobile ? 4 : 8,
      runSpacing: isMobile ? 4 : 8,
      alignment: WrapAlignment.center,
      children: pills.map((pill) {
        return Container(
          padding: pillPadding,
          decoration: BoxDecoration(
            color: isDark 
                ? const Color(0xFF0E1D36).withOpacity(0.7)
                : Colors.white,
            border: Border.all(
              color: isDark 
                  ? const Color(0xFF22344F).withOpacity(0.8)
                  : const Color(0xFFE2E8F0),
            ),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: isMobile ? 7 : 9,
                height: isMobile ? 7 : 9,
                decoration: BoxDecoration(
                  color: pill['color'],
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                pill['label'],
                style: GoogleFonts.inter(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w500,
                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

// ============== RESPONSIVE TEXT FIELD ==============
class ResponsiveTextField extends StatelessWidget {
  final String label;
  final String hint;
  final TextEditingController controller;
  final IconData icon;
  final bool isDark;
  final bool obscureText;
  final Widget? suffixIcon;
  final String? errorText;
  final bool showForgotPassword;
  final Function()? onForgotPassword;
  
  const ResponsiveTextField({
    super.key,
    required this.label,
    required this.hint,
    required this.controller,
    required this.icon,
    required this.isDark,
    this.obscureText = false,
    this.suffixIcon,
    this.errorText,
    this.showForgotPassword = false,
    this.onForgotPassword,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    final fontSize = Responsive.fontSize(context, base: 14);
    final labelSize = Responsive.fontSize(context, base: 12.5);
    final fieldHeight = isMobile ? 48.0 : 56.0;
    final borderRadius = isMobile ? 11.0 : 14.0;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showForgotPassword)
          Row(
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: labelSize,
                  fontWeight: FontWeight.w500,
                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: onForgotPassword ?? () {},
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'Forgot?',
                  style: GoogleFonts.inter(
                    fontSize: labelSize,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
                  ),
                ),
              ),
            ],
          )
        else
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: labelSize,
              fontWeight: FontWeight.w500,
              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
            ),
          ),
        const SizedBox(height: 7),
        TextField(
          controller: controller,
          obscureText: obscureText,
          style: TextStyle(
            fontSize: fontSize,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              fontSize: fontSize,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
            prefixIcon: Icon(
              icon,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
              size: isMobile ? 20 : 24,
            ),
            suffixIcon: suffixIcon,
            errorText: errorText,
            errorStyle: GoogleFonts.inter(fontSize: isMobile ? 11 : 12),
            filled: true,
            fillColor: isDark 
                ? const Color(0xFF0E1728).withOpacity(0.9)
                : const Color(0xFFF8FAFC),
            contentPadding: EdgeInsets.symmetric(
              horizontal: isMobile ? 13 : 16,
              vertical: isMobile ? 0 : 4,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(borderRadius),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(borderRadius),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(borderRadius),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF00C9B1),
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(borderRadius),
              borderSide: const BorderSide(color: Colors.red, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}

// ============== RESPONSIVE LOGIN CARD ==============
class ResponsiveLoginCard extends StatelessWidget {
  final bool isDark;
  final Widget child;
  
  const ResponsiveLoginCard({
    super.key,
    required this.isDark,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    final cardPadding = Responsive.cardPadding(context);
    final borderRadius = isMobile ? 22.0 : 28.0;
    final maxWidth = Responsive.containerWidth(context);
    
    return Container(
      width: maxWidth,
      padding: cardPadding,
      decoration: BoxDecoration(
        color: isDark 
            ? const Color(0xFF141E30).withOpacity(0.72)
            : Colors.white.withOpacity(0.95),
        border: Border.all(
          color: isDark 
              ? const Color(0xFF253248).withOpacity(0.9)
              : const Color(0xFFE2E8F0),
        ),
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: isDark
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.35),
                  blurRadius: 44,
                  offset: const Offset(0, 18),
                  spreadRadius: -8,
                ),
              ]
            : [
                BoxShadow(
                  color: const Color(0xFF1A2B4A).withOpacity(0.1),
                  blurRadius: 40,
                  offset: const Offset(0, 16),
                  spreadRadius: -8,
                ),
              ],
      ),
      child: child,
    );
  }
}

// ============== RESPONSIVE SOCIAL BUTTON ==============
class ResponsiveSocialButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isDark;
  final VoidCallback onTap;
  
  const ResponsiveSocialButton({
    super.key,
    required this.label,
    required this.icon,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    final buttonHeight = isMobile ? 46.0 : 54.0;
    final fontSize = Responsive.fontSize(context, base: 13);
    final borderRadius = isMobile ? 11.0 : 14.0;
    
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: buttonHeight,
          decoration: BoxDecoration(
            color: isDark 
                ? const Color(0xFF0E1728).withOpacity(0.6)
                : Colors.white,
            border: Border.all(
              color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
            ),
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                size: isMobile ? 20 : 24,
              ),
              SizedBox(width: isMobile ? 8 : 10),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w500,
                  color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============== RESPONSIVE BUTTON ==============
class ResponsiveButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final double? width;
  final double? height;
  
  const ResponsiveButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    final buttonHeight = height ?? (isMobile ? 50.0 : 60.0);
    final fontSize = Responsive.fontSize(context, base: 15);
    final borderRadius = isMobile ? 11.0 : 14.0;
    final buttonWidth = width ?? double.infinity;
    
    return SizedBox(
      width: buttonWidth,
      height: buttonHeight,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor ?? const Color(0xFF18D6C0),
          foregroundColor: textColor ?? Colors.white,
          disabledBackgroundColor: (backgroundColor ?? const Color(0xFF18D6C0)).withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          elevation: 0,
        ),
        child: isLoading
            ? SizedBox(
                width: isMobile ? 20 : 24,
                height: isMobile ? 20 : 24,
                child: const CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    text,
                    style: GoogleFonts.inter(
                      fontSize: fontSize,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (icon != null) ...[
                    SizedBox(width: isMobile ? 9 : 12),
                    Icon(
                      icon,
                      size: isMobile ? 17 : 20,
                    ),
                  ],
                ],
              ),
      ),
    );
  }
}

// ============== RESPONSIVE HERO TEXT ==============
class ResponsiveHeroText extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool isDark;
  
  const ResponsiveHeroText({
    super.key,
    required this.title,
    required this.subtitle,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);
    final titleSize = Responsive.fontSize(context, base: 26);
    final subtitleSize = Responsive.fontSize(context, base: 13.5);
    
    return Column(
      children: [
        Text(
          'WELCOME BACK',
          style: GoogleFonts.inter(
            fontSize: isMobile ? 12 : 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 2,
            color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
          ),
        ),
        SizedBox(height: isMobile ? 8 : 12),
        Text(
          title,
          style: GoogleFonts.inter(
            fontSize: titleSize,
            fontWeight: FontWeight.w700,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
        ),
        SizedBox(height: isMobile ? 8 : 12),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: subtitleSize,
            height: 1.45,
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }
}