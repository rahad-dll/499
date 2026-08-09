import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../utils/responsive.dart';
import '../../widgets/responsive_widgets.dart';
import '../../services/auth_service.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final TextEditingController fullNameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController dobController = TextEditingController();
  final TextEditingController nationalIdController = TextEditingController();
  final TextEditingController licenceController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController = TextEditingController();

  // Every sign up from this screen is a driver account — sent to the
  // backend automatically, no UI shown for it.
  static const String _fixedRole = 'driver';

  bool obscurePassword = true;
  bool obscureConfirmPassword = true;
  bool agreeTerms = false;
  bool isLoading = false;

  String? fullNameError;
  String? emailError;
  String? phoneError;
  String? passwordError;
  String? confirmPasswordError;
  String? termsError;

  @override
  void dispose() {
    fullNameController.dispose();
    emailController.dispose();
    phoneController.dispose();
    dobController.dispose();
    nationalIdController.dispose();
    licenceController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  bool _validateEmail(String email) {
    final RegExp regex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    return regex.hasMatch(email);
  }

  bool _validatePassword(String password) {
    return password.length >= 8 &&
        password.contains(RegExp(r'[A-Z]')) &&
        password.contains(RegExp(r'[0-9]'));
  }

  bool _validatePhone(String phone) {
    final RegExp regex = RegExp(r'^[0-9]{10,15}$');
    return regex.hasMatch(phone.trim());
  }

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 20, now.month, now.day),
      firstDate: DateTime(1940),
      lastDate: now,
    );
    if (picked != null) {
      setState(() {
        dobController.text = DateFormat('yyyy-MM-dd').format(picked);
      });
    }
  }

  void _handleSignUp() async {
    setState(() {
      fullNameError = null;
      emailError = null;
      phoneError = null;
      passwordError = null;
      confirmPasswordError = null;
      termsError = null;
    });

    bool isValid = true;

    if (fullNameController.text.isEmpty) {
      setState(() => fullNameError = 'Full name is required');
      isValid = false;
    }

    if (emailController.text.isEmpty) {
      setState(() => emailError = 'Email is required');
      isValid = false;
    } else if (!_validateEmail(emailController.text)) {
      setState(() => emailError = 'Please enter a valid email');
      isValid = false;
    }

    // Phone is now mandatory
    if (phoneController.text.isEmpty) {
      setState(() => phoneError = 'Phone number is required');
      isValid = false;
    } else if (!_validatePhone(phoneController.text)) {
      setState(() => phoneError = 'Please enter a valid phone number (10-15 digits)');
      isValid = false;
    }

    if (passwordController.text.isEmpty) {
      setState(() => passwordError = 'Password is required');
      isValid = false;
    } else if (!_validatePassword(passwordController.text)) {
      setState(() => passwordError = 'Min 8 chars, 1 uppercase, 1 digit');
      isValid = false;
    }

    if (confirmPasswordController.text != passwordController.text) {
      setState(() => confirmPasswordError = 'Passwords do not match');
      isValid = false;
    }

    if (!agreeTerms) {
      setState(() => termsError = 'You must agree to the Terms & Conditions');
      isValid = false;
    }

    if (isValid) {
      setState(() => isLoading = true);

      final result = await AuthService.register(
        email: emailController.text.trim(),
        password: passwordController.text,
        phone: phoneController.text.trim(),
        role: _fixedRole,
        fullName: fullNameController.text.trim(),
        dateOfBirth: dobController.text.trim(),
        nationalId: nationalIdController.text.trim(),
        drivingLicenceNo: licenceController.text.trim(),
      );

      if (!mounted) return;
      setState(() => isLoading = false);

      if (result.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Account created successfully! 🎉'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.error ?? 'Sign up failed'),
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
                      // Top Bar with Logo and Theme Toggle
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
                      SizedBox(height: Responsive.spacing(context, base: 16)),
                      
                      // Hero Section - CityPulse Figma Design
                      _buildHeroSection(isDark, isMobile),
                      SizedBox(height: Responsive.spacing(context, base: 24)),
                      
                      // Sign Up Card
                      _buildSignUpCard(isDark, isMobile),
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
        // CityPulse Icon from assets - using waveform_dark/light
        Image.asset(
          isDark ? 'assets/icons/waveform_dark.png' : 'assets/icons/waveform_light.png',
          width: logoSize,
          height: logoSize,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            // Fallback if asset not found
            return Container(
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
                  Icons.waves,
                  color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
                  size: logoSize * 0.5,
                ),
              ),
            );
          },
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
          'CREATE ACCOUNT',
          style: GoogleFonts.inter(
            fontSize: isMobile ? 12 : 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 2,
            color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
          ),
        ),
        SizedBox(height: isMobile ? 8 : 12),
        Text(
          'Create Your Account',
          style: GoogleFonts.inter(
            fontSize: Responsive.fontSize(context, base: 26),
            fontWeight: FontWeight.w700,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
        ),
        SizedBox(height: isMobile ? 8 : 12),
        Text(
          'Join a smarter, smoother city.',
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

  Widget _buildSignUpCard(bool isDark, bool isMobile) {
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
          // Full Name
          _buildTextField(
            label: 'Full Name',
            hint: 'Enter your full name',
            controller: fullNameController,
            icon: Icons.person_outline,
            errorText: fullNameError,
            isDark: isDark,
            isMobile: isMobile,
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),
          
          // Email
          _buildTextField(
            label: 'Email Address',
            hint: 'Enter your email address',
            controller: emailController,
            icon: Icons.email_outlined,
            errorText: emailError,
            isDark: isDark,
            isMobile: isMobile,
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),

          // Phone (mandatory)
          _buildTextField(
            label: 'Phone Number',
            hint: 'Enter your phone number',
            controller: phoneController,
            icon: Icons.phone_outlined,
            errorText: phoneError,
            isDark: isDark,
            isMobile: isMobile,
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),

          // Date of Birth (optional)
          GestureDetector(
            onTap: _pickDateOfBirth,
            child: AbsorbPointer(
              child: _buildTextField(
                label: 'Date of Birth (optional)',
                hint: 'YYYY-MM-DD',
                controller: dobController,
                icon: Icons.calendar_today_outlined,
                isDark: isDark,
                isMobile: isMobile,
              ),
            ),
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),

          // National ID (optional)
          _buildTextField(
            label: 'National ID (optional)',
            hint: 'Enter your national ID',
            controller: nationalIdController,
            icon: Icons.badge_outlined,
            isDark: isDark,
            isMobile: isMobile,
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),

          // Driving Licence Number (optional)
          _buildTextField(
            label: 'Driving Licence Number (optional)',
            hint: 'Enter your driving licence number',
            controller: licenceController,
            icon: Icons.directions_car_outlined,
            isDark: isDark,
            isMobile: isMobile,
          ),
          SizedBox(height: Responsive.spacing(context, base: 16)),
          
          // Password
          _buildTextField(
            label: 'Password',
            hint: 'Create a strong password',
            controller: passwordController,
            icon: Icons.lock_outline,
            obscureText: obscurePassword,
            errorText: passwordError,
            isDark: isDark,
            isMobile: isMobile,
            suffixIcon: IconButton(
              icon: Icon(
                obscurePassword ? Icons.visibility_off : Icons.visibility,
                color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                size: isMobile ? 20 : 24,
              ),
              onPressed: () {
                setState(() => obscurePassword = !obscurePassword);
              },
            ),
          ),
          if (passwordError == null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 13,
                    color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Min 8 chars, 1 uppercase, 1 digit',
                    style: GoogleFonts.inter(
                      fontSize: Responsive.fontSize(context, base: 11.5),
                      color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),
          SizedBox(height: Responsive.spacing(context, base: 16)),
          
          // Confirm Password
          _buildTextField(
            label: 'Confirm Password',
            hint: 'Confirm your password',
            controller: confirmPasswordController,
            icon: Icons.lock_outline,
            obscureText: obscureConfirmPassword,
            errorText: confirmPasswordError,
            isDark: isDark,
            isMobile: isMobile,
            suffixIcon: IconButton(
              icon: Icon(
                obscureConfirmPassword ? Icons.visibility_off : Icons.visibility,
                color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                size: isMobile ? 20 : 24,
              ),
              onPressed: () {
                setState(() => obscureConfirmPassword = !obscureConfirmPassword);
              },
            ),
          ),
          SizedBox(height: Responsive.spacing(context, base: 20)),
          
          // Terms & Conditions
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  SizedBox(
                    width: isMobile ? 22 : 26,
                    height: isMobile ? 22 : 26,
                    child: Checkbox(
                      value: agreeTerms,
                      onChanged: (value) {
                        setState(() => agreeTerms = value ?? false);
                        if (value == true) {
                          setState(() => termsError = null);
                        }
                      },
                      activeColor: isDark 
                          ? const Color(0xFF18D6C0)
                          : const Color(0xFF00C9B1),
                      side: BorderSide(
                        color: isDark 
                            ? const Color(0xFF253248)
                            : const Color(0xFFE2E8F0),
                        width: 1.5,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() => agreeTerms = !agreeTerms);
                        if (agreeTerms) {
                          setState(() => termsError = null);
                        }
                      },
                      child: Text.rich(
                        TextSpan(
                          text: 'I agree to the ',
                          style: GoogleFonts.inter(
                            fontSize: Responsive.fontSize(context, base: 13),
                            color: isDark 
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF64748B),
                          ),
                          children: [
                            TextSpan(
                              text: 'Terms & Conditions',
                              style: GoogleFonts.inter(
                                fontSize: Responsive.fontSize(context, base: 13),
                                fontWeight: FontWeight.w600,
                                color: isDark 
                                    ? const Color(0xFF18D6C0)
                                    : const Color(0xFF00C9B1),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (termsError != null)
                Padding(
                  padding: const EdgeInsets.only(left: 32, top: 4),
                  child: Text(
                    termsError!,
                    style: GoogleFonts.inter(
                      fontSize: Responsive.fontSize(context, base: 11),
                      color: Colors.red.shade400,
                    ),
                  ),
                ),
            ],
          ),
          SizedBox(height: Responsive.spacing(context, base: 24)),
          
          // Create Account Button
          SizedBox(
            width: double.infinity,
            height: buttonHeight,
            child: ElevatedButton(
              onPressed: isLoading ? null : _handleSignUp,
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
                          'Create Account',
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
  }) {
    final labelSize = Responsive.fontSize(context, base: 12.5);
    final fontSize = Responsive.fontSize(context, base: 14);
    final fieldHeight = isMobile ? 48.0 : 56.0;
    final borderRadius = isMobile ? 11.0 : 14.0;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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

  Widget _buildFooter(bool isDark, bool isMobile) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Already have an account?',
          style: GoogleFonts.inter(
            fontSize: Responsive.fontSize(context, base: 13),
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          ),
        ),
        const SizedBox(width: 5),
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Text(
            'Log In',
            style: GoogleFonts.inter(
              fontSize: Responsive.fontSize(context, base: 13),
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
            ),
          ),
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