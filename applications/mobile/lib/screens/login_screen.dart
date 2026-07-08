import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/auth_colors.dart';

class LoginScreen extends StatefulWidget {
  final bool isDarkMode;
  final VoidCallback onToggleTheme;

  const LoginScreen({
    super.key,
    required this.isDarkMode,
    required this.onToggleTheme,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          // Approximated from the screenshot — a soft teal glow top-left
          // fading into deep navy. Tune stops once you export the parent
          // frame's exact fill from Figma.
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0D2B32),
              AuthColors.pageBackground,
              Color(0xFF161233),
            ],
            stops: [0.0, 0.55, 1.0],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 30),
            child: Column(
              children: [
                _TopBar(
                  isDarkMode: widget.isDarkMode,
                  onToggleTheme: widget.onToggleTheme,
                ),
                const SizedBox(height: 22),
                const _Hero(),
                const SizedBox(height: 22),
                const _StatusPills(),
                const SizedBox(height: 22),
                _LoginCard(
                  emailController: _emailController,
                  passwordController: _passwordController,
                  obscurePassword: _obscurePassword,
                  onToggleObscure: () {
                    setState(() => _obscurePassword = !_obscurePassword);
                  },
                ),
                const SizedBox(height: 22),
                const _Footer(),
                const SizedBox(height: 30),
                const _SecurityNote(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Top bar: logo mark + wordmark + theme toggle
// ---------------------------------------------------------------------------

class _TopBar extends StatelessWidget {
  final bool isDarkMode;
  final VoidCallback onToggleTheme;

  const _TopBar({required this.isDarkMode, required this.onToggleTheme});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Logo mark
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AuthColors.logoMarkBg,
            shape: BoxShape.circle,
            border: Border.all(color: AuthColors.logoMarkBorder, width: 1.5),
          ),
          padding: const EdgeInsets.all(9.5),
          child: const _PulseIcon(),
        ),
        const SizedBox(width: 10),
        // Wordmark
        RichText(
          text: const TextSpan(
            style: TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w700,
              fontSize: 19,
              height: 23 / 19,
            ),
            children: [
              TextSpan(text: 'City', style: TextStyle(color: AuthColors.neutral50)),
              TextSpan(text: 'Pulse', style: TextStyle(color: AuthColors.cyanBright)),
            ],
          ),
        ),
        const Spacer(),
        _ThemeTogglePill(isDarkMode: isDarkMode, onToggleTheme: onToggleTheme),
      ],
    );
  }
}

class _PulseIcon extends StatelessWidget {
  const _PulseIcon();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(painter: _PulsePainter());
  }
}

