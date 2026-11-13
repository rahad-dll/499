// lib/screens/dashboard/booking_details_screen.dart
//
// One booking: price, payment, timeline and every driver action the
// backend supports:
//   PATCH  /bookings/{id}/cancel     cancel (paid → refunded)
//   POST   /bookings/{id}/check-in   QR code or GPS within 200 m
//   POST   /bookings/{id}/check-out  completes, overstay charged
//   POST   /bookings/{id}/extend     more hours on the same slot
//   POST   /payments/initiate (+ dummy gateway) via the payment sheet
//   DELETE /bookings/{id}            remove from history
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../models/booking_model.dart';
import '../../models/payment_model.dart';
import '../../services/authed_http.dart';
import '../../services/booking_service.dart';
import '../../services/deleted_bookings_service.dart';
import '../../services/location_service.dart';
import '../../utils/app_toast.dart';
import '../../utils/currency_formatter.dart';
import '../../widgets/dashboard/payment_sheet.dart';

const Color _kAccent = Color(0xFF18D6C0);
const Color _kGreen = Color(0xFF22C55E);

class BookingDetailsScreen extends StatefulWidget {
  final BookingModel booking;
  const BookingDetailsScreen({super.key, required this.booking});

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  final _service = BookingService();
  final _deletedService = DeletedBookingsService();

