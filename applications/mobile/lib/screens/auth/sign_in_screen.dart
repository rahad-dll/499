import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../utils/responsive.dart';
import '../../widgets/responsive_widgets.dart';
import '../../services/session_service.dart';
import '../../services/auth_service.dart';
import 'sign_up_screen.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool obscurePassword = true;
  bool isLoading = false;
  bool rememberMe = false;
  String? emailError;
  String? passwordError;

  @override
  void initState() {
    super.initState();
    _checkRememberMe();
  }

  void _checkRememberMe() async {
    final remembered = await SessionService.getRememberMe();
    if (remembered) {
      final user = await SessionService.getSession();
      if (user != null && user.isLoggedIn) {
        // Auto-login
        // Navigator.pushReplacementNamed(context, '/dashboard');
      }
    }
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  bool _validateEmail(String email) {
    final RegExp regex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    return regex.hasMatch(email);
  }

  void _handleLogin() async {
    setState(() {
      emailError = null;
      passwordError = null;
    });

    bool isValid = true;

    if (emailController.text.isEmpty) {
      setState(() => emailError = 'Email is required');
      isValid = false;
    } else if (!_validateEmail(emailController.text)) {
      setState(() => emailError = 'Please enter a valid email');
      isValid = false;
    }

    if (passwordController.text.isEmpty) {
      setState(() => passwordError = 'Password is required');
      isValid = false;
    } else if (passwordController.text.length < 6) {
      setState(() => passwordError = 'Password must be at least 6 characters');
      isValid = false;
    }

    if (isValid) {
      setState(() => isLoading = true);

      final result = await AuthService.login(
        email: emailController.text.trim(),
        password: passwordController.text,
        deviceName: 'Flutter App',
        rememberMe: rememberMe,
      );

      if (!mounted) return;
      setState(() => isLoading = false);

      if (result.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Welcome back! 🎉'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
        // TODO: navigate to dashboard once it's ready
        // Navigator.pushReplacementNamed(context, '/dashboard');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Login failed'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    final isMobile = Responsive.isMobile(context);
    
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [
                    const Color(0xFF0F1728),
                    const Color(0xFF1A2740),
                  ]
                : [
                    const Color(0xFFF7F9FC),
                    const Color(0xFFE8EEF7),
                  ],
          ),
        ),
        child: Stack(
          children: [
            // ===== GLOW EFFECTS - LIGHT MODE =====
            if (!isDark) ...[
              // Top-left glow
              Positioned(
                left: -120,
                top: -80,
                child: Container(
                  width: 340,
                  height: 340,
                  decoration: BoxDecoration(
                    color: const Color(0xFF7FE9DD).withOpacity(0.22),
                    borderRadius: BorderRadius.circular(170),
                  ),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
                    child: Container(
                      color: Colors.transparent,
                    ),
                  ),
                ),
              ),
              // Top-right glow
              Positioned(
                left: 230,
                top: -40,
                child: Container(
                  width: 320,
                  height: 320,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC4B5FD).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(160),
                  ),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
                    child: Container(
                      color: Colors.transparent,
                    ),
                  ),
                ),
              ),
              // Bottom glow
              Positioned(
                left: 120,
                top: 640,
                child: Container(
                  width: 360,
                  height: 360,
                  decoration: BoxDecoration(
                    color: const Color(0xFFBFD4FF).withOpacity(0.18),
                    borderRadius: BorderRadius.circular(180),
                  ),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
                    child: Container(
                      color: Colors.transparent,
                    ),
                  ),
                ),
              ),
            ],
            
            // ===== GLOW EFFECTS - DARK MODE =====
            if (isDark) ...[
              // Top-left glow
              Positioned(
                left: -120,
                top: -80,
                child: Container(
                  width: 340,
                  height: 340,
                  decoration: BoxDecoration(
                    color: const Color(0xFF18D6C0).withOpacity(0.18),
                    borderRadius: BorderRadius.circular(170),
                  ),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 55, sigmaY: 55),
                    child: Container(
                      color: Colors.transparent,
                    ),
                  ),
                ),
              ),
              // Top-right glow
              Positioned(
                left: 220,
                top: -40,
                child: Container(
                  width: 320,
                  height: 320,
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B5CF6).withOpacity(0.16),
                    borderRadius: BorderRadius.circular(160),
                  ),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 55, sigmaY: 55),
                    child: Container(
                      color: Colors.transparent,
                    ),
                  ),
                ),
              ),
              // Bottom glow
              Positioned(
                left: 120,
                top: 620,
                child: Container(
                  width: 360,
                  height: 360,
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(180),
                  ),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 55, sigmaY: 55),
                    child: Container(
                      color: Colors.transparent,
                    ),
                  ),
                ),
              ),
            ],
            
            // ===== CONTENT =====
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(
                    horizontal: Responsive.paddingHorizontal(context).horizontal,
                    vertical: isMobile ? 32 : 48,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Top Bar
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildLogo(isDark, isMobile),
                          ResponsiveThemeToggle(
                            isDark: isDark,
                            onTap: themeProvider.toggleTheme,
                          ),
                        ],
                      ),
                      SizedBox(height: Responsive.spacing(context, base: 24)),
                      
                      // Hero Section
                      _buildHeroSection(isDark, isMobile),
                      SizedBox(height: Responsive.spacing(context, base: 24)),
                      
                      // Status Pills
                      ResponsiveStatusPills(isDark: isDark),
                      SizedBox(height: Responsive.spacing(context, base: 24)),
                      
                      // Login Card
                      _buildLoginCard(isDark, isMobile),
                      SizedBox(height: Responsive.spacing(context, base: 20)),
                      
                      // Footer
                      _buildFooter(isDark, isMobile),
                      SizedBox(height: Responsive.spacing(context, base: 16)),
                      
                      // Security Note
                      _buildSecurityNote(isDark, isMobile),
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

  Widget _buildLogo(bool isDark, bool isMobile) {
    final logoSize = isMobile ? 38.0 : 48.0;
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
              size: logoSize * 0.5,
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

  Widget _buildHeroSection(bool isDark, bool isMobile) {
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
          'Sign in to CityPulse',
          style: GoogleFonts.inter(
            fontSize: Responsive.fontSize(context, base: 26),
            fontWeight: FontWeight.w700,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
        ),
        SizedBox(height: isMobile ? 8 : 12),
        Text(
          'Manage your city with intelligence and precision.',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: Responsive.fontSize(context, base: 13.5),
            height: 1.45,
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginCard(bool isDark, bool isMobile) {
    final cardWidth = Responsive.containerWidth(context);
    final cardPadding = Responsive.cardPadding(context);
    final borderRadius = isMobile ? 22.0 : 28.0;
    final buttonHeight = isMobile ? 50.0 : 56.0;
    
    return Container(
      width: cardWidth,
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Email Field
          _buildTextField(
            label: 'Email Address',
            hint: 'you@example.com',
            controller: emailController,
            icon: Icons.email_outlined,
            errorText: emailError,
            isDark: isDark,
            isMobile: isMobile,
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),
          
          // Password Field
          _buildTextField(
            label: 'Password',
            hint: 'Enter your password',
            controller: passwordController,
            icon: Icons.lock_outline,
            obscureText: obscurePassword,
            errorText: passwordError,
            isDark: isDark,
            isMobile: isMobile,
            showForgotPassword: true,
            onForgotPassword: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Forgot password - coming soon!'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            suffixIcon: IconButton(
              icon: Icon(
                obscurePassword ? Icons.visibility_off : Icons.visibility,
                color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                size: isMobile ? 20 : 24,
              ),
              onPressed: () {
                setState(() {
                  obscurePassword = !obscurePassword;
                });
              },
            ),
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),
          
          // Login Button
          SizedBox(
            width: double.infinity,
            height: buttonHeight,
            child: ElevatedButton(
              onPressed: isLoading ? null : _handleLogin,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF18D6C0),
                foregroundColor: Colors.white,
                disabledBackgroundColor: const Color(0xFF18D6C0).withOpacity(0.5),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(isMobile ? 11 : 14),
                ),
                elevation: 0,
                shadowColor: isDark 
                    ? const Color(0xFF18D6C0).withOpacity(0.4)
                    : const Color(0xFF00C9B1).withOpacity(0.32),
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
                          'Log In',
                          style: GoogleFonts.inter(
                            fontSize: Responsive.fontSize(context, base: 15),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(width: isMobile ? 9 : 12),
                        Icon(
                          Icons.arrow_forward,
                          size: isMobile ? 17 : 20,
                        ),
                      ],
                    ),
            ),
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),
          
          // Divider
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 1,
                  color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'Or continue with',
                  style: GoogleFonts.inter(
                    fontSize: Responsive.fontSize(context, base: 11.5),
                    color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  ),
                ),
              ),
              Expanded(
                child: Container(
                  height: 1,
                  color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
                ),
              ),
            ],
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),
          
          // Social Buttons
          Row(
            children: [
              Expanded(
                child: _buildSocialButton(
                  label: 'Google',
                  icon: Icons.g_mobiledata,
                  isDark: isDark,
                  isMobile: isMobile,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Google login coming soon!'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                ),
              ),
              SizedBox(width: Responsive.spacing(context, base: 12)),
              Expanded(
                child: _buildSocialButton(
                  label: 'GitHub',
                  icon: Icons.code,
                  isDark: isDark,
                  isMobile: isMobile,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('GitHub login coming soon!'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required String hint,
    required TextEditingController controller,
    required IconData icon,
    required bool isDark,
    required bool isMobile,
    String? errorText,
    bool obscureText = false,
    Widget? suffixIcon,
    bool showForgotPassword = false,
    VoidCallback? onForgotPassword,
  }) {
    final labelSize = Responsive.fontSize(context, base: 12.5);
    final fontSize = Responsive.fontSize(context, base: 14);
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
                onPressed: onForgotPassword,
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
        SizedBox(
          height: fieldHeight,
          child: TextField(
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
        ),
      ],
    );
  }

  Widget _buildSocialButton({
    required String label,
    required IconData icon,
    required bool isDark,
    required bool isMobile,
    required VoidCallback onTap,
  }) {
    final buttonHeight = isMobile ? 46.0 : 54.0;
    final fontSize = Responsive.fontSize(context, base: 13);
    final borderRadius = isMobile ? 11.0 : 14.0;
    
    return GestureDetector(
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
    );
  }

  Widget _buildFooter(bool isDark, bool isMobile) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Don\'t have an account?',
              style: GoogleFonts.inter(
                fontSize: Responsive.fontSize(context, base: 13),
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(width: 5),
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SignUpScreen()),
                );
              },
              child: Text(
                'Sign Up',
                style: GoogleFonts.inter(
                  fontSize: Responsive.fontSize(context, base: 13),
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSecurityNote(bool isDark, bool isMobile) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.shield_outlined,
          size: isMobile ? 13 : 16,
          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
        ),
        const SizedBox(width: 7),
        Text(
          'Protected with enterprise-grade security',
          style: GoogleFonts.inter(
            fontSize: Responsive.fontSize(context, base: 11.5),
            color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }
}