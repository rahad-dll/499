// lib/utils/app_toast.dart
//
// A top-of-screen toast that is drawn on the ROOT overlay.
//
// Why not SnackBar: a SnackBar belongs to the Scaffold underneath, so when a
// modal bottom sheet (new booking sheet) or a bottom action area is on screen
// the message is hidden behind it and the user never sees the warning. A root
// overlay entry sits above every route, sheet and dialog.
import 'dart:async';

import 'package:flutter/material.dart';

OverlayEntry? _activeToast;
Timer? _activeToastTimer;

void showAppToast(
  BuildContext context,
  String message, {
  Color color = const Color(0xFF18D6C0),
  IconData? icon,
  Duration duration = const Duration(seconds: 4),
}) {
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return;

  // Only one toast at a time — a new one replaces the old one.
  _activeToastTimer?.cancel();
  _activeToast?.remove();

  late final OverlayEntry entry;
  entry = OverlayEntry(
    builder: (_) => _ToastView(
      message: message,
      color: color,
      icon: icon ?? _iconFor(color),
      onDismiss: () {
        if (_activeToast == entry) {
          _activeToastTimer?.cancel();
          entry.remove();
          _activeToast = null;
        }
      },
    ),
  );
  _activeToast = entry;
  overlay.insert(entry);
  _activeToastTimer = Timer(duration, () {
    if (_activeToast == entry) {
      entry.remove();
      _activeToast = null;
    }
  });
}

IconData _iconFor(Color color) {
  if (color == Colors.red) return Icons.error_outline_rounded;
  if (color == Colors.orange) return Icons.warning_amber_rounded;
  return Icons.check_circle_rounded;
}

class _ToastView extends StatelessWidget {
  const _ToastView({
    required this.message,
    required this.color,
    required this.icon,
    required this.onDismiss,
  });

  final String message;
  final Color color;
  final IconData icon;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 220),
            builder: (context, t, child) => Opacity(
              opacity: t,
              child: Transform.translate(
                offset: Offset(0, -16 * (1 - t)),
                child: child,
              ),
            ),
            child: Material(
              color: Colors.transparent,
              child: GestureDetector(
                onTap: onDismiss,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Icon(icon, color: Colors.white, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          message,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
