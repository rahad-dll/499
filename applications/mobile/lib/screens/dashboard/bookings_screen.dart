// lib/screens/dashboard/bookings_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../models/booking_model.dart';
import '../../services/booking_service.dart';
import '../../services/deleted_bookings_service.dart';
import '../../widgets/dashboard/app_bottom_nav.dart';
import 'booking_details_screen.dart';
import 'dashboard_screen.dart';
import 'profile_screen.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  final _service = BookingService();
  final _deletedService = DeletedBookingsService();
  List<BookingModel> _bookings = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final bookings = await _service.getBookings();
      if (!mounted) return;
      
      // Filter out deleted bookings using the singleton service
      final filteredBookings = _deletedService.filterBookings(bookings);
      
      setState(() {
        _bookings = filteredBookings;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Failed to load bookings: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _openDetails(BookingModel booking) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => BookingDetailsScreen(booking: booking),
      ),
    );
    
    // If booking was deleted, refresh the list
    if (result == true) {
      _loadBookings();
    }
  }

  Future<void> _cancelBooking(BookingModel booking) async {
    if (booking.status == BookingStatus.cancelled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This booking is already cancelled'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
            const SizedBox(width: 10),
            const Text('Cancel Booking?'),
          ],
        ),
        content: Text(
          'Are you sure you want to cancel booking for "${booking.spaceName}"?',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep it', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      await _service.updateStatus(booking.id, BookingStatus.cancelled);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 10),
              Text('Booking cancelled successfully'),
            ],
          ),
          backgroundColor: Color(0xFF22C55E),
        ),
      );
      _loadBookings();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to cancel booking: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<bool> _confirmDelete(BookingModel booking) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(Icons.delete_forever_rounded, color: Colors.red, size: 28),
            const SizedBox(width: 10),
            const Text('Delete booking?'),
          ],
        ),
        content: Text(
          'Remove the booking for "${booking.spaceName}" from your list?',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    
    if (confirm == true) {
      // Add to deleted service
      _deletedService.addDeletedId(booking.id);
      
      // Remove from local list
      setState(() {
        _bookings.removeWhere((b) => b.id == booking.id);
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.delete_outline, color: Colors.white),
              SizedBox(width: 10),
              Text('Booking removed from list'),
            ],
          ),
          backgroundColor: Color(0xFFE53E3E),
        ),
      );
      return true;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1728) : const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text(
          'My Bookings',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        backgroundColor: isDark ? const Color(0xFF1A2740) : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: _loadBookings,
            icon: Icon(
              Icons.refresh_rounded,
              color: isDark ? Colors.white : Colors.black87,
            ),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF18D6C0)),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Loading bookings...',
                    style: TextStyle(
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            )
          : _errorMessage != null
              ? _buildErrorState(isDark)
              : _bookings.isEmpty
                  ? _buildEmptyState(isDark)
                  : RefreshIndicator(
                      onRefresh: _loadBookings,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _bookings.length,
                        itemBuilder: (context, index) {
                          final booking = _bookings[index];
                          return Dismissible(
                            key: ValueKey(booking.id),
                            direction: DismissDirection.endToStart,
                            confirmDismiss: (_) => _confirmDelete(booking),
                            background: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              alignment: Alignment.centerRight,
                              decoration: BoxDecoration(
                                color: Colors.red,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  Text(
                                    'Delete',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 16,
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Icon(Icons.delete_outline, color: Colors.white),
                                ],
                              ),
                            ),
                            child: _buildBookingCard(booking, isDark),
                          );
                        },
                      ),
                    ),
      bottomNavigationBar: AppBottomNav(
        currentIndex: 1,
        onTap: (index) {
          switch (index) {
            case 0:
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const DashboardScreen()),
              );
              break;
            case 1:
              break;
            case 2:
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
              break;
          }
        },
      ),
    );
  }

  Widget _buildErrorState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Something went wrong',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _loadBookings,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF18D6C0),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              ),
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A2740) : Colors.white,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.book_online_rounded,
              size: 64,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'No bookings yet',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Book a spot from the map — it will show up here',
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const DashboardScreen()),
            ),
            icon: const Icon(Icons.map_rounded),
            label: const Text('Find Parking'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF18D6C0),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCard(BookingModel booking, bool isDark) {
    Color statusColor;
    String statusText;
    IconData statusIcon;

    switch (booking.status) {
      case BookingStatus.confirmed:
        statusColor = const Color(0xFF22C55E);
        statusText = 'Confirmed';
        statusIcon = Icons.check_circle;
        break;
      case BookingStatus.pending:
        statusColor = const Color(0xFFF59E0B);
        statusText = 'Pending';
        statusIcon = Icons.pending;
        break;
      case BookingStatus.active:
        statusColor = const Color(0xFF2563EB);
        statusText = 'Active';
        statusIcon = Icons.play_circle;
        break;
      case BookingStatus.completed:
        statusColor = const Color(0xFF8B5CF6);
        statusText = 'Completed';
        statusIcon = Icons.task_alt;
        break;
      case BookingStatus.cancelled:
        statusColor = Colors.red;
        statusText = 'Cancelled';
        statusIcon = Icons.cancel;
        break;
    }

    final canCancel = booking.status == BookingStatus.confirmed ||
        booking.status == BookingStatus.pending;
    final isCancelled = booking.status == BookingStatus.cancelled;

    return InkWell(
      onTap: () => _openDetails(booking),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A2740) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
          ),
          boxShadow: [
            BoxShadow(
              color: isDark ? Colors.transparent : Colors.grey.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    booking.spaceName,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: statusColor.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, color: statusColor, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(
                  Icons.location_on,
                  size: 14,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    booking.spaceAddress,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildInfoChip(
                  isDark: isDark,
                  icon: Icons.calendar_today_rounded,
                  label: '${booking.scheduledAt.day}/${booking.scheduledAt.month}/${booking.scheduledAt.year}',
                ),
                const SizedBox(width: 6),
                _buildInfoChip(
                  isDark: isDark,
                  icon: Icons.access_time_rounded,
                  label: '${booking.durationHours}h',
                ),
                const SizedBox(width: 6),
                _buildInfoChip(
                  isDark: isDark,
                  icon: Icons.attach_money_rounded,
                  label: '\$${booking.totalPrice.toStringAsFixed(2)}',
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _openDetails(booking),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF18D6C0),
                      side: const BorderSide(color: Color(0xFF18D6C0), width: 1.2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    child: const Text(
                      'View Details',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                if (canCancel) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _cancelBooking(booking),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red, width: 1.2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
                if (isCancelled) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _confirmDelete(booking),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red, width: 1.2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: const Text(
                        'Delete',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoChip({
    required bool isDark,
    required IconData icon,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F1728) : Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: const Color(0xFF18D6C0)),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.grey[300] : Colors.grey[700],
            ),
          ),
        ],
      ),
    );
  }
}