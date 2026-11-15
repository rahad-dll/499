// Model tests for the API shapes the app reads (no network, no widgets).
//
// Replaces the default Flutter counter test, which imported
// `package:mobile/main.dart` (this package is called `citypulse`) and so
// broke `flutter analyze` and `flutter test`.
import 'package:flutter_test/flutter_test.dart';

import 'package:citypulse/models/booking_model.dart';
import 'package:citypulse/models/booking_quote_model.dart';
import 'package:citypulse/models/payment_model.dart';

void main() {
  group('BookingModel', () {
    test('reads a booking row from GET /bookings', () {
      final booking = BookingModel.fromJson({
        'id': 'b1',
        'space_id': 's1',
        'space_name': 'Gulshan Parking Zone A',
        'space_address': 'Gulshan 1, Dhaka',
        'latitude': 23.78,
        'longitude': 90.41,
        'slot_id': 'slot1',
        'slot_label': 'A02',
        'status': 'confirmed',
        'scheduled_at': '2026-11-09T10:00:00.000Z',
        'hold_expires_at': '2026-11-09T12:00:00.000Z',
        'duration_hours': 2,
        'base_amount_unit': 10000,
        'discount_unit': 0,
        'amount_unit': 10000,
        'price_per_hour': 50,
        'total_price': 100,
        'payment_status': null,
        'created_at': '2026-11-08T09:00:00.000Z',
      });

      expect(booking.id, 'b1');
      expect(booking.slotLabel, 'A02');
      expect(booking.status, BookingStatus.confirmed);
      expect(booking.durationHours, 2);
      expect(booking.bookedHours, 2);
      expect(booking.payableAmount, 100.0);
      expect(booking.isPaid, isFalse);
      expect(booking.canPay, isTrue);
      expect(booking.isCheckedIn, isFalse);
    });

    test('no_show status and payment block', () {
      final booking = BookingModel.fromJson({
        'id': 'b2',
        'status': 'no_show',
        'scheduled_at': '2026-11-09T10:00:00.000Z',
        'amount_unit': 5000,
        'payment_status': 'paid',
        'payment': {'method': 'bkash', 'status': 'paid', 'trx_id': 'DUMMY-1'},
      });

      expect(booking.status, BookingStatus.noShow);
      expect(bookingStatusToString(booking.status), 'no_show');
      expect(booking.isPaid, isTrue);
      expect(booking.canPay, isFalse);
      expect(booking.canDelete, isTrue);
      expect(booking.payment?.trxId, 'DUMMY-1');
    });

    test('check-out response carries the overstay charge', () {
      final booking = BookingModel.fromJson({
        'id': 'b3',
        'status': 'completed',
        'scheduled_at': '2026-11-09T10:00:00.000Z',
        'arrived_at': '2026-11-09T10:01:00.000Z',
        'departed_at': '2026-11-09T12:20:00.000Z',
        'amount_unit': 15000,
        'overstay_hours': 1,
        'overstay_unit': 5000,
      });

      expect(booking.isCheckedOut, isTrue);
      expect(booking.overstayHours, 1);
      expect(booking.overstayAmount, 50.0);
      expect(booking.payableAmount, 150.0);
    });

    test('create payload leaves out empty optional fields', () {
      final payload = BookingModel.createPayload(
        spaceId: 's1',
        scheduledAt: DateTime.utc(2026, 11, 9, 10),
        durationHours: 2,
        vehiclePlate: '  ',
      );

      expect(payload['space_id'], 's1');
      expect(payload['duration_hours'], 2);
      expect(payload.containsKey('slot_id'), isFalse);
      expect(payload.containsKey('vehicle_plate'), isFalse);
    });
  });

  group('BookingQuote', () {
    test('reads POST /bookings/quote', () {
      final quote = BookingQuote.fromJson({
        'space_id': 's1',
        'slot_id': 'slot1',
        'slot_label': 'A01',
        'scheduled_at': '2026-11-09T10:00:00.000Z',
        'end_at': '2026-11-09T12:00:00.000Z',
        'duration_hours': 2,
        'hourly_rate_unit': 5000,
        'rate_source': 'vehicle',
        'base_amount_unit': 10000,
        'discount_unit': 0,
        'amount_unit': 10000,
        'total_price': 100,
      });

      expect(quote.slotLabel, 'A01');
      expect(quote.hourlyRate, 50.0);
      expect(quote.rateSource, QuoteRateSource.vehicle);
      expect(quote.totalPrice, 100.0);
      expect(quote.hasDiscount, isFalse);
    });
  });

  group('PaymentModel', () {
    test('reads POST /payments/initiate with a checkout', () {
      final payment = PaymentModel.fromJson({
        'payment_id': 'p1',
        'booking_id': 'b1',
        'method': 'bkash',
        'status': 'pending',
        'amount_unit': 10000,
        'amount': 100,
        'trx_id': 'DUMMY-7Q3K9X2M1A',
        'checkout': {
          'gateway': 'dummy',
          'trx_id': 'DUMMY-7Q3K9X2M1A',
          'pay_url': '/payments/dummy/DUMMY-7Q3K9X2M1A/pay',
        },
      });

      expect(payment.paymentId, 'p1');
      expect(payment.isPending, isTrue);
      expect(payment.amount, 100.0);
      expect(payment.checkout?.hasGateway, isTrue);
    });

    test('cash has no gateway step', () {
      final payment = PaymentModel.fromJson({
        'payment_id': 'p2',
        'booking_id': 'b1',
        'method': 'cash',
        'status': 'pending',
        'amount_unit': 10000,
        'checkout': {'gateway': null, 'note': 'Pay cash at the parking'},
      });

      expect(payment.amount, 100.0);
      expect(payment.checkout?.hasGateway, isFalse);
    });
  });
}
