// lib/screens/dashboard/booking_details_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../models/booking_model.dart';
import '../../services/booking_service.dart';
import '../../services/deleted_bookings_service.dart';
import '../../utils/currency_formatter.dart';

class BookingDetailsScreen extends StatefulWidget {
  final BookingModel booking;
  const BookingDetailsScreen({super.key, required this.booking});

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  late BookingModel _booking;
  bool _isBusy = false;
  bool _isDeleted = false;
  final _deletedService = DeletedBookingsService();

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
    // Check if already deleted
    if (_deletedService.isDeleted(_booking.id)) {
      _isDeleted = true;
    }
  }

  (Color, String, IconData) _statusVisual(BookingStatus status) {
    switch (status) {
      case BookingStatus.confirmed:
        return (const Color(0xFF22C55E), 'Confirmed', Icons.check_circle);
      case BookingStatus.pending:
        return (const Color(0xFFF59E0B), 'Pending', Icons.pending);
      case BookingStatus.active:
        return (const Color(0xFF2563EB), 'Active', Icons.play_circle);
      case BookingStatus.completed:
        return (const Color(0xFF8B5CF6), 'Completed', Icons.task_alt);
      case BookingStatus.cancelled:
        return (Colors.red, 'Cancelled', Icons.cancel);
    }
  }

  Future<void> _cancelBooking() async {
    if (_booking.status == BookingStatus.cancelled) {
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
            const Text('Cancel booking?'),
          ],
        ),
        content: const Text(
          'This booking will be marked as cancelled. This action cannot be undone.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep it', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Cancel booking', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _isBusy = true);
    try {
      final updated = await BookingService()
          .updateStatus(_booking.id, BookingStatus.cancelled);
      if (!mounted) return;
      setState(() {
        _booking = updated;
        _isBusy = false;
      });
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
    } catch (e) {
      setState(() => _isBusy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to cancel booking: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _deleteBooking() async {
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
        content: const Text(
          'This will permanently remove this booking from your list.',
          style: TextStyle(fontSize: 14),
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
    if (confirm != true) return;

    setState(() => _isBusy = true);
    
    // Add to deleted service
    _deletedService.addDeletedId(_booking.id);
    
    await Future.delayed(const Duration(milliseconds: 300));
    
    if (!mounted) return;
    
    setState(() {
      _isDeleted = true;
      _isBusy = false;
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
    
    await Future.delayed(const Duration(milliseconds: 300));
    if (mounted) {
      Navigator.pop(context, true);
    }
  }

  String _formatDate(DateTime date) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  String _formatTime(DateTime date) {
    final hour = date.hour > 12 ? date.hour - 12 : date.hour;
    final minute = date.minute.toString().padLeft(2, '0');
    final ampm = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $ampm';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final (statusColor, statusText, statusIcon) = _statusVisual(_booking.status);
    final canCancel = _booking.status == BookingStatus.confirmed ||
        _booking.status == BookingStatus.pending;
    final isCancelled = _booking.status == BookingStatus.cancelled;

    final bgColor = isDark ? const Color(0xFF0A0E1A) : const Color(0xFFF0F4F8);
    final cardColor = isDark ? const Color(0xFF1A2340) : Colors.white;
    final accentColor = const Color(0xFF18D6C0);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text(
          'Booking Details',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        backgroundColor: isDark ? const Color(0xFF121A2E) : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black87,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.arrow_back_rounded,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
        ),
        actions: [
          if (!_isDeleted)
            Container(
              margin: const EdgeInsets.only(right: 16),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: statusColor.withOpacity(0.3)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(statusIcon, color: statusColor, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    statusText,
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: AbsorbPointer(
        absorbing: _isBusy,
        child: _isDeleted
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.delete_forever_rounded,
                      size: 64,
                      color: isDark ? Colors.grey[600] : Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Booking Deleted',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'This booking has been removed from your list',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF18D6C0),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                      ),
                      child: const Text('Go Back'),
                    ),
                  ],
                ),
              )
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Hero Header Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            accentColor,
                            accentColor.withOpacity(0.7),
                            const Color(0xFF0AA6C4),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: accentColor.withOpacity(0.3),
                            blurRadius: 30,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Icon(
                                  Icons.local_parking_rounded,
                                  color: Colors.white,
                                  size: 28,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _booking.spaceName,
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                        height: 1.2,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on_rounded,
                                            color: Colors.white, size: 14),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            _booking.spaceAddress,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: Colors.white70,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildHeroStat(
                                icon: Icons.calendar_today_rounded,
                                label: 'Date',
                                value: _formatDate(_booking.scheduledAt),
                              ),
                              Container(
                                width: 1,
                                height: 40,
                                color: Colors.white.withOpacity(0.2),
                              ),
                              _buildHeroStat(
                                icon: Icons.access_time_rounded,
                                label: 'Time',
                                value: _formatTime(_booking.scheduledAt),
                              ),
                              Container(
                                width: 1,
                                height: 40,
                                color: Colors.white.withOpacity(0.2),
                              ),
                              _buildHeroStat(
                                icon: Icons.timelapse_rounded,
                                label: 'Duration',
                                value: '${_booking.durationHours}h',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Quick Info Grid
                    Row(
                      children: [
                        Expanded(
                          child: _buildInfoTile(
                            isDark: isDark,
                            icon: Icons.attach_money_rounded,
                            label: 'Hourly Rate',
                            value: formatTaka(_booking.pricePerHour),
                            iconBg: const Color(0xFF18D6C0),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildInfoTile(
                            isDark: isDark,
                            icon: Icons.payments_rounded,
                            label: 'Total Amount',
                            value: formatTaka(_booking.totalPrice),
                            iconBg: const Color(0xFF8B5CF6),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Slot & Vehicle Info
                    Row(
                      children: [
                        Expanded(
                          child: _buildInfoTile(
                            isDark: isDark,
                            icon: Icons.event_seat_rounded,
                            label: 'Slot ID',
                            value: _booking.slotId.isNotEmpty ? _booking.slotId : 'Auto-assigned',
                            iconBg: const Color(0xFFF59E0B),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildInfoTile(
                            isDark: isDark,
                            icon: Icons.directions_car_rounded,
                            label: 'Vehicle Plate',
                            value: _booking.vehiclePlate ?? 'Not specified',
                            iconBg: const Color(0xFF3B82F6),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Timeline Card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: isDark ? Colors.transparent : Colors.grey.withOpacity(0.1),
                            blurRadius: 20,
                            offset: const Offset(0, 4),
                          ),
                        ],
                        border: Border.all(
                          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.timeline_rounded,
                                  color: accentColor, size: 20),
                              const SizedBox(width: 10),
                              Text(
                                'Booking Timeline',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : Colors.black87,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          _buildTimelineItem(
                            isDark: isDark,
                            icon: Icons.event_available_rounded,
                            label: 'Created',
                            value: '${_formatDate(_booking.createdAt)} at ${_formatTime(_booking.createdAt)}',
                            isFirst: true,
                          ),
                          _buildTimelineItem(
                            isDark: isDark,
                            icon: Icons.schedule_rounded,
                            label: 'Scheduled',
                            value: '${_formatDate(_booking.scheduledAt)} at ${_formatTime(_booking.scheduledAt)}',
                          ),
                          _buildTimelineItem(
                            isDark: isDark,
                            icon: Icons.flag_rounded,
                            label: 'Ends At',
                            value: '${_formatDate(_booking.endTime)} at ${_formatTime(_booking.endTime)}',
                            isLast: _booking.cancellationReason == null,
                          ),
                          if (_booking.cancellationReason != null)
                            _buildTimelineItem(
                              isDark: isDark,
                              icon: Icons.info_outline_rounded,
                              label: 'Cancellation Reason',
                              value: _booking.cancellationReason!,
                              isLast: true,
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Booking ID
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1A2340) : Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long_rounded,
                              size: 16, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                          const SizedBox(width: 8),
                          Text(
                            'Booking ID: ',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                          Flexible(
                            child: SelectableText(
                              _booking.id,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black87,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Action Buttons
                    Column(
                      children: [
                        if (canCancel)
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: _isBusy ? null : _cancelBooking,
                              icon: const Icon(Icons.cancel_outlined),
                              label: const Text('Cancel Booking'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red,
                                side: const BorderSide(color: Colors.red, width: 1.5),
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
                          ),
                        if (canCancel) const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: _isBusy ? null : _deleteBooking,
                            icon: const Icon(Icons.delete_outline_rounded),
                            label: Text(
                              _isBusy ? 'Deleting...' : 'Delete Booking',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              elevation: 0,
                            ),
                          ),
                        ),
                        if (isCancelled)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              'This booking is already cancelled. You can delete it from your list.',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? Colors.grey[400] : Colors.grey[600],
                                fontStyle: FontStyle.italic,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildHeroStat({required IconData icon, required String label, required String value}) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoTile({
    required bool isDark,
    required IconData icon,
    required String label,
    required String value,
    required Color iconBg,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2340) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: iconBg.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconBg, size: 18),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : Colors.black87,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem({
    required bool isDark,
    required IconData icon,
    required String label,
    required String value,
    bool isFirst = false,
    bool isLast = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFF18D6C0).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: const Color(0xFF18D6C0), size: 16),
              ),
              if (!isLast)
                Container(
                  width: 2,
                  height: 20,
                  color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
                ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}