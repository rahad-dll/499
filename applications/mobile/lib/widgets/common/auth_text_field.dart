// lib/widgets/common/auth_text_field.dart
//
// Small labelled text field that matches the Sign In screen look
// (light + dark). Used by Forgot Password and Change Password.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class AuthTextField extends StatelessWidget {
  final String label;
  final String hint;
  final TextEditingController controller;
  final IconData icon;
  final bool isDark;
  final bool obscureText;
  final Widget? suffixIcon;
  final String? errorText;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final int? maxLength;
  final bool enabled;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final TextAlign textAlign;
  final double? letterSpacing;

  const AuthTextField({
    super.key,
    required this.label,
    required this.hint,
    required this.controller,
    required this.icon,
    required this.isDark,
    this.obscureText = false,
    this.suffixIcon,
    this.errorText,
    this.keyboardType,
    this.inputFormatters,
    this.maxLength,
    this.enabled = true,
    this.textInputAction,
    this.onSubmitted,
    this.onChanged,
    this.textAlign = TextAlign.start,
    this.letterSpacing,
  });

  @override
  Widget build(BuildContext context) {
    final border = isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0);
    final hintColor =
        isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8);

    OutlineInputBorder outline(Color c, {double w = 1}) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: c, width: w),
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12.5,
            fontWeight: FontWeight.w500,
            color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 7),
        TextField(
          controller: controller,
          obscureText: obscureText,
          enabled: enabled,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          maxLength: maxLength,
          textInputAction: textInputAction,
          onSubmitted: onSubmitted,
          onChanged: onChanged,
          textAlign: textAlign,
          style: TextStyle(
            fontSize: 14,
            letterSpacing: letterSpacing,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: hint,
            hintStyle: TextStyle(fontSize: 14, color: hintColor),
            prefixIcon: Icon(icon, color: hintColor, size: 20),
            suffixIcon: suffixIcon,
            errorText: errorText,
            errorMaxLines: 2,
            errorStyle: GoogleFonts.inter(fontSize: 11),
            filled: true,
            fillColor: isDark
                ? const Color(0xFF0E1728).withOpacity(0.9)
                : const Color(0xFFF8FAFC),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 13, vertical: 14),
            border: outline(border),
            enabledBorder: outline(border),
            disabledBorder: outline(border),
            focusedBorder: outline(
              isDark ? const Color(0xFF18D6C0) : const Color(0xFF00C9B1),
              w: 2,
            ),
            errorBorder: outline(Colors.red, w: 1.5),
            focusedErrorBorder: outline(Colors.red, w: 2),
          ),
        ),
      ],
    );
  }
}