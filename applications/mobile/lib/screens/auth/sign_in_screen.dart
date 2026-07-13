import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../main.dart'; // Import for ThemeProvider
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
  String? emailError;
  String? passwordError;

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

  void _handleLogin() {
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
      
      // Mock Login
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() => isLoading = false);
          
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Welcome back! 🎉'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    
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
                // Top Bar with Logo
                _buildTopBar(isDark, themeProvider),
                const SizedBox(height: 24),
                
                // Hero Section
                _buildHeroSection(isDark),
                const SizedBox(height: 24),
                
                // Status Pills
                _buildStatusPills(isDark),
                const SizedBox(height: 24),
                
                // Login Card
                _buildLoginCard(isDark),
                const SizedBox(height: 20),
                
                // Footer
                _buildFooter(isDark),
                const SizedBox(height: 16),
                
                // Security Note
                _buildSecurityNote(isDark),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(bool isDark, ThemeProvider themeProvider) {
    return Row(
      children: [
        // Logo
        Row(
          children: [
            Container(
              width: 38,
              height: 38,
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
                borderRadius: BorderRadius.circular(19),
              ),
              child: Center(
                child: Icon(
                  Icons.location_city,
                  color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
                  size: 20,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Row(
              children: [
                Text(
                  'City',
                  style: GoogleFonts.inter(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
                  ),
                ),
                Text(
                  'Pulse',
                  style: GoogleFonts.inter(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
                  ),
                ),
              ],
            ),
          ],
        ),
        const Spacer(),
        
        // Theme Toggle Button - NOW WORKING
        GestureDetector(
          onTap: () {
            themeProvider.toggleTheme();
          },
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
              children: [
                Icon(
                  isDark ? Icons.dark_mode : Icons.light_mode,
                  size: 16,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF94A3B8),
                ),
                const SizedBox(width: 6),
                Container(
                  width: 38,
                  height: 22,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F1728) : const Color(0xFFE8EEF7),
                    border: Border.all(
                      color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFD8E1EC),
                    ),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: AnimatedAlign(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                    alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      width: 16,
                      height: 16,
                      margin: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF00C9B1),
                        borderRadius: BorderRadius.circular(8),
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
        ),
      ],
    );
  }

  Widget _buildHeroSection(bool isDark) {
    return Column(
      children: [
        Text(
          'WELCOME BACK',
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 2,
            color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Sign in to CityPulse',
          style: GoogleFonts.inter(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF172033),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Manage your city with intelligence and precision.',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 13.5,
            height: 1.45,
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusPills(bool isDark) {
    final List<Map<String, dynamic>> pills = [
      {'label': 'Live tracking', 'color': const Color(0xFF22C55E)},
      {'label': 'AI online', 'color': const Color(0xFF8B5CF6)},
      {'label': '98% flow', 'color': isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697)},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: pills.map((pill) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
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
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: pill['color'],
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                pill['label'],
                style: GoogleFonts.inter(
                  fontSize: 11.5,
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

  Widget _buildLoginCard(bool isDark) {
    return Container(
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
          // Email Field
          _buildTextField(
            label: 'Email Address',
            hint: 'you@example.com',
            controller: emailController,
            icon: Icons.email_outlined,
            errorText: emailError,
            isDark: isDark,
          ),
          const SizedBox(height: 16),
          
          // Password Field
          _buildTextField(
            label: 'Password',
            hint: 'Enter your password',
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
                setState(() {
                  obscurePassword = !obscurePassword;
                });
              },
            ),
            showForgotPassword: true,
          ),
          const SizedBox(height: 16),
          
          // Login Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: isLoading ? null : _handleLogin,
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
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Log In',
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 9),
                        Icon(
                          Icons.arrow_forward,
                          size: 17,
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 16),
          
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
                    fontSize: 11.5,
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
          const SizedBox(height: 16),
          
          // Social Buttons
          Row(
            children: [
              Expanded(
                child: _buildSocialButton(
                  label: 'Google',
                  icon: Icons.g_mobiledata,
                  isDark: isDark,
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
              const SizedBox(width: 12),
              Expanded(
                child: _buildSocialButton(
                  label: 'GitHub',
                  icon: Icons.code,
                  isDark: isDark,
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
    String? errorText,
    bool obscureText = false,
    Widget? suffixIcon,
    bool showForgotPassword = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showForgotPassword)
          Row(
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Forgot password - coming soon!'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'Forgot?',
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
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

  Widget _buildSocialButton({
    required String label,
    required IconData icon,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 46,
        decoration: BoxDecoration(
          color: isDark 
              ? const Color(0xFF0E1728).withOpacity(0.6)
              : Colors.white,
          border: Border.all(
            color: isDark ? const Color(0xFF253248) : const Color(0xFFE2E8F0),
          ),
          borderRadius: BorderRadius.circular(11),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Don\'t have an account?',
          style: GoogleFonts.inter(
            fontSize: 13,
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
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFF18D6C0) : const Color(0xFF0BA697),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSecurityNote(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.shield_outlined,
          size: 13,
          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
        ),
        const SizedBox(width: 7),
        Text(
          'Protected with enterprise-grade security',
          style: GoogleFonts.inter(
            fontSize: 11.5,
            color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }
}