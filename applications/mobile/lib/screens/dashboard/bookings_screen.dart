// lib/screens/dashboard/bookings_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';
import '../../models/parking_model.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  List<BookingModel> _bookings = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    // Mock data - replace with actual API call
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _bookings = [
        BookingModel(
          id: '1',
          parkingName: 'City Center Parking',
          address: '123 Main Street, Downtown',
          date: DateTime.now().add(const Duration(days: 1)),
          duration: 2,
          totalPrice: 5.00,
          status: BookingStatus.confirmed,
        ),
        BookingModel(
          id: '2',
          parkingName: 'Mall Parking',
          address: '456 Shopping Mall',
          date: DateTime.now().add(const Duration(days: 3)),
          duration: 1,
          totalPrice: 3.00,
          status: BookingStatus.pending,
        ),
        BookingModel(
          id: '3',
          parkingName: 'Station Parking',
          address: '789 Railway Station',
          date: DateTime.now().subtract(const Duration(days: 1)),
          duration: 3,
          totalPrice: 4.50,
          status: BookingStatus.completed,
        ),
      ];
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1728) : const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text('My Bookings'),
        backgroundColor: isDark ? const Color(0xFF1A2740) : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _bookings.isEmpty
              ? _buildEmptyState(isDark)
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _bookings.length,
                  itemBuilder: (context, index) {
                    return _buildBookingCard(_bookings[index], isDark);
                  },
                ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.book_online,
            size: 80,
            color: isDark ? Colors.grey[600] : Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No bookings yet',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Your bookings will appear here',
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF18D6C0),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Find Parking'),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCard(BookingModel booking, bool isDark) {
    Color statusColor;
    String statusText;
    
    switch (booking.status) {
      case BookingStatus.confirmed:
        statusColor = const Color(0xFF22C55E);
        statusText = 'Confirmed';
        break;
      case BookingStatus.pending:
        statusColor = const Color(0xFFF59E0B);
        statusText = 'Pending';
        break;
      case BookingStatus.completed:
        statusColor = const Color(0xFF8B5CF6);
        statusText = 'Completed';
        break;
      case BookingStatus.cancelled:
        statusColor = Colors.red;
        statusText = 'Cancelled';
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2740) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  booking.parkingName,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
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
                  booking.address,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _buildInfoChip(
                isDark: isDark,
                icon: Icons.calendar_today,
                label: '${booking.date.day}/${booking.date.month}/${booking.date.year}',
              ),
              const SizedBox(width: 8),
              _buildInfoChip(
                isDark: isDark,
                icon: Icons.access_time,
                label: '${booking.duration}h',
              ),
              const SizedBox(width: 8),
              _buildInfoChip(
                isDark: isDark,
                icon: Icons.attach_money,
                label: '\$${booking.totalPrice.toStringAsFixed(2)}',
              ),
            ],
          ),
          if (booking.status == BookingStatus.confirmed) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF18D6C0),
                      side: const BorderSide(color: Color(0xFF18D6C0)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('View Details'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoChip({
    required bool isDark,
    required IconData icon,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F1728) : Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF18D6C0)),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.grey[300] : Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }
}

enum BookingStatus {
  confirmed,
  pending,
  completed,
  cancelled,
}

class BookingModel {
  final String id;
  final String parkingName;
  final String address;
  final DateTime date;
  final int duration;
  final double totalPrice;
  final BookingStatus status;

  BookingModel({
    required this.id,
    required this.parkingName,
    required this.address,
    required this.date,
    required this.duration,
    required this.totalPrice,
    required this.status,
  });
}