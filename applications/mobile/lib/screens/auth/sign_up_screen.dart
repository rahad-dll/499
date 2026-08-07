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

    // Phone is optional — no validation.

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
    final isMobile = Responsive.isMobile(context);
    final topPadding = isMobile ? 16.0 : 24.0;
    
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
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: Responsive.paddingHorizontal(context).horizontal,
                vertical: topPadding,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Back Button & Title
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                          size: isMobile ? 24 : 28,
                        ),
                      ),
                      const Spacer(),
                    ],
                  ),
                  
                  SizedBox(height: isMobile ? 0 : 8),
                  
                  Text(
                    'Create Account',
                    style: GoogleFonts.inter(
                      fontSize: Responsive.fontSize(context, base: 26),
                      fontWeight: FontWeight.w700,
                      color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Join CityPulse and start managing your city',
                    style: GoogleFonts.inter(
                      fontSize: Responsive.fontSize(context, base: 13.5),
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    ),
                  ),
                  SizedBox(height: Responsive.spacing(context, base: 24)),
                  
                  // Sign Up Card
                  ResponsiveLoginCard(
                    isDark: isDark,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Full Name
                        ResponsiveTextField(
                          label: 'Full Name',
                          hint: 'John Doe',
                          controller: fullNameController,
                          icon: Icons.person_outline,
                          errorText: fullNameError,
                          isDark: isDark,
                        ),
                        SizedBox(height: Responsive.spacing(context, base: 16)),
                        
                        // Email
                        ResponsiveTextField(
                          label: 'Email Address',
                          hint: 'you@example.com',
                          controller: emailController,
                          icon: Icons.email_outlined,
                          errorText: emailError,
                          isDark: isDark,
                        ),
                        SizedBox(height: Responsive.spacing(context, base: 16)),

                        // Phone (optional)
                        ResponsiveTextField(
                          label: 'Phone Number (optional)',
                          hint: '01712345678',
                          controller: phoneController,
                          icon: Icons.phone_outlined,
                          isDark: isDark,
                        ),
                        SizedBox(height: Responsive.spacing(context, base: 16)),

                        // Date of Birth (optional) — tap anywhere on the field to open the picker
                        GestureDetector(
                          onTap: _pickDateOfBirth,
                          child: AbsorbPointer(
                            child: ResponsiveTextField(
                              label: 'Date of Birth (optional)',
                              hint: 'YYYY-MM-DD',
                              controller: dobController,
                              icon: Icons.calendar_today_outlined,
                              isDark: isDark,
                            ),
                          ),
                        ),
                        SizedBox(height: Responsive.spacing(context, base: 16)),

                        // National ID (optional)
                        ResponsiveTextField(
                          label: 'National ID (optional)',
                          hint: '1234567890',
                          controller: nationalIdController,
                          icon: Icons.badge_outlined,
                          isDark: isDark,
                        ),
                        SizedBox(height: Responsive.spacing(context, base: 16)),

                        // Driving Licence Number (optional)
                        ResponsiveTextField(
                          label: 'Driving Licence Number (optional)',
                          hint: 'DL-123456',
                          controller: licenceController,
                          icon: Icons.directions_car_outlined,
                          isDark: isDark,
                        ),
                        SizedBox(height: Responsive.spacing(context, base: 16)),
                        
                        // Password
                        ResponsiveTextField(
                          label: 'Password',
                          hint: 'Create a strong password',
                          controller: passwordController,
                          icon: Icons.lock_outline,
                          obscureText: obscurePassword,
                          errorText: passwordError,
                          isDark: isDark,
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
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              'Min 8 chars, 1 uppercase, 1 digit',
                              style: GoogleFonts.inter(
                                fontSize: Responsive.fontSize(context, base: 11),
                                color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                        SizedBox(height: Responsive.spacing(context, base: 16)),
                        
                        // Confirm Password
                        ResponsiveTextField(
                          label: 'Confirm Password',
                          hint: 'Confirm your password',
                          controller: confirmPasswordController,
                          icon: Icons.lock_outline,
                          obscureText: obscureConfirmPassword,
                          errorText: confirmPasswordError,
                          isDark: isDark,
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
                        SizedBox(height: Responsive.spacing(context, base: 16)),
                        
                        // Terms & Conditions
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                SizedBox(
                                  width: isMobile ? 24 : 28,
                                  height: isMobile ? 24 : 28,
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
                                    ),
                                  ),
                                ),
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
                                                  : const Color(0xFF0BA697),
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
                                padding: const EdgeInsets.only(left: 16),
                                child: Text(
                                  termsError!,
                                  style: GoogleFonts.inter(
                                    fontSize: Responsive.fontSize(context, base: 11),
                                    color: Colors.red,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        SizedBox(height: Responsive.spacing(context, base: 24)),
                        
                        // Sign Up Button
                        ResponsiveButton(
                          text: 'Create Account',
                          onPressed: _handleSignUp,
                          isLoading: isLoading,
                        ),
                        SizedBox(height: Responsive.spacing(context, base: 16)),
                        
                        // Sign In Link
                        Row(
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
                                'Sign In',
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