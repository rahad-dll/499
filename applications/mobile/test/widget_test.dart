// Model tests for the API shapes the app reads (no network, no widgets).
//
// Replaces the default Flutter counter test, which imported
// `package:mobile/main.dart` (this package is called `citypulse`) and so
// broke `flutter analyze` and `flutter test`.
import 'package:flutter_test/flutter_test.dart';

import 'package:citypulse/models/booking_model.dart';
import 'package:citypulse/models/booking_quote_model.dart';
import 'package:citypulse/models/parking_model.dart';
import 'package:citypulse/models/payment_model.dart';
import 'package:citypulse/widgets/dashboard/map_filter_bar.dart';

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

  group('ParkingModel', () {
    test('reads a /spaces/nearby row', () {
      final lot = ParkingModel.fromJson({
        'id': 's1',
        'name': 'Gulshan Parking Zone A',
        'address': 'Gulshan 1, Dhaka',
        'latitude': 23.780553,
        'longitude': 90.4169,
        'total_capacity': 8,
        'base_rate_unit': 5000,
        'status': 'active',
        'distance_km': 0.42,
        'available_slots': 3,
        'occupied_slots': 5,
        'amenities': ['cctv', 'covered'],
      });

      expect(lot.availableSpots, 3);
      expect(lot.totalSpots, 8);
      expect(lot.rate, 50.0);
      expect(lot.isOpen, isTrue);
      expect(lot.amenities, ['cctv', 'covered']);
    });

    test('odd values do not throw', () {
      final lot = ParkingModel.fromJson({
        'id': 42,
        'name': null,
        'latitude': '23.78',
        'longitude': null,
        'total_capacity': '8',
        'available_slots': 3.0,
        'base_rate_unit': '5000',
        'distance_km': '1.5',
        'amenities': [1, 'cctv'],
        'slot_statuses': [
          {'slot_id': 'a', 'status': 'available', 'confidence': '0.9'},
          'not a slot',
        ],
      });

      expect(lot.id, '42');
      expect(lot.name, 'Unnamed space');
      expect(lot.latitude, 23.78);
      expect(lot.longitude, 0.0);
      expect(lot.totalSpots, 8);
      expect(lot.availableSpots, 3);
      expect(lot.rate, 50.0);
      expect(lot.distance, 1.5);
      expect(lot.amenities, ['1', 'cctv']);
      expect(lot.slotStatuses.length, 1);
      expect(lot.slotStatuses.first.confidence, 0.9);
    });
  });

  group('Map filters', () {
    ParkingModel lot(
      String id, {
      double distance = 1,
      int free = 5,
      double? rate,
      List<String> amenities = const [],
    }) {
      return ParkingModel(
        id: id,
        name: id,
        address: '',
        latitude: 23.78,
        longitude: 90.41,
        availableSpots: free,
        totalSpots: 10,
        distance: distance,
        rate: rate,
        amenities: amenities,
      );
    }

    final lots = [
      lot('near-full', distance: 0.2, free: 0, rate: 40),
      lot('mid', distance: 0.8, free: 6, rate: 50, amenities: ['cctv', 'covered']),
      lot('far-cheap', distance: 3, free: 2, rate: 20, amenities: ['security_guard']),
    ];

    test('free now + amenity chips', () {
      final free = applyMapFilters(
        lots,
        const MapFilters(availableOnly: true),
        const <String>{},
      );
      expect(free.map((p) => p.id), ['mid', 'far-cheap']);

      final cctv = applyMapFilters(
        lots,
        const MapFilters(cctv: true, covered: true),
        const <String>{},
      );
      expect(cctv.map((p) => p.id), ['mid']);

      final saved = applyMapFilters(
        lots,
        const MapFilters(savedOnly: true),
        const {'far-cheap'},
      );
      expect(saved.map((p) => p.id), ['far-cheap']);
    });

    test('sort orders', () {
      final cheapest = applyMapFilters(
        lots,
        const MapFilters(sort: MapSort.cheapest),
        const <String>{},
      );
      expect(cheapest.first.id, 'far-cheap');

      final mostFree = applyMapFilters(
        lots,
        const MapFilters(sort: MapSort.mostFree),
        const <String>{},
      );
      expect(mostFree.first.id, 'mid');
    });

    test('best pick skips full lots', () {
      expect(pickBestLot(lots)?.id, 'mid');
      expect(pickBestLot([lots.first]), isNull);
    });

    test('drive time is never under a minute', () {
      expect(approxDriveTime(0.05), '~1 min');
      expect(approxDriveTime(2), '~9 min');
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
