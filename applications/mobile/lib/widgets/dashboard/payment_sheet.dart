// lib/widgets/dashboard/payment_sheet.dart
//
// Bottom sheet to pay for a booking:
//   1. pick a method (bKash / Nagad / Card / Cash)
//   2. POST /payments/initiate
//   3. online methods → dummy gateway step: POST /payments/dummy/{trx}/pay
//      with success / failed.  Cash → stays pending, paid at the parking.
//
// Returns the final PaymentModel (or null if the sheet was closed before
// anything was created).
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../models/booking_model.dart';
import '../../models/payment_model.dart';
import '../../services/payment_service.dart';
import '../../utils/app_toast.dart';
import '../../utils/currency_formatter.dart';

const Color _kAccent = Color(0xFF18D6C0);

Future<PaymentModel?> showPaymentSheet(
  BuildContext context,
  BookingModel booking,
) {
  return showModalBottomSheet<PaymentModel>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _PaymentSheet(booking: booking),
  );
}

enum _Step { choose, gateway, done }

class _PaymentSheet extends StatefulWidget {
  const _PaymentSheet({required this.booking});

  final BookingModel booking;

  @override
  State<_PaymentSheet> createState() => _PaymentSheetState();
}

class _PaymentSheetState extends State<_PaymentSheet> {
  final _service = PaymentService();

  PaymentMethod _method = PaymentMethod.bkash;
  _Step _step = _Step.choose;
  bool _busy = false;
  PaymentModel? _payment; // latest server answer

  IconData _iconFor(PaymentMethod m) {
    switch (m) {
      case PaymentMethod.bkash:
        return Icons.account_balance_wallet_rounded;
      case PaymentMethod.nagad:
        return Icons.phone_android_rounded;
      case PaymentMethod.card:
        return Icons.credit_card_rounded;
      case PaymentMethod.cash:
        return Icons.payments_rounded;
    }
  }

  String _errorText(Object e) => e.toString().replaceFirst('Exception: ', '');

