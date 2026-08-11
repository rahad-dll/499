// lib/screens/dashboard/new_booking_sheet.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../models/booking_model.dart';
import '../../models/parking_model.dart';
import '../../services/booking_service.dart';

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
  DateTime _scheduledAt = DateTime.now().add(const Duration(hours: 1));
  final _plateController = TextEditingController();
  bool _isSaving = false;

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
  }

  Future<void> _confirm() async {
    if (!_hasRate) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Rate information not available for this parking'),
          backgroundColor: Colors.orange,
        ),
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
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
                  onSelected: (_) => setState(() => _durationHours = h),
                );
              }).toList(),
            ),
            
            const SizedBox(height: 16),
            
            Text(
              'Scheduled Time',
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickDateTime,
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F1728) : Colors.grey[50],
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule, size: 18, color: Color(0xFF18D6C0)),
                    const SizedBox(width: 8),
                    Text(
                      '${_scheduledAt.day}/${_scheduledAt.month}/${_scheduledAt.year} • '
                      '${TimeOfDay.fromDateTime(_scheduledAt).format(context)}',
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ],
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
                  _hasRate ? '\$${widget.space.rate!.toStringAsFixed(2)}/hr' : 'N/A',
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
                  _hasRate ? '\$${_total.toStringAsFixed(2)}' : 'N/A',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: _hasRate ? const Color(0xFF18D6C0) : Colors.grey,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_isSaving || !_hasRate) ? null : _confirm,
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
                    : Text(_hasRate ? 'Confirm Booking' : 'Rate Unavailable'),
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