// lib/screens/dashboard/payment_history_screen.dart
//
// GET /payments?page&limit — my payments, newest first, loaded page by page
// as the list scrolls.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../models/payment_model.dart';
import '../../services/payment_service.dart';
import '../../utils/currency_formatter.dart';

const Color _kAccent = Color(0xFF18D6C0);

class PaymentHistoryScreen extends StatefulWidget {
  const PaymentHistoryScreen({super.key});

  @override
  State<PaymentHistoryScreen> createState() => _PaymentHistoryScreenState();
}

class _PaymentHistoryScreenState extends State<PaymentHistoryScreen> {
  static const int _pageSize = 20;

  final _service = PaymentService();
  final _scroll = ScrollController();

  final List<PaymentModel> _items = [];
  int _page = 0;
  bool _hasMore = true;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _reload();
  }

  @override
  void dispose() {
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    final pos = _scroll.position;
    if (pos.pixels >= pos.maxScrollExtent - 200) _loadMore();
  }

  Future<void> _reload() async {
    if (_loading) return;
    setState(() {
      _items.clear();
      _page = 0;
      _hasMore = true;
      _error = null;
    });
    await _loadMore();
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasMore) return;
    setState(() => _loading = true);
    try {
      final result = await _service.getPayments(page: _page + 1, limit: _pageSize);
      if (!mounted) return;
      setState(() {
        _items.addAll(result.items);
        _page = result.page;
        _hasMore = result.hasMore && result.items.isNotEmpty;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  String _formatDateTime(DateTime d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
    final m = d.minute.toString().padLeft(2, '0');
    final ampm = d.hour >= 12 ? 'PM' : 'AM';
    return '${d.day} ${months[d.month - 1]} ${d.year}, $h:$m $ampm';
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'paid':
        return const Color(0xFF22C55E);
      case 'pending':
        return Colors.orange;
      case 'failed':
        return Colors.red;
      case 'refunded':
        return const Color(0xFF3B82F6);
      default:
        return Colors.grey;
    }
  }

  IconData _methodIcon(String method) {
    switch (method) {
      case 'bkash':
        return Icons.account_balance_wallet_rounded;
      case 'nagad':
        return Icons.phone_android_rounded;
      case 'card':
        return Icons.credit_card_rounded;
      case 'cash':
        return Icons.payments_rounded;
      default:
        return Icons.receipt_long_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1728) : const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text('Payment History', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: isDark ? const Color(0xFF1A2740) : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _loading ? null : _reload,
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(isDark),
    );
  }

  Widget _buildBody(bool isDark) {
    final muted = isDark ? Colors.grey[400] : Colors.grey[600];

    if (_items.isEmpty && _loading) {
      return const Center(child: CircularProgressIndicator(color: _kAccent));
    }

    if (_items.isEmpty && _error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline_rounded, size: 56, color: muted),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: muted)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _reload,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kAccent,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    if (_items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _reload,
        color: _kAccent,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const SizedBox(height: 120),
            Icon(Icons.receipt_long_rounded, size: 64, color: muted),
            const SizedBox(height: 12),
            Center(
              child: Text(
                'No payments yet',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Center(
              child: Text(
                'Pay for a booking from its details page.',
                style: TextStyle(color: muted),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _reload,
      color: _kAccent,
      child: ListView.builder(
        controller: _scroll,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: _items.length + 1,
        itemBuilder: (context, i) {
          if (i == _items.length) return _buildFooter(muted);
          return _buildRow(_items[i], isDark, muted);
        },
      ),
    );
  }

  Widget _buildFooter(Color? muted) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: _kAccent),
          ),
        ),
      );
    }
    if (_error != null) {
      return TextButton(
        onPressed: _loadMore,
        child: Text('Couldn\'t load more — tap to retry', style: TextStyle(color: muted)),
      );
    }
    if (_hasMore) {
      return TextButton(
        onPressed: _loadMore,
        child: const Text('Load more', style: TextStyle(color: _kAccent)),
      );
    }
    return const SizedBox(height: 24);
  }

  Widget _buildRow(PaymentModel p, bool isDark, Color? muted) {
    final color = _statusColor(p.status);
    final text = isDark ? Colors.white : const Color(0xFF172033);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A2740) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _kAccent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_methodIcon(p.method), color: _kAccent, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.spaceName ?? 'Booking payment',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: text),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    paymentMethodLabel(p.method),
                    if (p.slotLabel != null) 'Slot ${p.slotLabel}',
                    if (p.scheduledAt != null) _formatDateTime(p.scheduledAt!),
                  ].join(' · '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: muted),
                ),
                if (p.trxId != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    p.trxId!,
                    style: TextStyle(fontSize: 11, color: muted, fontFamily: 'monospace'),
                  ),
                ],
                if (p.isRefunded && (p.refundAmountUnit ?? 0) > 0) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Refunded ${formatTaka(p.refundAmount)}'
                    '${p.refundedAt != null ? ' on ${_formatDateTime(p.refundedAt!)}' : ''}',
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF3B82F6)),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatTaka(p.amount),
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: text),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  paymentStatusLabel(p.status),
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
