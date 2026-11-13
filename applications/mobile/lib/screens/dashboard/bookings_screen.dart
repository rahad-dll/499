// lib/screens/dashboard/bookings_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../models/booking_model.dart';
import '../../services/booking_service.dart';
import '../../services/deleted_bookings_service.dart';
import '../../utils/app_toast.dart';
import '../../utils/currency_formatter.dart';
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

  // GET /bookings?status=... filter (null = all)
  _BookingFilter _filter = _BookingFilter.all;

  // GET /bookings?from&to — start-date range (null = any date)
  DateTimeRange? _range;

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
      final range = _range;
      final bookings = await _service.getAllBookings(
        statuses: _filter.statuses,
        // from = first day 00:00 (inclusive), to = day after the last day
        from: range == null
            ? null
            : DateTime(range.start.year, range.start.month, range.start.day),
        to: range == null
            ? null
            : DateTime(range.end.year, range.end.month, range.end.day)
                .add(const Duration(days: 1)),
      );
      if (!mounted) return;

      final filteredBookings = _deletedService.filterBookings(bookings);

      setState(() {
        _bookings = filteredBookings;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage =
            'Failed to load bookings: ${e.toString().replaceFirst('Exception: ', '')}';
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
    
    if (result == true) {
      _loadBookings();
    }
  }

  Future<void> _cancelBooking(BookingModel booking) async {
    if (booking.status == BookingStatus.cancelled) {
      showAppToast(context, 'This booking is already cancelled', color: Colors.orange);
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
      final updated = await _service.cancelBooking(booking.id);
      if (!mounted) return;
      showAppToast(
        context,
        updated.isRefunded
            ? 'Booking cancelled — payment refunded'
            : 'Booking cancelled successfully',
        color: const Color(0xFF22C55E),
      );
      _loadBookings();
    } catch (e) {
      if (!mounted) return;
      showAppToast(context, e.toString().replaceFirst('Exception: ', ''), color: Colors.red);
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
      if (!booking.canDelete) {
        if (!mounted) return false;
        showAppToast(
          context,
          'Cancel the booking first; only past or cancelled bookings can be removed',
          color: Colors.orange,
        );
        return false;
      }
      try {
        // Server only allows removing cancelled / finished bookings.
        await _service.deleteBooking(booking.id);
      } catch (e) {
        if (!mounted) return false;
        showAppToast(context, e.toString().replaceFirst('Exception: ', ''), color: Colors.red);
        return false;
      }
      _deletedService.addDeletedId(booking.id);

      if (!mounted) return false;
      setState(() {
        _bookings.removeWhere((b) => b.id == booking.id);
      });
      
      showAppToast(context, 'Booking removed from list', color: Color(0xFFE53E3E));
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
            onPressed: _isLoading ? null : _pickRange,
            icon: Icon(
              _range == null ? Icons.date_range_rounded : Icons.event_note_rounded,
              color: _range == null
                  ? (isDark ? Colors.white : Colors.black87)
                  : const Color(0xFF18D6C0),
            ),
            tooltip: 'Filter by date',
          ),
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
      body: Column(
        children: [
          _buildFilterBar(isDark),
          Expanded(child: _buildBody(isDark)),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(
        currentIndex: 1,
      ),
    );
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      // bookings can be made up to 30 days ahead
      lastDate: now.add(const Duration(days: 60)),
      initialDateRange: _range,
      helpText: 'Bookings starting between',
      saveText: 'Apply',
    );
    if (picked == null || !mounted) return;
    setState(() => _range = picked);
    _loadBookings();
  }

  void _clearRange() {
    if (_range == null || _isLoading) return;
    setState(() => _range = null);
    _loadBookings();
  }

  String _rangeText(DateTimeRange r) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    String d(DateTime x) => '${x.day} ${months[x.month - 1]}';
    final sameDay = r.start.year == r.end.year &&
        r.start.month == r.end.month &&
        r.start.day == r.end.day;
    return sameDay ? d(r.start) : '${d(r.start)} – ${d(r.end)}';
  }

  Widget _buildFilterBar(bool isDark) {
    final range = _range;
    final extra = range == null ? 0 : 1;
    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
        itemCount: _BookingFilter.values.length + extra,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          if (range != null && index == 0) {
            return InputChip(
              avatar: const Icon(Icons.event_rounded, size: 16, color: Colors.white),
              label: Text(_rangeText(range)),
              labelStyle: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
              backgroundColor: const Color(0xFF0AA6C4),
              deleteIconColor: Colors.white,
              side: BorderSide.none,
              onPressed: _pickRange,
              onDeleted: _clearRange,
            );
          }
          final i = index - extra;
          final f = _BookingFilter.values[i];
          final selected = f == _filter;
          return ChoiceChip(
            label: Text(f.label),
            selected: selected,
            showCheckmark: false,
            selectedColor: const Color(0xFF18D6C0),
            backgroundColor: isDark ? const Color(0xFF1A2740) : Colors.white,
            labelStyle: TextStyle(
              fontWeight: FontWeight.w600,
              color: selected
                  ? Colors.white
                  : (isDark ? Colors.grey[300] : Colors.grey[700]),
            ),
            side: BorderSide(
              color: selected
                  ? const Color(0xFF18D6C0)
                  : (isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0)),
            ),
            onSelected: (_) {
              if (selected || _isLoading) return;
              setState(() => _filter = f);
              _loadBookings();
            },
          );
        },
      ),
    );
  }

  Widget _buildBody(bool isDark) {
    return _isLoading
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
            (_range != null || _filter != _BookingFilter.all)
                ? 'No bookings match this filter'
                : 'No bookings yet',
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
      case BookingStatus.noShow:
        statusColor = const Color(0xFF64748B);
        statusText = 'No-show';
        statusIcon = Icons.event_busy_rounded;
        break;
    }
    if (booking.isParkedNow) {
      statusColor = const Color(0xFF2563EB);
      statusText = 'Parked';
      statusIcon = Icons.local_parking_rounded;
    }

    final canCancel = booking.canCancel;
    final canDelete = booking.canDelete;

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
                  // a tick instead of the money icon once it is paid
                  icon: booking.isPaid
                      ? Icons.verified_rounded
                      : Icons.attach_money_rounded,
                  label: formatTaka(booking.payableAmount),
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
                if (canDelete && !canCancel) ...[
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
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
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

/// Status filters of GET /bookings.
enum _BookingFilter { all, upcoming, completed, cancelled, noShow }

extension on _BookingFilter {
  String get label {
    switch (this) {
      case _BookingFilter.all:
        return 'All';
      case _BookingFilter.upcoming:
        return 'Upcoming';
      case _BookingFilter.completed:
        return 'Completed';
      case _BookingFilter.cancelled:
        return 'Cancelled';
      case _BookingFilter.noShow:
        return 'No-show';
    }
  }

  List<BookingStatus>? get statuses {
    switch (this) {
      case _BookingFilter.all:
        return null;
      case _BookingFilter.upcoming:
        return const [BookingStatus.confirmed, BookingStatus.pending];
      case _BookingFilter.completed:
        return const [BookingStatus.completed];
      case _BookingFilter.cancelled:
        return const [BookingStatus.cancelled];
      case _BookingFilter.noShow:
        return const [BookingStatus.noShow];
    }
  }
}