  Future<void> _start() async {
    setState(() => _busy = true);
    try {
      final payment = await _service.initiate(
        bookingId: widget.booking.id,
        method: _method,
      );
      if (!mounted) return;
      setState(() {
        _payment = payment;
        _busy = false;
        _step = (payment.checkout?.hasGateway ?? false) ? _Step.gateway : _Step.done;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      showAppToast(context, _errorText(e), color: Colors.red);
    }
  }

  Future<void> _gateway(bool success) async {
    final payment = _payment;
    final trxId = payment?.checkout?.trxId ?? payment?.trxId;
    if (payment == null || trxId == null) return;

    setState(() => _busy = true);
    try {
      final result = await _service.dummyPay(
        trxId: trxId,
        success: success,
        payUrl: payment.checkout?.payUrl,
      );
      if (!mounted) return;
      setState(() {
        _payment = result;
        _busy = false;
        _step = _Step.done;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      showAppToast(context, _errorText(e), color: Colors.red);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final bg = isDark ? const Color(0xFF1A2740) : Colors.white;
    final text = isDark ? Colors.white : const Color(0xFF172033);
    final muted = isDark ? Colors.grey[400] : Colors.grey[600];

    return PopScope(
      // no closing while a request is running
      canPop: !_busy,
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          decoration: BoxDecoration(
            color: bg,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white24 : Colors.black12,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Pay for booking',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: text,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${widget.booking.spaceName}'
                    '${widget.booking.slotLabel.isNotEmpty ? ' · Slot ${widget.booking.slotLabel}' : ''}',
                    style: TextStyle(fontSize: 13, color: muted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 16),
                  _amountCard(isDark, text, muted),
                  const SizedBox(height: 16),
                  if (_step == _Step.choose) ..._chooseStep(isDark, text, muted),
                  if (_step == _Step.gateway) ..._gatewayStep(isDark, text, muted),
                  if (_step == _Step.done) ..._doneStep(isDark, text, muted),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _amountCard(bool isDark, Color text, Color? muted) {
    final amount = _payment?.amount ?? widget.booking.payableAmount;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [_kAccent, Color(0xFF0AA6C4)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.receipt_long_rounded, color: Colors.white, size: 28),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Amount to pay',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Text(
            formatTaka(amount),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _chooseStep(bool isDark, Color text, Color? muted) {
    return [
      Text(
        'Payment method',
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: text),
      ),
      const SizedBox(height: 8),
      ...PaymentMethod.values.map((m) {
        final selected = m == _method;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            onTap: _busy ? null : () => setState(() => _method = m),
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: selected
                    ? _kAccent.withValues(alpha: 0.10)
                    : (isDark ? const Color(0xFF0F1728) : const Color(0xFFF7F9FC)),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: selected
                      ? _kAccent
                      : (isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0)),
                  width: selected ? 1.6 : 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(_iconFor(m), color: selected ? _kAccent : muted),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m.label,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: text,
                          ),
                        ),
                        Text(
                          m.isOnline
                              ? 'Pay now online'
                              : 'Pay at the parking; stays pending until collected',
                          style: TextStyle(fontSize: 11.5, color: muted),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    selected
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_off_rounded,
                    color: selected ? _kAccent : muted,
                  ),
                ],
              ),
            ),
          ),
        );
      }),
      const SizedBox(height: 8),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: _busy ? null : _start,
          style: ElevatedButton.styleFrom(
            backgroundColor: _kAccent,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 15),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          child: _busy
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(
                  _method.isOnline ? 'Continue to ${_method.label}' : 'Choose cash',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
        ),
      ),
    ];
  }

  List<Widget> _gatewayStep(bool isDark, Color text, Color? muted) {
    final trx = _payment?.checkout?.trxId ?? _payment?.trxId ?? '';
    return [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.orange.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange.withValues(alpha: 0.4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.science_rounded, color: Colors.orange, size: 18),
                const SizedBox(width: 6),
                Text(
                  'Test gateway (${paymentMethodLabel(_payment?.method ?? _method.apiValue)})',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'No real money is taken. Choose what the gateway should answer.',
              style: TextStyle(fontSize: 12.5, color: muted),
            ),
            if (trx.isNotEmpty) ...[
              const SizedBox(height: 6),
              SelectableText(
                'Transaction: $trx',
                style: TextStyle(
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: text,
                ),
              ),
            ],
          ],
        ),
      ),
      const SizedBox(height: 16),
      Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _busy ? null : () => _gateway(false),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red, width: 1.3),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Decline', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: _busy ? null : () => _gateway(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF22C55E),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: _busy
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Pay now', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    ];
  }

  List<Widget> _doneStep(bool isDark, Color text, Color? muted) {
    final p = _payment;
    final status = p?.status ?? '';
    final Color color;
    final IconData icon;
    final String title;
    final String subtitle;

    if (status == 'paid') {
      color = const Color(0xFF22C55E);
      icon = Icons.check_circle_rounded;
      title = 'Payment successful';
      subtitle = 'Your booking is paid.';
    } else if (status == 'failed') {
      color = Colors.red;
      icon = Icons.cancel_rounded;
      title = 'Payment failed';
      subtitle = 'Nothing was charged. You can try again.';
    } else {
      color = Colors.orange;
      icon = Icons.schedule_rounded;
      title = p?.method == 'cash' ? 'Pay cash at the parking' : 'Payment pending';
      subtitle = p?.method == 'cash'
          ? 'The payment stays pending until the parking collects it.'
          : 'Waiting for the gateway to confirm.';
    }

    return [
      Center(
        child: Column(
          children: [
            Icon(icon, color: color, size: 56),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: text),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: muted),
            ),
            if (p?.trxId != null) ...[
              const SizedBox(height: 6),
              SelectableText(
                'Transaction: ${p!.trxId}',
                style: TextStyle(fontSize: 12, fontFamily: 'monospace', color: muted),
              ),
            ],
          ],
        ),
      ),
      const SizedBox(height: 18),
      Row(
        children: [
          if (status == 'failed') ...[
            Expanded(
              child: OutlinedButton(
                onPressed: _busy
                    ? null
                    : () => setState(() {
                          _step = _Step.choose;
                        }),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _kAccent,
                  side: const BorderSide(color: _kAccent, width: 1.3),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Try again', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context, _payment),
              style: ElevatedButton.styleFrom(
                backgroundColor: _kAccent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    ];
  }
}
