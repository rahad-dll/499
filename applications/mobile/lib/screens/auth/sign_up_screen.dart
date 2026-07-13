import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_theme.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final TextEditingController fullNameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController = TextEditingController();
  
  String? selectedUserType = 'Driver';
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

  void _handleSignUp() {
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
      
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() => isLoading = false);
          
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Account created successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          
          Navigator.pop(context);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    
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
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Back Button & Title
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(
                        Icons.arrow_back,
                        color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                      ),
                    ),
                    const Spacer(),
                  ],
                ),
                
                Text(
                  'Create Account',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Join CityPulse and start managing your city',
                  style: GoogleFonts.inter(
                    fontSize: 13.5,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 32),
                
                // Sign Up Form
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: isDark 
                        ? const Color(0xFF141E30).withOpacity(0.72)
                        : Colors.white.withOpacity(0.95),
                    border: Border.all(
                      color: isDark 
                          ? const Color(0xFF253248).withOpacity(0.9)
                          : const Color(0xFFE2E8F0),
                    ),
                    borderRadius: BorderRadius.circular(22),
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
                      _buildSignUpTextField(
                        label: 'Full Name',
                        hint: 'John Doe',
                        controller: fullNameController,
                        icon: Icons.person_outline,
                        errorText: fullNameError,
                        isDark: isDark,
                      ),
                      const SizedBox(height: 16),
                      
                      // Email
                      _buildSignUpTextField(
                        label: 'Email Address',
                        hint: 'you@example.com',
                        controller: emailController,
                        icon: Icons.email_outlined,
                        errorText: emailError,
                        isDark: isDark,
                      ),
                      const SizedBox(height: 16),
                      
                      // User Type Dropdown
                      Text(
                        'User Type',
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                          color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                        ),
                      ),
                      const SizedBox(height: 7),
                      Container(
                        decoration: BoxDecoration(
                          color: isDark 
                              ? const Color(0xFF0E1728).withOpacity(0.9)
                              : const Color(0xFFF8FAFC),
                          border: Border.all(
                            color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
                          ),
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedUserType,
                            items: const [
                              DropdownMenuItem(value: 'Driver', child: Text('Driver')),
                              DropdownMenuItem(value: 'Parking Owner', child: Text('Parking Owner')),
                              DropdownMenuItem(value: 'Authority', child: Text('Authority')),
                            ],
                            onChanged: (value) {
                              setState(() => selectedUserType = value);
                            },
                            dropdownColor: isDark ? const Color(0xFF1A2740) : Colors.white,
                            style: TextStyle(
                              color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                              fontSize: 14,
                            ),
                            icon: Icon(
                              Icons.arrow_drop_down,
                              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                            ),
                            isExpanded: true,
                            padding: const EdgeInsets.symmetric(horizontal: 13),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Password
                      _buildSignUpTextField(
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
                            size: 20,
                          ),
                          onPressed: () {
                            setState(() => obscurePassword = !obscurePassword);
                          },
                        ),
                        helperText: 'Min 8 chars, 1 uppercase, 1 digit',
                      ),
                      const SizedBox(height: 16),
                      
                      // Confirm Password
                      _buildSignUpTextField(
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
                            size: 20,
                          ),
                          onPressed: () {
                            setState(() => obscureConfirmPassword = !obscureConfirmPassword);
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Terms & Conditions
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Checkbox(
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
                                        fontSize: 13,
                                        color: isDark 
                                            ? const Color(0xFF94A3B8)
                                            : const Color(0xFF64748B),
                                      ),
                                      children: [
                                        TextSpan(
                                          text: 'Terms & Conditions',
                                          style: GoogleFonts.inter(
                                            fontSize: 13,
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
                                  fontSize: 11,
                                  color: Colors.red,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      
                      // Sign Up Button
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: isLoading ? null : _handleSignUp,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF18D6C0),
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: const Color(0xFF18D6C0).withOpacity(0.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(11),
                            ),
                            elevation: 0,
                          ),
                          child: isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(
                                  'Create Account',
                                  style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Sign In Link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Already have an account?',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(width: 5),
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Text(
                              'Sign In',
                              style: GoogleFonts.inter(
                                fontSize: 13,
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
    );
  }

  Widget _buildSignUpTextField({
    required String label,
    required String hint,
    required TextEditingController controller,
    required IconData icon,
    required bool isDark,
    String? errorText,
    bool obscureText = false,
    Widget? suffixIcon,
    String? helperText,
  }) {
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
          style: TextStyle(
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
            prefixIcon: Icon(
              icon,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
              size: 20,
            ),
            suffixIcon: suffixIcon,
            errorText: errorText,
            helperText: helperText,
            helperStyle: GoogleFonts.inter(
              fontSize: 11,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
            errorStyle: GoogleFonts.inter(fontSize: 11),
            filled: true,
            fillColor: isDark 
                ? const Color(0xFF0E1728).withOpacity(0.9)
                : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF00C9B1),
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: const BorderSide(color: Colors.red, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 13),
          ),
        ),
      ],
    );
  }
}