  late BookingModel _booking;
  bool _isBusy = false;
  String _busyLabel = '';
  bool _isDeleted = false;
  // true once this screen changed the booking, so the list behind us knows
  // to reload when we pop.
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
    if (_deletedService.isDeleted(_booking.id)) {
      _isDeleted = true;
    }
    _refreshFromServer();
  }

  String _errorText(Object e) => e.toString().replaceFirst('Exception: ', '');

  /// GET /bookings/{id} — latest status, payment and check-in times.
  /// Fails silently: the list data stays on screen.
  Future<void> _refreshFromServer() async {
    if (_booking.id.isEmpty || _isDeleted) return;
    try {
      final fresh = await _service.getBooking(_booking.id);
      if (!mounted) return;
      setState(() => _booking = _booking.mergeFresh(fresh));
    } catch (_) {
      // keep showing what the list gave us
    }
  }

  /// Runs one server action with a busy overlay and a readable error.
  Future<void> _run(
    String label,
    Future<BookingModel> Function() action, {
    String? successMessage,
    String Function(BookingModel updated)? successBuilder,
  }) async {
    setState(() {
      _isBusy = true;
      _busyLabel = label;
    });
    try {
      final updated = await action();
      if (!mounted) return;
      setState(() {
        _booking = _booking.mergeFresh(updated);
        _isBusy = false;
        _changed = true;
      });
      final msg = successBuilder != null ? successBuilder(updated) : successMessage;
      if (msg != null) showAppToast(context, msg, color: _kGreen);
      // pull the full copy (payment block etc.)
      _refreshFromServer();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isBusy = false);
      showAppToast(context, _errorText(e), color: Colors.red);
      // server state may have moved on (e.g. 409 already checked in)
      if (e is ApiException && e.isConflict) _refreshFromServer();
    }
  }

  (Color, String, IconData) _statusVisual(BookingModel b) {
    if (b.isParkedNow) {
      return (const Color(0xFF2563EB), 'Parked', Icons.local_parking_rounded);
    }
    switch (b.status) {
      case BookingStatus.confirmed:
        return (_kGreen, 'Confirmed', Icons.check_circle);
      case BookingStatus.pending:
        return (const Color(0xFFF59E0B), 'Pending', Icons.pending);
      case BookingStatus.active:
        return (const Color(0xFF2563EB), 'Active', Icons.play_circle);
      case BookingStatus.completed:
        return (const Color(0xFF8B5CF6), 'Completed', Icons.task_alt);
      case BookingStatus.cancelled:
        return (Colors.red, 'Cancelled', Icons.cancel);
      case BookingStatus.noShow:
        return (const Color(0xFF64748B), 'No-show', Icons.event_busy_rounded);
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  Future<bool> _confirm({
    required String title,
    required String message,
    required String confirmText,
    Color confirmColor = Colors.red,
    IconData icon = Icons.warning_amber_rounded,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(icon, color: confirmColor, size: 28),
            const SizedBox(width: 10),
            Expanded(child: Text(title)),
          ],
        ),
        content: Text(message, style: const TextStyle(fontSize: 14)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not now', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: confirmColor),
            child: Text(confirmText, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    return result == true;
  }

  Future<void> _cancelBooking() async {
    if (_booking.status == BookingStatus.cancelled) {
      showAppToast(context, 'This booking is already cancelled', color: Colors.orange);
      return;
    }
    final ok = await _confirm(
      title: 'Cancel booking?',
      message: _booking.isPaid
          ? 'This booking will be cancelled and the payment of '
              '${formatTaka(_booking.payableAmount)} refunded in full.'
          : 'This booking will be marked as cancelled. This action cannot be undone.',
      confirmText: 'Cancel booking',
    );
    if (!ok || !mounted) return;
    await _run(
      'Cancelling…',
      () => _service.cancelBooking(_booking.id),
      successBuilder: (b) => b.isRefunded
          ? 'Booking cancelled — payment refunded'
          : 'Booking cancelled successfully',
    );
  }

  Future<void> _checkIn() async {
    if (!_booking.isCheckInOpen) {
      showAppToast(
        context,
        'Check-in opens at ${_formatTime(_booking.checkInOpensAt)} '
        '(15 minutes before the start).',
        color: Colors.orange,
      );
      return;
    }

    setState(() {
      _isBusy = true;
      _busyLabel = 'Getting your location…';
    });

    double? lat;
    double? lng;
    try {
      final pos = await LocationService().getCurrentLocation();
      lat = pos.latitude;
      lng = pos.longitude;
    } catch (_) {
      // no GPS → the slot QR code is the only way
    }
    if (!mounted) return;

    if (lat == null || lng == null) {
      setState(() => _isBusy = false);
      final code = await _askQrCode(
        'Location is not available. Enter the code printed on the QR '
        'sticker of slot ${_slotText()} to check in.',
      );
      if (code == null || !mounted) return;
      await _run(
        'Checking in…',
        () => _service.checkIn(_booking.id, qrCode: code),
        successMessage: 'Checked in. Enjoy your parking!',
      );
      return;
    }

    setState(() => _busyLabel = 'Checking in…');
    try {
      final updated = await _service.checkIn(
        _booking.id,
        latitude: lat,
        longitude: lng,
      );
      if (!mounted) return;
      setState(() {
        _booking = _booking.mergeFresh(updated);
        _isBusy = false;
        _changed = true;
      });
      showAppToast(context, 'Checked in. Enjoy your parking!', color: _kGreen);
      _refreshFromServer();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isBusy = false);
      final message = _errorText(e);

      // Slot has a QR sticker → ask for the code and try again.
      if (message.toLowerCase().contains('qr')) {
        final code = await _askQrCode(
          'This slot has a QR sticker. Enter the code printed on it '
          '(slot ${_slotText()}).',
        );
        if (code == null || !mounted) return;
        await _run(
          'Checking in…',
          () => _service.checkIn(
            _booking.id,
            qrCode: code,
            latitude: lat,
            longitude: lng,
          ),
          successMessage: 'Checked in. Enjoy your parking!',
        );
        return;
      }

      showAppToast(context, message, color: Colors.red);
      if (e is ApiException && e.isConflict) _refreshFromServer();
    }
  }

  Future<String?> _askQrCode(String message) async {
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.qr_code_2_rounded, color: _kAccent, size: 28),
            SizedBox(width: 10),
            Expanded(child: Text('Slot QR code')),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message, style: const TextStyle(fontSize: 13.5)),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              maxLength: 64,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                hintText: 'e.g. a1b2c3d4e5f6',
                counterText: '',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onSubmitted: (v) => Navigator.pop(context, v.trim()),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            style: TextButton.styleFrom(foregroundColor: _kAccent),
            child: const Text('Check in', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    // The controller is not disposed here on purpose: the dialog's closing
    // animation can still read it for a few frames.
    if (code == null || code.isEmpty) return null;
    return code;
  }

  Future<void> _checkOut() async {
    final isLate = DateTime.now().isAfter(
      _booking.endTime.add(const Duration(minutes: 10)),
    );
    final ok = await _confirm(
      title: 'Check out now?',
      message: isLate
          ? 'You are past the booked end time. Time after the 10-minute grace '
              'is charged per started hour at ${formatTakaPerHour(_booking.pricePerHour)}.'
          : 'This completes the booking and frees the slot.',
      confirmText: 'Check out',
      confirmColor: _kAccent,
      icon: Icons.logout_rounded,
    );
    if (!ok || !mounted) return;
    await _run(
      'Checking out…',
      () => _service.checkOut(_booking.id),
      successBuilder: (b) => b.overstayHours > 0
          ? 'Checked out. Overstay ${b.overstayHours}h: '
              '+${formatTaka(b.overstayAmount)}'
          : 'Checked out. Thanks for parking with us!',
    );
  }

  Future<void> _extend() async {
    final max = _booking.maxExtraHours;
    if (max < 1) {
      showAppToast(
        context,
        'A booking can last at most ${BookingModel.maxTotalHours} hours.',
        color: Colors.orange,
      );
      return;
    }

    var value = 1;
    final hours = await showDialog<int>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocal) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Row(
              children: [
                Icon(Icons.more_time_rounded, color: _kAccent, size: 28),
                SizedBox(width: 10),
                Expanded(child: Text('Extend booking')),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Add hours on the same slot (${_slotText()}). It works only if '
                  'nobody has booked the slot right after you.',
                  style: const TextStyle(fontSize: 13.5),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton.filledTonal(
                      onPressed: value > 1 ? () => setLocal(() => value--) : null,
                      icon: const Icon(Icons.remove_rounded),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Text(
                        '$value h',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                      ),
                    ),
                    IconButton.filledTonal(
                      onPressed: value < max ? () => setLocal(() => value++) : null,
                      icon: const Icon(Icons.add_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'New end: ${_formatTime(_booking.endTime.add(Duration(hours: value)))}'
                  '${_booking.pricePerHour > 0 ? ' · about ${formatTaka(_booking.pricePerHour * value)}' : ''}',
                  style: TextStyle(fontSize: 12.5, color: Colors.grey[600]),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, value),
                style: TextButton.styleFrom(foregroundColor: _kAccent),
                child: const Text('Extend', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        );
      },
    );
    if (hours == null || !mounted) return;

    await _run(
      'Extending…',
      () => _service.extend(_booking.id, hours),
      successBuilder: (b) =>
          'Extended by ${hours}h — now ends at ${_formatTime(b.endTime)}',
    );
  }

  Future<void> _pay() async {
    final result = await showPaymentSheet(context, _booking);
    if (!mounted) return;
    // the sheet may have created / settled a payment even if closed early
    _changed = true;
    if (result != null) {
      setState(() {
        _booking = _booking.copyWith(
          paymentStatus: result.status,
          payment: BookingPaymentInfo(
            method: result.method,
            status: result.status,
            trxId: result.trxId,
            paidAt: result.paidAt,
            refundAmountUnit: result.refundAmountUnit,
          ),
        );
      });
    }
    await _refreshFromServer();
  }

  Future<void> _deleteBooking() async {
    final ok = await _confirm(
      title: 'Delete booking?',
      message: 'This will remove this booking from your list.',
      confirmText: 'Delete',
      icon: Icons.delete_forever_rounded,
    );
    if (!ok || !mounted) return;

    setState(() {
      _isBusy = true;
      _busyLabel = 'Deleting…';
    });

    try {
      // Server decides: only cancelled / finished bookings can be removed.
      await _service.deleteBooking(_booking.id);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isBusy = false);
      showAppToast(context, _errorText(e), color: Colors.red);
      return;
    }
    _deletedService.addDeletedId(_booking.id);

    if (!mounted) return;
    setState(() {
      _isDeleted = true;
      _isBusy = false;
      _changed = true;
    });

    showAppToast(context, 'Booking removed from list', color: const Color(0xFFE53E3E));

    await Future.delayed(const Duration(milliseconds: 300));
    if (mounted) Navigator.pop(context, true);
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  String _formatDate(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  String _formatTime(DateTime date) {
    final hour12 = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    final ampm = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour12:$minute $ampm';
  }

  String _formatDateTime(DateTime date) => '${_formatDate(date)} at ${_formatTime(date)}';

  String _slotText() {
    final l = _booking.slotLabel.trim();
    return l.isEmpty ? 'your slot' : l;
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final (statusColor, statusText, statusIcon) = _statusVisual(_booking);

    final bgColor = isDark ? const Color(0xFF0A0E1A) : const Color(0xFFF0F4F8);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop || _isBusy) return;
        Navigator.pop(context, _changed);
      },
      child: Scaffold(
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
            onPressed: _isBusy ? null : () => Navigator.pop(context, _changed),
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.black.withValues(alpha: 0.05),
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
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
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
        body: Stack(
          children: [
            AbsorbPointer(
              absorbing: _isBusy,
              child: _isDeleted ? _buildDeleted(isDark) : _buildContent(isDark),
            ),
            if (_isBusy)
              Positioned.fill(
                child: Container(
                  color: Colors.black.withValues(alpha: 0.25),
                  alignment: Alignment.center,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A2340) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: _kAccent),
                        ),
                        const SizedBox(width: 14),
                        Text(
                          _busyLabel.isEmpty ? 'Please wait…' : _busyLabel,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
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

  Widget _buildDeleted(bool isDark) {
    return Center(
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
              backgroundColor: _kAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
            ),
            child: const Text('Go Back'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    final b = _booking;
    final cardColor = isDark ? const Color(0xFF1A2340) : Colors.white;
    final borderColor = isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0);

    return RefreshIndicator(
      onRefresh: _refreshFromServer,
      color: _kAccent,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHero(b),
            const SizedBox(height: 20),

            if (b.isParkedNow) ...[
              _banner(
                color: const Color(0xFF2563EB),
                icon: Icons.local_parking_rounded,
                text: 'You are parked since ${_formatTime(b.arrivedAt!)}. '
                    'Booked until ${_formatTime(b.endTime)} — check out when you leave.',
              ),
              const SizedBox(height: 12),
            ] else if (b.canCheckIn && !b.isCheckInOpen) ...[
              _banner(
                color: const Color(0xFFF59E0B),
                icon: Icons.schedule_rounded,
                text: 'Check-in opens at ${_formatDateTime(b.checkInOpensAt)} '
                    '(15 minutes before the start).',
              ),
              const SizedBox(height: 12),
            ],

            // Price
            Row(
              children: [
                Expanded(
                  child: _buildInfoTile(
                    isDark: isDark,
                    icon: Icons.attach_money_rounded,
                    label: 'Hourly Rate',
                    value: formatTaka(b.pricePerHour),
                    iconBg: _kAccent,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildInfoTile(
                    isDark: isDark,
                    icon: Icons.payments_rounded,
                    label: 'Total Amount',
                    value: formatTaka(b.payableAmount),
                    iconBg: const Color(0xFF8B5CF6),
                  ),
                ),
              ],
            ),
            if (b.hasDiscount || b.overstayUnit > 0) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (b.hasDiscount) ...[
                    Expanded(
                      child: _buildInfoTile(
                        isDark: isDark,
                        icon: Icons.local_offer_rounded,
                        label: 'Discount',
                        value: '-${formatTaka(b.discount)}',
                        iconBg: _kGreen,
                      ),
                    ),
                  ],
                  if (b.hasDiscount && b.overstayUnit > 0) const SizedBox(width: 12),
                  if (b.overstayUnit > 0)
                    Expanded(
                      child: _buildInfoTile(
                        isDark: isDark,
                        icon: Icons.timer_off_rounded,
                        label: 'Overstay (${b.overstayHours}h)',
                        value: '+${formatTaka(b.overstayAmount)}',
                        iconBg: Colors.orange,
                      ),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 12),

            // Slot & vehicle
            Row(
              children: [
                Expanded(
                  child: _buildInfoTile(
                    isDark: isDark,
                    icon: Icons.event_seat_rounded,
                    label: 'Slot',
                    value: b.slotLabel.isNotEmpty ? b.slotLabel : 'Auto-assigned',
                    iconBg: const Color(0xFFF59E0B),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildInfoTile(
                    isDark: isDark,
                    icon: Icons.directions_car_rounded,
                    label: 'Vehicle Plate',
                    value: b.vehiclePlate ?? 'Not specified',
                    iconBg: const Color(0xFF3B82F6),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            _buildPaymentCard(isDark, cardColor, borderColor),
            const SizedBox(height: 12),

            _buildTimeline(isDark, cardColor, borderColor),
            const SizedBox(height: 20),

            _buildBookingId(isDark, borderColor),
            const SizedBox(height: 20),

            ..._buildActions(isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildHero(BookingModel b) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _kAccent,
            _kAccent.withValues(alpha: 0.7),
            const Color(0xFF0AA6C4),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _kAccent.withValues(alpha: 0.3),
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
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.local_parking_rounded, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      b.spaceName,
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
                        const Icon(Icons.location_on_rounded, color: Colors.white, size: 14),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            b.spaceAddress,
                            style: const TextStyle(fontSize: 13, color: Colors.white70),
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
                value: _formatDate(b.scheduledAt),
              ),
              Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.2)),
              _buildHeroStat(
                icon: Icons.access_time_rounded,
                label: 'Time',
                value: _formatTime(b.scheduledAt),
              ),
              Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.2)),
              _buildHeroStat(
                icon: Icons.timelapse_rounded,
                label: b.wasExtended ? 'Duration (ext.)' : 'Duration',
                value: '${b.bookedHours > 0 ? b.bookedHours : b.durationHours}h',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _banner({required Color color, required IconData icon, required String text}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentCard(bool isDark, Color cardColor, Color borderColor) {
    final b = _booking;
    final status = b.payment?.status ?? b.paymentStatus ?? '';
    final Color color;
    switch (status) {
      case 'paid':
        color = _kGreen;
        break;
      case 'pending':
        color = Colors.orange;
        break;
      case 'failed':
        color = Colors.red;
        break;
      case 'refunded':
        color = const Color(0xFF3B82F6);
        break;
      default:
        color = Colors.grey;
    }
    final muted = isDark ? Colors.grey[400] : Colors.grey[600];
    final text = isDark ? Colors.white : Colors.black87;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.account_balance_wallet_rounded, color: _kAccent, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Payment',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: text),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  paymentStatusLabel(status),
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
                ),
              ),
            ],
          ),
          if (b.payment != null) ...[
            const SizedBox(height: 10),
            _kv('Method', paymentMethodLabel(b.payment!.method), muted, text),
            if (b.payment!.trxId != null) _kv('Transaction', b.payment!.trxId!, muted, text),
            if (b.payment!.paidAt != null)
              _kv('Paid at', _formatDateTime(b.payment!.paidAt!), muted, text),
            if ((b.payment!.refundAmountUnit ?? 0) > 0)
              _kv('Refunded', formatTaka(b.payment!.refundAmountUnit! / 100.0), muted, text),
          ],
          if (status == 'pending' && b.payment?.method == 'cash') ...[
            const SizedBox(height: 8),
            Text(
              'Pay cash at the parking. It stays pending until collected.',
              style: TextStyle(fontSize: 12, color: muted),
            ),
          ],
          if (b.canPay) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isBusy ? null : _pay,
                icon: const Icon(Icons.payment_rounded),
                label: Text(
                  status == 'pending' || status == 'failed'
                      ? 'Pay ${formatTaka(b.payableAmount)} again'
                      : 'Pay ${formatTaka(b.payableAmount)}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kAccent,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _kv(String k, String v, Color? muted, Color text) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(k, style: TextStyle(fontSize: 12.5, color: muted)),
          ),
          Expanded(
            child: Text(
              v,
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: text),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline(bool isDark, Color cardColor, Color borderColor) {
    final b = _booking;
    final items = <({IconData icon, String label, String value})>[
      (icon: Icons.event_available_rounded, label: 'Created', value: _formatDateTime(b.createdAt)),
      (icon: Icons.schedule_rounded, label: 'Scheduled', value: _formatDateTime(b.scheduledAt)),
      (
        icon: Icons.flag_rounded,
        label: b.wasExtended ? 'Ends At (extended)' : 'Ends At',
        value: _formatDateTime(b.endTime),
      ),
      if (b.arrivedAt != null)
        (icon: Icons.login_rounded, label: 'Checked in', value: _formatDateTime(b.arrivedAt!)),
      if (b.departedAt != null)
        (icon: Icons.logout_rounded, label: 'Checked out', value: _formatDateTime(b.departedAt!)),
      if (b.cancellationReason != null)
        (icon: Icons.info_outline_rounded, label: 'Cancellation Reason', value: b.cancellationReason!),
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.transparent : Colors.grey.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.timeline_rounded, color: _kAccent, size: 20),
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
          for (var i = 0; i < items.length; i++)
            _buildTimelineItem(
              isDark: isDark,
              icon: items[i].icon,
              label: items[i].label,
              value: items[i].value,
              isLast: i == items.length - 1,
            ),
        ],
      ),
    );
  }

  Widget _buildBookingId(bool isDark, Color borderColor) {
    return InkWell(
      onTap: () async {
        await Clipboard.setData(ClipboardData(text: _booking.id));
        if (mounted) showAppToast(context, 'Booking ID copied');
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A2340) : Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_rounded,
                size: 16, color: isDark ? Colors.grey[400] : Colors.grey[600]),
            const SizedBox(width: 8),
            Text(
              'Booking ID: ',
              style: TextStyle(fontSize: 13, color: isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
            Flexible(
              child: Text(
                _booking.id,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
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
    );
  }

  List<Widget> _buildActions(bool isDark) {
    final b = _booking;
    final buttons = <Widget>[];

    void add(Widget w) {
      if (buttons.isNotEmpty) buttons.add(const SizedBox(height: 10));
      buttons.add(SizedBox(width: double.infinity, child: w));
    }

    ButtonStyle filled(Color c) => ElevatedButton.styleFrom(
          backgroundColor: c,
          foregroundColor: Colors.white,
          disabledBackgroundColor: c.withValues(alpha: 0.35),
          disabledForegroundColor: Colors.white70,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 0,
        );

    ButtonStyle outlined(Color c) => OutlinedButton.styleFrom(
          foregroundColor: c,
          side: BorderSide(color: c, width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        );

    if (b.canCheckIn) {
      add(ElevatedButton.icon(
        onPressed: _isBusy ? null : _checkIn,
        icon: const Icon(Icons.login_rounded),
        label: Text(
          b.isCheckInOpen ? 'Check in' : 'Check in (opens ${_formatTime(b.checkInOpensAt)})',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        style: filled(b.isCheckInOpen ? _kGreen : Colors.grey),
      ));
    }
    if (b.canCheckOut) {
      add(ElevatedButton.icon(
        onPressed: _isBusy ? null : _checkOut,
        icon: const Icon(Icons.logout_rounded),
        label: const Text('Check out', style: TextStyle(fontWeight: FontWeight.w700)),
        style: filled(const Color(0xFF2563EB)),
      ));
    }
    if (b.canExtend) {
      add(OutlinedButton.icon(
        onPressed: _isBusy ? null : _extend,
        icon: const Icon(Icons.more_time_rounded),
        label: const Text('Extend booking', style: TextStyle(fontWeight: FontWeight.w700)),
        style: outlined(_kAccent),
      ));
    }
    if (b.canCancel) {
      add(OutlinedButton.icon(
        onPressed: _isBusy ? null : _cancelBooking,
        icon: const Icon(Icons.cancel_outlined),
        label: const Text('Cancel Booking', style: TextStyle(fontWeight: FontWeight.w700)),
        style: outlined(Colors.red),
      ));
    }
    if (b.canDelete) {
      add(ElevatedButton.icon(
        onPressed: _isBusy ? null : _deleteBooking,
        icon: const Icon(Icons.delete_outline_rounded),
        label: const Text('Delete Booking', style: TextStyle(fontWeight: FontWeight.w600)),
        style: filled(Colors.red),
      ));
      if (b.status == BookingStatus.cancelled) {
        buttons.add(Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            'This booking is cancelled. You can delete it from your list.',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
              fontStyle: FontStyle.italic,
            ),
            textAlign: TextAlign.center,
          ),
        ));
      }
    }
    return buttons;
  }

  Widget _buildHeroStat({required IconData icon, required String label, required String value}) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w500),
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
              color: iconBg.withValues(alpha: 0.15),
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
                  color: _kAccent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: _kAccent, size: 16),
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
