// lib/screens/dashboard/new_booking_sheet.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../models/booking_model.dart';
import '../../models/booking_quote_model.dart';
import '../../models/parking_model.dart';
import '../../models/slot_model.dart';
import '../../services/authed_http.dart';
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

  // Availability of THIS start time + duration (not "right now"):
  // GET /spaces/{id}/slots?from&to → slots nobody has booked in the window.
  List<ParkingSlot>? _slots; // null = unknown (not checked yet / check failed)
  String? _selectedSlotId; // null = auto pick
  String? _vehicleFilter; // null = any vehicle type
  bool _checking = false;
  int _checkSeq = 0; // ignores out-of-date responses

  // POST /bookings/quote — server-calculated price for this time + duration.
  BookingQuote? _quote;
  bool _quoteFull = false; // quote answered 409 = nothing free for this time

  @override
  void initState() {
    super.initState();
    // after the first frame so setState inside the check is safe
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _checkAvailability();
    });
  }

  /// Start within 15 minutes → the camera "occupied" flag matters too
  /// (same rule as the backend).
  bool get _imminent =>
      _scheduledAt.difference(DateTime.now()) <= const Duration(minutes: 15);

  /// Free slots that fit the chosen vehicle type and can really be booked.
  List<ParkingSlot>? get _visibleSlots {
    final slots = _slots;
    if (slots == null) return null;
    final imminent = _imminent;
    return slots
        .where((s) => s.fits(_vehicleFilter) && !(imminent && s.occupied))
        .toList();
  }

  int? get _freeSlots => _visibleSlots?.length;

  ParkingSlot? get _selectedSlot {
    final id = _selectedSlotId;
    final slots = _slots;
    if (id == null || slots == null) return null;
    for (final s in slots) {
      if (s.id == id) return s;
    }
    return null;
  }

  /// slot_id sent to quote / booking: the chosen slot; with a vehicle filter
  /// and "Auto", the first slot that fits; otherwise null (server picks).
  String? get _effectiveSlotId {
    if (_selectedSlotId != null) return _selectedSlotId;
    if (_vehicleFilter != null) {
      final visible = _visibleSlots;
      if (visible != null && visible.isNotEmpty) return visible.first.id;
    }
    return null;
  }

  Future<void> _checkAvailability() async {
    final seq = ++_checkSeq;
    setState(() {
      _checking = true;
      _quote = null;
      _quoteFull = false;
    });

    List<ParkingSlot>? slots;
    try {
      slots = await BookingService().getFreeSlots(
        spaceId: widget.space.id,
        from: _scheduledAt,
        durationHours: _durationHours,
      );
    } catch (_) {
      // Unknown availability must not block booking; the server re-checks.
    }
    if (!mounted || seq != _checkSeq) return;

    // Keep the chosen slot only if it is still free for the new time.
    var selected = _selectedSlotId;
    var dropped = false;
    if (selected != null && slots != null && !slots.any((s) => s.id == selected)) {
      selected = null;
      dropped = true;
    }
    setState(() {
      _slots = slots;
      _selectedSlotId = selected;
    });
    if (dropped) {
      showAppToast(
        context,
        'Your chosen slot is booked for this time — a slot will be picked for you.',
        color: Colors.orange,
      );
    }
    await _requote(seq);
  }

  /// POST /bookings/quote for the current time, duration and slot choice.
  Future<void> _requote([int? seqArg]) async {
    final seq = seqArg ?? ++_checkSeq;
    if (seqArg == null) {
      setState(() {
        _checking = true;
        _quote = null;
        _quoteFull = false;
      });
    }

    final slotId = _effectiveSlotId;
    BookingQuote? quote;
    var full = false;
    try {
      quote = await BookingService().getQuote(
        spaceId: widget.space.id,
        scheduledAt: _scheduledAt,
        durationHours: _durationHours,
        slotId: slotId,
      );
    } on QuoteException catch (e) {
      if (e.isSlotUnavailable) full = true;
    } catch (_) {
      // price stays an estimate; booking still works
    }
    if (!mounted || seq != _checkSeq) return;

    // The chosen slot was taken meanwhile → back to auto pick and re-price.
    if (full && _selectedSlotId != null) {
      setState(() => _selectedSlotId = null);
      showAppToast(
        context,
        'That slot was just taken — a slot will be picked for you.',
        color: Colors.orange,
      );
      await _checkAvailability();
      return;
    }

    setState(() {
      _quote = quote;
      _quoteFull = full;
      _checking = false;
    });
  }

  void _selectSlot(String? slotId) {
    if (_selectedSlotId == slotId) return;
    setState(() => _selectedSlotId = slotId);
    _requote();
  }

  void _selectVehicle(String? type) {
    if (_vehicleFilter == type) return;
    setState(() {
      _vehicleFilter = type;
      final chosen = _selectedSlot;
      if (chosen != null && !chosen.fits(type)) _selectedSlotId = null;
    });
    _requote();
  }

  bool get _fullForThisTime => _freeSlots == 0 || _quoteFull;

  Widget _availabilityBanner(bool isDark) {
    if (_freeSlots == null && !_quoteFull) {
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
    final full = _fullForThisTime;
    final color = full ? Colors.red : const Color(0xFF22C55E);
    final text = full
        ? 'No slot is free for this time — it is already booked. '
            'Pick another time or a shorter duration; it may be free later.'
        : '$_freeSlots slot${_freeSlots == 1 ? '' : 's'} free for this time'
            '${_vehicleFilter != null ? ' (${vehicleTypeLabel(_vehicleFilter!)})' : ''}';
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

  // Server quote wins; the space's own rate is only a fallback estimate.
  double get _total {
    if (_quote != null) return _quote!.totalPrice;
    if (widget.space.rate == null) return 0;
    return widget.space.rate! * _durationHours;
  }

  double? get _hourlyRate => _quote?.hourlyRate ?? widget.space.rate;

  bool get _hasRate => _hourlyRate != null;

  String? get _rateSourceLabel {
    switch (_quote?.rateSource) {
      case QuoteRateSource.slot:
        return 'Slot price';
      case QuoteRateSource.vehicle:
        return 'Vehicle rate';
      case QuoteRateSource.lot:
        return 'Standard lot rate';
      default:
        return null;
    }
  }

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
    if (time == null || !mounted) return;

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
        slotId: _effectiveSlotId,
        vehiclePlate: _plateController.text.trim().isEmpty
            ? null
            : _plateController.text.trim(),
      );
      if (mounted) Navigator.pop(context, booking);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      showAppToast(context, e.toString().replaceFirst('Exception: ', ''), color: Colors.red);
      // 409 = the slot / time was taken meanwhile → refresh the picker
      if (e is ApiException && e.isConflict) _checkAvailability();
    }
  }

  // Backend labels can already be "slot 1" -> don't print "Slot slot 1".
  String _slotText(String label) {
    final l = label.trim();
    return l.toLowerCase().startsWith('slot') ? l : 'Slot $l';
  }

  Widget _priceRow(
    bool isDark,
    String label,
    String value, {
    Color? valueColor,
    double valueSize = 16,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: valueSize,
              fontWeight: FontWeight.bold,
              color: valueColor ?? _kAccent,
            ),
          ),
        ],
      ),
    );
  }

  Widget _priceSection(bool isDark) {
    final quote = _quote;
    final rate = _hourlyRate;
    final muted = isDark ? Colors.grey[500] : Colors.grey[500];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _priceRow(
          isDark,
          'Rate',
          rate != null ? formatTakaPerHour(rate) : 'N/A',
          valueColor: rate != null ? _kAccent : Colors.grey,
        ),
        if (quote != null && quote.hasDiscount) ...[
          _priceRow(
            isDark,
            'Subtotal',
            formatTaka(quote.baseAmount),
            valueColor: isDark ? Colors.white : Colors.black87,
            valueSize: 14,
          ),
          _priceRow(
            isDark,
            'Discount',
            '-${formatTaka(quote.discount)}',
            valueColor: const Color(0xFF22C55E),
            valueSize: 14,
          ),
        ],
        _priceRow(
          isDark,
          'Total',
          _hasRate ? formatTaka(_total) : 'N/A',
          valueColor: _hasRate ? _kAccent : Colors.grey,
          valueSize: 20,
        ),
        if (_checking && quote == null)
          Text(
            'Getting exact price…',
            style: TextStyle(
              fontSize: 11.5,
              fontStyle: FontStyle.italic,
              color: muted,
            ),
          )
        else if (quote != null)
          Text(
            [
              if (quote.slotLabel.isNotEmpty) _slotText(quote.slotLabel),
              if (_rateSourceLabel != null) _rateSourceLabel!,
              'final price is confirmed when you book',
            ].join(' · '),
            style: TextStyle(
              fontSize: 11.5,
              fontStyle: FontStyle.italic,
              color: muted,
            ),
          )
        else if (_hasRate)
          Text(
            'Estimated price — exact price is calculated when you book',
            style: TextStyle(
              fontSize: 11.5,
              fontStyle: FontStyle.italic,
              color: muted,
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.92,
        ),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A2740) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        // scrolls when the slot picker makes the sheet taller than the screen
        child: SingleChildScrollView(
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
            
            const SizedBox(height: 16),

            _slotSection(isDark),

            const SizedBox(height: 20),

            _priceSection(isDark),
            
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
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Slot picker
  // ---------------------------------------------------------------------------

  Widget _slotSection(bool isDark) {
    final label = isDark ? Colors.grey[400] : Colors.grey[600];
    final slots = _slots;

    if (slots == null) {
      if (_checking) return const SizedBox.shrink();
      return Text(
        'Slot list is not available right now — a free slot will be picked for you.',
        style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: label),
      );
    }

    // vehicle types offered by the free slots
    final types = <String>{};
    for (final s in slots) {
      types.addAll(s.vehicleTypes);
    }
    final typeList = types.toList()..sort();
    final visible = _visibleSlots ?? const <ParkingSlot>[];
    final chosen = _selectedSlot;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Slot', style: TextStyle(fontSize: 13, color: label)),
            const SizedBox(width: 6),
            Text(
              chosen == null ? '· auto pick' : '· you chose ${chosen.label}',
              style: TextStyle(
                fontSize: 11.5,
                fontStyle: FontStyle.italic,
                color: chosen == null ? label : _kAccent,
              ),
            ),
          ],
        ),
        if (typeList.length >= 2) ...[
          const SizedBox(height: 8),
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _vehicleChip(isDark, null, 'Any vehicle'),
                ...typeList.map((t) => _vehicleChip(isDark, t, vehicleTypeLabel(t))),
              ],
            ),
          ),
        ],
        const SizedBox(height: 8),
        SizedBox(
          height: 66,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _slotTile(
                isDark,
                title: 'Auto',
                subtitle: 'best free',
                selected: _selectedSlotId == null,
                onTap: () => _selectSlot(null),
                icon: Icons.auto_awesome_rounded,
              ),
              ...visible.map(
                (slot) => _slotTile(
                  isDark,
                  title: slot.label,
                  subtitle: slot.typeLabel.isNotEmpty
                      ? slot.typeLabel
                      : (slot.locationText.isNotEmpty ? slot.locationText : 'Slot'),
                  selected: _selectedSlotId == slot.id,
                  onTap: () => _selectSlot(slot.id),
                  icon: slot.isEv
                      ? Icons.ev_station_rounded
                      : (slot.isAccessible
                          ? Icons.accessible_rounded
                          : Icons.local_parking_rounded),
                ),
              ),
            ],
          ),
        ),
        if (chosen != null &&
            (chosen.locationText.isNotEmpty ||
                chosen.accessNote != null ||
                chosen.displayName != null)) ...[
          const SizedBox(height: 6),
          Text(
            [
              if (chosen.displayName != null) chosen.displayName!,
              if (chosen.locationText.isNotEmpty) chosen.locationText,
              if (chosen.accessNote != null) chosen.accessNote!,
            ].join(' · '),
            style: TextStyle(fontSize: 11.5, color: label),
          ),
        ],
      ],
    );
  }

  Widget _vehicleChip(bool isDark, String? type, String text) {
    final selected = _vehicleFilter == type;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(text, style: const TextStyle(fontSize: 12)),
        selected: selected,
        showCheckmark: false,
        visualDensity: VisualDensity.compact,
        selectedColor: _kAccent,
        backgroundColor: isDark ? const Color(0xFF0F1728) : Colors.grey[100],
        labelStyle: TextStyle(
          color: selected
              ? Colors.white
              : (isDark ? Colors.grey[300] : Colors.grey[700]),
        ),
        onSelected: (_) => _selectVehicle(type),
      ),
    );
  }

  Widget _slotTile(
    bool isDark, {
    required String title,
    required String subtitle,
    required bool selected,
    required VoidCallback onTap,
    required IconData icon,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: _isSaving ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 92,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: selected
                ? _kAccent.withValues(alpha: 0.12)
                : (isDark ? const Color(0xFF0F1728) : Colors.grey[50]),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? _kAccent
                  : (isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0)),
              width: selected ? 1.6 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                children: [
                  Icon(icon, size: 14, color: selected ? _kAccent : Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: selected
                            ? _kAccent
                            : (isDark ? Colors.white : Colors.black87),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10.5,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}