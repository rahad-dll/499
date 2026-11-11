// lib/screens/dashboard/change_password_screen.dart
//
// POST /auth/change-password  { current_password, new_password (8-72) }
// Other devices are signed out; this device stays signed in.
// A wrong current password answers 400 (not 401) -> shown under the field.
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../services/auth_service.dart';
import '../../utils/app_toast.dart';
import '../../widgets/common/auth_text_field.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _loading = false;

  String? _currentError;
  String? _newError;
  String? _confirmError;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final current = _currentCtrl.text;
    final next = _newCtrl.text;
    final confirm = _confirmCtrl.text;

    setState(() {
      _currentError = null;
      _newError = null;
      _confirmError = null;
    });

    var ok = true;
    if (current.isEmpty) {
      _currentError = 'Enter your current password';
      ok = false;
    }
    if (next.length < 8) {
      _newError = 'Password must be at least 8 characters';
      ok = false;
    } else if (next.length > 72) {
      _newError = 'Password must be at most 72 characters';
      ok = false;
    } else if (next == current) {
      _newError = 'New password must be different from the current one';
      ok = false;
    }
    if (confirm != next) {
      _confirmError = 'Passwords do not match';
      ok = false;
    }
    if (!ok) {
      setState(() {});
      return;
    }

    setState(() => _loading = true);
    final result = await AuthService.changePassword(
      currentPassword: current,
      newPassword: next,
    );
    if (!mounted) return;
    setState(() => _loading = false);

    if (result.success) {
      final n = result.signedOutSessions;
      showAppToast(
        context,
        n > 0
            ? 'Password changed. $n other device${n == 1 ? '' : 's'} signed out.'
            : 'Password changed.',
      );
      Navigator.pop(context, true);
      return;
    }

    final msg = result.error ?? 'Could not change password';
    // Backend wording isn't fixed, so only pin it to the field if it
    // clearly talks about the current password.
    if (msg.toLowerCase().contains('current')) {
      setState(() => _currentError = msg);
    }
    showAppToast(context, msg, color: Colors.red);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final bg = isDark ? const Color(0xFF0F1728) : const Color(0xFFF7F9FC);
    final titleColor =
        isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033);
    final subColor =
        isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    Widget eye(bool obscure, VoidCallback onTap) => IconButton(
          icon: Icon(
            obscure ? Icons.visibility_off : Icons.visibility,
            size: 20,
            color: subColor,
          ),
          onPressed: onTap,
        );

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        elevation: 0,
        iconTheme: IconThemeData(color: titleColor),
        title: Text(
          'Change Password',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            color: titleColor,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Choose a new password (8 to 72 characters). '
                    'Your other devices will be signed out.',
                    style: GoogleFonts.inter(
                      fontSize: 13.5,
                      height: 1.45,
                      color: subColor,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF16223A) : Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isDark
                            ? const Color(0xFF2A3B57)
                            : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Column(
                      children: [
                        AuthTextField(
                          label: 'Current password',
                          hint: 'Enter current password',
                          controller: _currentCtrl,
                          icon: Icons.lock_outline,
                          isDark: isDark,
                          obscureText: _obscureCurrent,
                          errorText: _currentError,
                          textInputAction: TextInputAction.next,
                          suffixIcon: eye(
                            _obscureCurrent,
                            () => setState(
                                () => _obscureCurrent = !_obscureCurrent),
                          ),
                        ),
                        const SizedBox(height: 14),
                        AuthTextField(
                          label: 'New password',
                          hint: '8 to 72 characters',
                          controller: _newCtrl,
                          icon: Icons.lock_reset_rounded,
                          isDark: isDark,
                          obscureText: _obscureNew,
                          errorText: _newError,
                          textInputAction: TextInputAction.next,
                          suffixIcon: eye(
                            _obscureNew,
                            () => setState(() => _obscureNew = !_obscureNew),
                          ),
                        ),
                        const SizedBox(height: 14),
                        AuthTextField(
                          label: 'Confirm new password',
                          hint: 'Re-enter new password',
                          controller: _confirmCtrl,
                          icon: Icons.lock_reset_rounded,
                          isDark: isDark,
                          obscureText: _obscureConfirm,
                          errorText: _confirmError,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _submit(),
                          suffixIcon: eye(
                            _obscureConfirm,
                            () => setState(
                                () => _obscureConfirm = !_obscureConfirm),
                          ),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            onPressed: _loading ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF18D6C0),
                              foregroundColor: Colors.white,
                              disabledBackgroundColor:
                                  const Color(0xFF18D6C0).withOpacity(0.5),
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
                                    'Update password',
                                    style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}