class _PulsePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AuthColors.cyanBright
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path()
      ..moveTo(0, size.height * 0.6)
      ..lineTo(size.width * 0.25, size.height * 0.6)
      ..lineTo(size.width * 0.4, size.height * 0.15)
      ..lineTo(size.width * 0.58, size.height * 0.85)
      ..lineTo(size.width * 0.72, size.height * 0.5)
      ..lineTo(size.width, size.height * 0.5);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ThemeTogglePill extends StatelessWidget {
  final bool isDarkMode;
  final VoidCallback onToggleTheme;

  const _ThemeTogglePill({required this.isDarkMode, required this.onToggleTheme});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onToggleTheme,
      child: Container(
        width: 72,
        height: 32,
        padding: const EdgeInsets.fromLTRB(8, 5, 5, 5),
        decoration: BoxDecoration(
          color: AuthColors.toggleTrackBg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(Icons.wb_sunny_outlined, size: 15, color: AuthColors.neutral400),
            Container(
              width: 38,
              height: 22,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: AuthColors.switchBg,
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: AuthColors.switchBorder, width: 1),
              ),
              child: Align(
                alignment: isDarkMode ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: const BoxDecoration(
                    color: AuthColors.cyanBright,
                    shape: BoxShape.circle,
                  ),
                  child: const Padding(
                    padding: EdgeInsets.all(2),
                    child: Icon(
                      Icons.nightlight_round,
                      size: 10,
                      color: Color(0xFF03211C),
                    ),
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

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

class _Hero extends StatelessWidget {
  const _Hero();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        Text(
          'WELCOME BACK',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            fontSize: 12,
            letterSpacing: 2,
            color: AuthColors.cyanBright,
          ),
        ),
        SizedBox(height: 8),
        Text(
          'Sign in to CityPulse',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w700,
            fontSize: 26,
            height: 31 / 26,
            color: AuthColors.neutral50,
          ),
        ),
        SizedBox(height: 8),
        Text(
          'Manage your city with intelligence and precision.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w400,
            fontSize: 13.5,
            height: 1.45,
            color: AuthColors.neutral400,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Status pills
// ---------------------------------------------------------------------------

class _StatusPills extends StatelessWidget {
  const _StatusPills();

  @override
  Widget build(BuildContext context) {
    return const Wrap(
      alignment: WrapAlignment.center,
      spacing: 8,
      runSpacing: 8,
      children: [
        _Pill(color: AuthColors.success, label: 'Live tracking'),
        _Pill(color: AuthColors.purple, label: 'AI online'),
        _Pill(color: AuthColors.cyanBright, label: '98% flow'),
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  final Color color;
  final String label;

  const _Pill({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        color: AuthColors.pillBg,
        border: Border.all(color: AuthColors.pillBorder),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w500,
              fontSize: 11.5,
              color: AuthColors.neutral300,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Login card
// ---------------------------------------------------------------------------

class _LoginCard extends StatelessWidget {
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool obscurePassword;
  final VoidCallback onToggleObscure;

  const _LoginCard({
    required this.emailController,
    required this.passwordController,
    required this.obscurePassword,
    required this.onToggleObscure,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: AuthColors.cardBlurSigma,
          sigmaY: AuthColors.cardBlurSigma,
        ),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: AuthColors.cardBg,
            border: Border.all(color: AuthColors.cardBorder),
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.35),
                blurRadius: 44,
                spreadRadius: -8,
                offset: const Offset(0, 18),
              ),
            ],
          ),
          child: Column(
            children: [
              _InputField(
                label: 'Email Address',
                hint: 'you@example.com',
                icon: Icons.mail_outline,
                controller: emailController,
              ),
              const SizedBox(height: 16),
              _PasswordField(
                controller: passwordController,
                obscureText: obscurePassword,
                onToggleObscure: onToggleObscure,
              ),
              const SizedBox(height: 16),
              const _GradientButton(),
              const SizedBox(height: 16),
              const _OrDivider(),
              const SizedBox(height: 16),
              const _SocialButtons(),
            ],
          ),
        ),
      ),
    );
  }
}

class _InputField extends StatelessWidget {
  final String label;
  final String hint;
  final IconData icon;
  final TextEditingController controller;

  const _InputField({
    required this.label,
    required this.hint,
    required this.icon,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w500,
            fontSize: 12.5,
            color: AuthColors.neutral300,
          ),
        ),
        const SizedBox(height: 7),
        Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 13),
          decoration: BoxDecoration(
            color: AuthColors.inputBg,
            border: Border.all(color: AuthColors.inputBorder),
            borderRadius: BorderRadius.circular(11),
          ),
          child: Row(
            children: [
              Icon(icon, size: 17, color: AuthColors.neutral500),
              const SizedBox(width: 9),
              Expanded(
                child: TextField(
                  controller: controller,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 14,
                    color: AuthColors.neutral200,
                  ),
                  decoration: InputDecoration.collapsed(
                    hintText: hint,
                    hintStyle: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      color: AuthColors.neutral500,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final bool obscureText;
  final VoidCallback onToggleObscure;

  const _PasswordField({
    required this.controller,
    required this.obscureText,
    required this.onToggleObscure,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Password',
              style: TextStyle(
                fontFamily: 'Inter',
                fontWeight: FontWeight.w500,
                fontSize: 12.5,
                color: AuthColors.neutral300,
              ),
            ),
            const Spacer(),
            GestureDetector(
              onTap: () {
                // TODO: navigate to forgot-password flow
              },
              child: const Text(
                'Forgot?',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w600,
                  fontSize: 12.5,
                  color: AuthColors.cyanBright,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 13),
          decoration: BoxDecoration(
            color: AuthColors.inputBg,
            border: Border.all(color: AuthColors.inputBorder),
            borderRadius: BorderRadius.circular(11),
          ),
          child: Row(
            children: [
              const Icon(Icons.lock_outline, size: 17, color: AuthColors.neutral500),
              const SizedBox(width: 9),
              Expanded(
                child: TextField(
                  controller: controller,
                  obscureText: obscureText,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 14,
                    color: AuthColors.neutral200,
                  ),
                  decoration: const InputDecoration.collapsed(
                    hintText: 'Enter your password',
                    hintStyle: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      color: AuthColors.neutral500,
                    ),
                  ),
                ),
              ),
              GestureDetector(
                onTap: onToggleObscure,
                child: Icon(
                  obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  size: 17,
                  color: AuthColors.neutral500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GradientButton extends StatelessWidget {
  const _GradientButton();

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(11),
        onTap: () {
          // TODO: wire up auth logic
        },
        child: Container(
          height: 50,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [AuthColors.ctaGradientStart, AuthColors.ctaGradientEnd],
            ),
            borderRadius: BorderRadius.circular(11),
            boxShadow: [
              BoxShadow(
                color: AuthColors.cyanBright.withOpacity(0.4),
                blurRadius: 20,
                spreadRadius: -3,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Log In',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                  color: Colors.white,
                ),
              ),
              SizedBox(width: 9),
              Icon(Icons.arrow_forward, size: 17, color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: AuthColors.inputBorder, height: 1)),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'Or continue with',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 11.5,
              color: AuthColors.neutral500,
            ),
          ),
        ),
        const Expanded(child: Divider(color: AuthColors.inputBorder, height: 1)),
      ],
    );
  }
}

class _SocialButtons extends StatelessWidget {
  const _SocialButtons();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: const [
        Expanded(
          child: _SocialButton(
            label: 'Google',
            iconColor: Color(0xFF4285F4),
            icon: Icons.g_mobiledata_rounded,
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: _SocialButton(
            label: 'GitHub',
            iconColor: AuthColors.neutral200,
            icon: Icons.code,
          ),
        ),
      ],
    );
  }
}

class _SocialButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color iconColor;

  const _SocialButton({
    required this.label,
    required this.icon,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(11),
        onTap: () {
          // TODO: wire up OAuth flow
        },
        child: Container(
          height: 46,
          decoration: BoxDecoration(
            color: AuthColors.socialBtnBg,
            border: Border.all(color: AuthColors.inputBorder),
            borderRadius: BorderRadius.circular(11),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: iconColor),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                  color: AuthColors.neutral200,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Footer + security note
// ---------------------------------------------------------------------------

class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          "Don't have an account? ",
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            color: AuthColors.neutral400,
          ),
        ),
        GestureDetector(
          onTap: () {
            // TODO: navigate to sign-up screen
          },
          child: const Text(
            'Sign Up',
            style: TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: AuthColors.cyanBright,
            ),
          ),
        ),
      ],
    );
  }
}

class _SecurityNote extends StatelessWidget {
  const _SecurityNote();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.shield_outlined, size: 13, color: AuthColors.neutral500),
        SizedBox(width: 7),
        Text(
          'Protected with enterprise-grade security',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 11.5,
            color: AuthColors.neutral500,
          ),
        ),
      ],
    );
  }
}