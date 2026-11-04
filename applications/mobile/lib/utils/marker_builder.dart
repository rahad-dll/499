// lib/utils/marker_builder.dart
//
// Custom-drawn parking pins: a white pill with a coloured "P" badge and the
// number of free slots ("12", "Full", "Closed"). Drawn with dart:ui once per
// (state, label, selected, pixel-ratio) and cached, so rebuilding the marker
// set is instant after the first frame.
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../models/parking_model.dart';

class _Pin {
  const _Pin(this.icon, this.anchor);
  final BitmapDescriptor icon;
  final Offset anchor;
}

class _PinFactory {
  _PinFactory._();

  static final Map<String, _Pin> _cache = {};

  static Future<_Pin> parking(
    ParkingModel p, {
    required bool selected,
    required double dpr,
  }) async {
    final String label;
    if (!p.isOpen) {
      label = 'Closed';
    } else if (p.availableSpots > 0) {
      label = '${p.availableSpots}';
    } else {
      label = 'Full';
    }
    final bucket = !p.isOpen
        ? 'closed'
        : p.availableSpots > 5
            ? 'plenty'
            : p.availableSpots > 0
                ? 'limited'
                : 'full';
    final key = '$bucket|$label|$selected|$dpr';
    final cached = _cache[key];
    if (cached != null) return cached;

    final color = p.availabilityColor;
    final scale = selected ? 1.12 : 1.0;

    final tp = TextPainter(
      text: TextSpan(
        text: label,
        style: TextStyle(
          color: selected ? Colors.white : const Color(0xFF172033),
          fontSize: 13 * scale,
          fontWeight: FontWeight.w800,
        ),
      ),
      textDirection: ui.TextDirection.ltr,
    )..layout();

    final tpP = TextPainter(
      text: TextSpan(
        text: 'P',
        style: TextStyle(
          color: Colors.white,
          fontSize: 12 * scale,
          fontWeight: FontWeight.w900,
        ),
      ),
      textDirection: ui.TextDirection.ltr,
    )..layout();

    final badge = 20.0 * scale;
    final pad = 6.0 * scale;
    final gap = 6.0 * scale;
    const tail = 7.0;
    const shadow = 5.0;

    final bodyW = pad + badge + gap + tp.width + pad + 2;
    final bodyH = badge + pad * 2;
    final w = bodyW + shadow * 2;
    final h = bodyH + tail + shadow * 2;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.scale(dpr);

    final body = RRect.fromRectAndRadius(
      Rect.fromLTWH(shadow, shadow, bodyW, bodyH),
      Radius.circular(bodyH / 2),
    );

    // Soft shadow.
    canvas.drawRRect(
      body.shift(const Offset(0, 2)),
      Paint()
        ..color = Colors.black.withValues(alpha: 0.25)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
    );

    // Tail.
    final tailPath = Path()
      ..moveTo(w / 2 - 6, shadow + bodyH - 1)
      ..lineTo(w / 2, shadow + bodyH + tail)
      ..lineTo(w / 2 + 6, shadow + bodyH - 1)
      ..close();

    final fill = Paint()
      ..color = selected ? const Color(0xFF172033) : Colors.white;
    canvas.drawPath(tailPath, fill);
    canvas.drawRRect(body, fill);

    // Border.
    canvas.drawRRect(
      body,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = color,
    );

    // "P" badge.
    final cy = shadow + bodyH / 2;
    final cx = shadow + pad + badge / 2;
    canvas.drawCircle(Offset(cx, cy), badge / 2, Paint()..color = color);
    tpP.paint(canvas, Offset(cx - tpP.width / 2, cy - tpP.height / 2));

    // Label.
    tp.paint(
      canvas,
      Offset(shadow + pad + badge + gap, cy - tp.height / 2),
    );

    final image = await recorder
        .endRecording()
        .toImage((w * dpr).ceil(), (h * dpr).ceil());
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);

    final pin = _Pin(
      BitmapDescriptor.bytes(
        bytes!.buffer.asUint8List(),
        imagePixelRatio: dpr,
      ),
      // Anchor on the tip of the tail.
      Offset(0.5, (shadow + bodyH + tail) / h),
    );
    _cache[key] = pin;
    return pin;
  }
}

/// Parking pins + the searched-location pin. The user's own position is
/// drawn by the native blue dot (myLocationEnabled), not a marker.
Future<Set<Marker>> buildDashboardMarkers({
  required List<ParkingModel> parkings,
  required void Function(ParkingModel parking) onParkingTap,
  required double devicePixelRatio,
  String? selectedId,
  LatLng? searchedLocation,
  String? searchedLocationLabel,
}) async {
  final markers = <Marker>{};

  if (searchedLocation != null) {
    markers.add(
      Marker(
        markerId: const MarkerId('searched_location'),
        position: searchedLocation,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
        infoWindow:
            InfoWindow(title: searchedLocationLabel ?? 'Searched location'),
      ),
    );
  }

  for (final parking in parkings) {
    final pin = await _PinFactory.parking(
      parking,
      selected: parking.id == selectedId,
      dpr: devicePixelRatio,
    );
    markers.add(
      Marker(
        markerId: MarkerId('parking_${parking.id}'),
        position: LatLng(parking.latitude, parking.longitude),
        icon: pin.icon,
        anchor: pin.anchor,
        onTap: () => onParkingTap(parking),
      ),
    );
  }

  return markers;
}
