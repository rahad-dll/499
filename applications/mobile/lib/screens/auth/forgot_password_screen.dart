// lib/screens/auth/forgot_password_screen.dart
//
// POST /auth/forgot-password  -> emails a 6-digit code (valid 15 min)
// POST /auth/reset-password   -> email + code (token) + new_password (8-72)
//
// Two steps in one screen:
//   1) enter email -> "Send code"
//   2) enter the 6-digit code + new password -> "Reset password"
// Backend only allows a new code once per minute, so "Resend" has a 60s
// cooldown. On success the screen pops with the email so Sign In can
// pre-fill it.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../services/auth_service.dart';
import '../../utils/app_toast.dart';
import '../../widgets/common/auth_text_field.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final String initialEmail;
  const ForgotPasswordScreen({super.key, this.initialEmail = ''});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

enum _Step { email, reset }

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  static const int _cooldownSeconds = 60;

  late final TextEditingController _emailCtrl;
  final _codeCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  _Step _step = _Step.email;
  bool _loading = false;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  String? _emailError;
  String? _codeError;
  String? _newPassError;
  String? _confirmError;

  int _cooldown = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _emailCtrl = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _emailCtrl.dispose();
    _codeCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  bool _validEmail(String v) =>
      RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(v);

  void _startCooldown() {
    _timer?.cancel();
    setState(() => _cooldown = _cooldownSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      if (_cooldown <= 1) {
        t.cancel();
        setState(() => _cooldown = 0);
      } else {
        setState(() => _cooldown--);
      }
    });
  }

  // ---------------- STEP 1: send code ----------------

  Future<void> _sendCode({bool isResend = false}) async {
    final email = _emailCtrl.text.trim();
    setState(() => _emailError = null);

    if (email.isEmpty) {
      setState(() => _emailError = 'Email is required');
      return;
    }
    if (!_validEmail(email)) {
      setState(() => _emailError = 'Please enter a valid email');
      return;
    }

    setState(() => _loading = true);
    final result = await AuthService.forgotPassword(email: email);
    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      _startCooldown();
      setState(() => _step = _Step.reset);
      showAppToast(
        context,
        isResend
            ? 'If the email has an account, a new code was sent.'
            : (result.message ?? 'Reset code sent.'),
      );
    } else {
      showAppToast(
        context,
        result.error ?? 'Could not send code',
        color: Colors.red,
      );
    }
  }

  // ---------------- STEP 2: reset ----------------

  Future<void> _reset() async {
    final code = _codeCtrl.text.trim();
    final pass = _newPassCtrl.text;
    final confirm = _confirmCtrl.text;

    setState(() {
      _codeError = null;
      _newPassError = null;
      _confirmError = null;
    });

    var ok = true;
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      _codeError = 'Enter the 6-digit code from your email';
      ok = false;
    }
    if (pass.length < 8) {
      _newPassError = 'Password must be at least 8 characters';
      ok = false;
    } else if (pass.length > 72) {
      _newPassError = 'Password must be at most 72 characters';
      ok = false;
    }
    if (confirm != pass) {
      _confirmError = 'Passwords do not match';
      ok = false;
    }
    if (!ok) {
      setState(() {});
      return;
    }

    setState(() => _loading = true);
    final result = await AuthService.resetPassword(
      email: _emailCtrl.text.trim(),
      code: code,
      newPassword: pass,
    );
    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      showAppToast(
        context,
        result.message ?? 'Password reset. Please sign in.',
      );
      Navigator.pop(context, _emailCtrl.text.trim());
    } else {
      setState(() => _codeError = result.error);
      showAppToast(
        context,
        '${result.error ?? 'Reset failed'}\nTap "Resend code" if it expired.',
        color: Colors.red,
      );
    }
  }

  // ---------------- UI ----------------

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final titleColor =
        isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033);
    final subColor =
        isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final accent = isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [Color(0xFF0F1728), Color(0xFF1A2740)]
                : const [Color(0xFFF7F9FC), Color(0xFFE8EEF7)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  icon: Icon(Icons.arrow_back_rounded, color: titleColor),
                  onPressed: _loading ? null : () => Navigator.pop(context),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 440),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: accent.withOpacity(0.12),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _step == _Step.email
                                  ? Icons.lock_reset_rounded
                                  : Icons.mark_email_read_outlined,
                              color: accent,
                              size: 30,
                            ),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            _step == _Step.email
                                ? 'Forgot password?'
                                : 'Check your email',
                            style: GoogleFonts.inter(
                              fontSize: 26,
                              fontWeight: FontWeight.w700,
                              color: titleColor,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _step == _Step.email
                                ? "Enter your account email and we'll send you a 6-digit reset code."
                                : 'We sent a 6-digit code to ${_emailCtrl.text.trim()}. It is valid for 15 minutes.',
                            style: GoogleFonts.inter(
                              fontSize: 13.5,
                              height: 1.45,
                              color: subColor,
                            ),
                          ),
                          const SizedBox(height: 22),
                          Container(
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF16223A)
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isDark
                                    ? const Color(0xFF2A3B57)
                                    : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: _step == _Step.email
                                ? _buildEmailStep(isDark, accent)
                                : _buildResetStep(isDark, accent, subColor),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _primaryButton(String text, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton(
        onPressed: _loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF18D6C0),
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFF18D6C0).withOpacity(0.5),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: _loading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.white,
                ),
              )
            : Text(
                text,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Widget _buildEmailStep(bool isDark, Color accent) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AuthTextField(
          label: 'Email Address',
          hint: 'you@example.com',
          controller: _emailCtrl,
          icon: Icons.email_outlined,
          isDark: isDark,
          errorText: _emailError,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _sendCode(),
        ),
        const SizedBox(height: 18),
        _primaryButton('Send code', () => _sendCode()),
      ],
    );
  }

  Widget _buildResetStep(bool isDark, Color accent, Color subColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AuthTextField(
          label: '6-digit code',
          hint: '000000',
          controller: _codeCtrl,
          icon: Icons.pin_outlined,
          isDark: isDark,
          errorText: _codeError,
          keyboardType: TextInputType.number,
          maxLength: 6,
          letterSpacing: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 14),
        AuthTextField(
          label: 'New password',
          hint: '8 to 72 characters',
          controller: _newPassCtrl,
          icon: Icons.lock_outline,
          isDark: isDark,
          obscureText: _obscureNew,
          errorText: _newPassError,
          textInputAction: TextInputAction.next,
          suffixIcon: IconButton(
            icon: Icon(
              _obscureNew ? Icons.visibility_off : Icons.visibility,
              size: 20,
              color: subColor,
            ),
            onPressed: () => setState(() => _obscureNew = !_obscureNew),
          ),
        ),
        const SizedBox(height: 14),
        AuthTextField(
          label: 'Confirm new password',
          hint: 'Re-enter new password',
          controller: _confirmCtrl,
          icon: Icons.lock_outline,
          isDark: isDark,
          obscureText: _obscureConfirm,
          errorText: _confirmError,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _reset(),
          suffixIcon: IconButton(
            icon: Icon(
              _obscureConfirm ? Icons.visibility_off : Icons.visibility,
              size: 20,
              color: subColor,
            ),
            onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
          ),
        ),
        const SizedBox(height: 18),
        _primaryButton('Reset password', _reset),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: _loading
                  ? null
                  : () {
                      _timer?.cancel();
                      setState(() {
                        _step = _Step.email;
                        _cooldown = 0;
                        _codeCtrl.clear();
                        _codeError = null;
                      });
                    },
              child: Text(
                'Change email',
                style: GoogleFonts.inter(fontSize: 12.5, color: subColor),
              ),
            ),
            TextButton(
              onPressed: (_loading || _cooldown > 0)
                  ? null
                  : () => _sendCode(isResend: true),
              child: Text(
                _cooldown > 0 ? 'Resend in ${_cooldown}s' : 'Resend code',
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: _cooldown > 0 ? subColor : accent,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}