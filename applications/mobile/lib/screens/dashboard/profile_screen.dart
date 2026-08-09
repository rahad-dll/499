// lib/screens/dashboard/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../models/user_model.dart';
import '../../services/booking_service.dart';
import '../../services/session_service.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
import '../auth/sign_in_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.isDarkMode;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1728) : const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: isDark ? const Color(0xFF1A2740) : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
        elevation: 0,
      ),
      body: FutureBuilder<User?>(
        future: SessionService.getSession(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final user = snapshot.data;
          final displayName = user?.fullName ?? user?.email?.split('@').first ?? 'User';
          final email = user?.email ?? 'No email';
          final role = user?.role ?? 'driver';

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Profile Header
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1A2740) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 50,
                        backgroundColor: const Color(0xFF18D6C0).withOpacity(0.2),
                        child: Text(
                          displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF18D6C0),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        displayName,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        email,
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF18D6C0).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          role.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF18D6C0),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Stats Cards
                Row(
                  children: [
                    Expanded(
                      child: _buildStatCard(
                        isDark: isDark,
                        icon: Icons.local_parking,
                        label: 'Parkings',
                        value: '0',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FutureBuilder(
                        future: BookingService().getBookings(),
                        builder: (context, snap) {
                          final count = snap.data?.length ?? 0;
                          return _buildStatCard(
                            isDark: isDark,
                            icon: Icons.book_online,
                            label: 'Bookings',
                            value: '$count',
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatCard(
                        isDark: isDark,
                        icon: Icons.star,
                        label: 'Rating',
                        value: '0.0',
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Dark / Light mode toggle
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1A2740) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: SwitchListTile(
                    activeColor: const Color(0xFF18D6C0),
                    secondary: Icon(
                      isDark ? Icons.dark_mode : Icons.light_mode,
                      color: const Color(0xFF18D6C0),
                    ),
                    title: Text(
                      'Dark Mode',
                      style: TextStyle(color: isDark ? Colors.white : Colors.black87),
                    ),
                    subtitle: Text(
                      isDark ? 'On' : 'Off',
                      style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
                    ),
                    value: isDark,
                    onChanged: (_) => themeProvider.toggleTheme(),
                  ),
                ),

                // Menu Items
                _buildMenuItem(
                  isDark: isDark,
                  icon: Icons.person_outline,
                  title: 'Edit Profile',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Edit Profile - Coming Soon!')),
                    );
                  },
                ),
                _buildMenuItem(
                  isDark: isDark,
                  icon: Icons.notifications_outlined,
                  title: 'Notifications',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Notifications - Coming Soon!')),
                    );
                  },
                ),
                _buildMenuItem(
                  isDark: isDark,
                  icon: Icons.history,
                  title: 'Booking History',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Booking History - Coming Soon!')),
                    );
                  },
                ),
                _buildMenuItem(
                  isDark: isDark,
                  icon: Icons.payment,
                  title: 'Payment Methods',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Payment Methods - Coming Soon!')),
                    );
                  },
                ),

                const SizedBox(height: 20),

                // Logout Button
                ElevatedButton.icon(
                  onPressed: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Logout'),
                        content: const Text('Are you sure you want to logout?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('Cancel'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            style: TextButton.styleFrom(foregroundColor: Colors.red),
                            child: const Text('Logout'),
                          ),
                        ],
                      ),
                    );

                    if (confirm == true) {
                      await SessionService.clearSession();
                      if (context.mounted) {
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(builder: (_) => const SignInScreen()),
                          (route) => false,
                        );
                      }
                    }
                  },
                  icon: const Icon(Icons.logout),
                  label: const Text('Logout'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 2),
    );
  }

  Widget _buildStatCard({
    required bool isDark,
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2740) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFF18D6C0), size: 24),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required bool isDark,
    required IconData icon,
    required String title,
    Widget? trailing,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2740) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
        ),
      ),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFF18D6C0)),
        title: Text(
          title,
          style: TextStyle(color: isDark ? Colors.white : Colors.black87),
        ),
        trailing: trailing ?? const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }
}