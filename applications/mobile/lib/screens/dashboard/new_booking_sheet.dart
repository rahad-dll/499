// lib/screens/dashboard/new_booking_sheet.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../models/booking_model.dart';
import '../../models/parking_model.dart';
import '../../services/booking_service.dart';
import '../../utils/app_toast.dart';
import '../../utils/currency_formatter.dart';

const Color _kAccent = Color(0xFF18D6C0);

const List<String> _kWeekdayNames = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
];
const List<String> _kMonthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

Future<BookingModel?> showNewBookingSheet(
    BuildContext context, ParkingModel space) {
  return showModalBottomSheet<BookingModel>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _NewBookingSheet(space: space),
  );
}

class _NewBookingSheet extends StatefulWidget {
  final ParkingModel space;
  const _NewBookingSheet({required this.space});

  @override
  State<_NewBookingSheet> createState() => _NewBookingSheetState();
}

class _NewBookingSheetState extends State<_NewBookingSheet> {
  int _durationHours = 1;
  DateTime _scheduledAt = DateTime.now();
  final _plateController = TextEditingController();
  bool _isSaving = false;

  // Availability of THIS start time + duration (not "right now").
  int? _freeSlots; // null = unknown (not checked yet / check failed)
  bool _checking = false;
  int _checkSeq = 0; // ignores out-of-date responses

  @override
  void initState() {
    super.initState();
    // after the first frame so setState inside the check is safe
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _checkAvailability();
    });
  }

  Future<void> _checkAvailability() async {
    final seq = ++_checkSeq;
    setState(() => _checking = true);
    try {
      final count = await BookingService().getFreeSlotCount(
        spaceId: widget.space.id,
        from: _scheduledAt,
        durationHours: _durationHours,
      );
      if (!mounted || seq != _checkSeq) return;
      setState(() {
        _freeSlots = count;
        _checking = false;
      });
    } catch (_) {
      // Can't tell -> don't block; the server re-checks on confirm anyway.
      if (!mounted || seq != _checkSeq) return;
      setState(() {
        _freeSlots = null;
        _checking = false;
      });
    }
  }

  bool get _fullForThisTime => _freeSlots == 0;

  Widget _availabilityBanner(bool isDark) {
    if (_freeSlots == null) {
      return _checking
          ? Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Checking availability…',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            )
          : const SizedBox.shrink();
    }
    final full = _freeSlots == 0;
    final color = full ? Colors.red : const Color(0xFF22C55E);
    final text = full
        ? 'No slot is free for this time — it is already booked. '
            'Pick another time or a shorter duration; it may be free later.'
        : '$_freeSlots slot${_freeSlots == 1 ? '' : 's'} free for this time';
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            full ? Icons.event_busy_rounded : Icons.event_available_rounded,
            size: 18,
            color: color,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  double get _total {
    if (widget.space.rate == null) return 0;
    return widget.space.rate! * _durationHours;
  }

  bool get _hasRate => widget.space.rate != null;

  @override
  void dispose() {
    _plateController.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _scheduledAt,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (date == null || !mounted) return;
    
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledAt),
    );
    if (time == null) return;
    
    setState(() {
      _scheduledAt = DateTime(
        date.year, date.month, date.day, 
        time.hour, time.minute,
      );
    });
    _checkAvailability();
  }

  Future<void> _confirm() async {
    if (_scheduledAt.isBefore(DateTime.now().subtract(const Duration(minutes: 5)))) {
      showAppToast(context, 'Start time is in the past. Please pick a later time.', color: Colors.orange);
      return;
    }
    if (!_hasRate) {
      showAppToast(context, 'Rate information not available for this parking', color: Colors.orange);
      return;
    }

    if (_fullForThisTime) {
      showAppToast(
        context,
        'This time is already fully booked. Please choose another time.',
        color: Colors.orange,
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final booking = await BookingService().createBooking(
        space: widget.space,
        startTime: _scheduledAt,
        durationHours: _durationHours,
        vehiclePlate: _plateController.text.trim().isEmpty
            ? null
            : _plateController.text.trim(),
      );
      if (mounted) Navigator.pop(context, booking);
    } catch (e) {
      setState(() => _isSaving = false);
      if (mounted) {
        showAppToast(context, e.toString().replaceFirst('Exception: ', ''), color: Colors.red);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A2740) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Book ${widget.space.name}',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            
            Text(
              'Duration',
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [1, 2, 3, 4, 6, 8].map((h) {
                final selected = _durationHours == h;
                return ChoiceChip(
                  label: Text('${h}h'),
                  selected: selected,
                  selectedColor: const Color(0xFF18D6C0),
                  backgroundColor: isDark ? const Color(0xFF0F1728) : Colors.grey[100],
                  labelStyle: TextStyle(
                    color: selected
                        ? Colors.white
                        : (isDark ? Colors.grey[300] : Colors.grey[700]),
                  ),
                  onSelected: (_) {
                    setState(() => _durationHours = h);
                    _checkAvailability();
                  },
                );
              }).toList(),
            ),
            
            const SizedBox(height: 16),
            
            Row(
              children: [
                Text(
                  'Scheduled Time',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                const SizedBox(width: 6),
                Icon(Icons.edit_rounded,
                    size: 12, color: isDark ? Colors.grey[500] : Colors.grey[500]),
                const SizedBox(width: 3),
                Text(
                  'tap to change',
                  style: TextStyle(
                    fontSize: 11,
                    fontStyle: FontStyle.italic,
                    color: isDark ? Colors.grey[500] : Colors.grey[500],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Dashed-look, teal-accented "editable field" — visually distinct
            // from the read-only rows below it so it's obvious this can be
            // tapped to reschedule, not just a static summary.
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _pickDateTime,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? _kAccent.withValues(alpha: 0.08)
                        : _kAccent.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _kAccent.withValues(alpha: 0.5),
                      width: 1.4,
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: _kAccent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.event_rounded,
                            size: 18, color: _kAccent),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${_kWeekdayNames[_scheduledAt.weekday - 1]}, '
                              '${_scheduledAt.day} ${_kMonthNames[_scheduledAt.month - 1]} '
                              '${_scheduledAt.year}',
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              TimeOfDay.fromDateTime(_scheduledAt).format(context),
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: _kAccent,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                        decoration: BoxDecoration(
                          color: _kAccent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.edit_rounded, size: 12, color: _kAccent),
                            SizedBox(width: 4),
                            Text(
                              'Edit',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: _kAccent,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            TextField(
              controller: _plateController,
              style: TextStyle(color: isDark ? Colors.white : Colors.black87),
              decoration: InputDecoration(
                labelText: 'Vehicle plate (optional)',
                labelStyle: TextStyle(
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                filled: true,
                fillColor: isDark ? const Color(0xFF0F1728) : Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            
            const SizedBox(height: 20),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Rate',
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                Text(
                  _hasRate ? formatTakaPerHour(widget.space.rate!) : 'N/A',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _hasRate ? const Color(0xFF18D6C0) : Colors.grey,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total',
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                Text(
                  _hasRate ? formatTaka(_total) : 'N/A',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: _hasRate ? const Color(0xFF18D6C0) : Colors.grey,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),

            _availabilityBanner(isDark),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_isSaving || !_hasRate || _fullForThisTime)
                    ? null
                    : _confirm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF18D6C0),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        !_hasRate
                            ? 'Rate Unavailable'
                            : (_fullForThisTime
                                ? 'Fully booked for this time'
                                : 'Confirm Booking'),
                      ),
              ),
            ),
            if (!_hasRate)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Rate information not available for this parking',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}