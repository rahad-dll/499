// lib/services/session_expiry.dart
//
// App-wide "this login no longer works" signal.
//
// AuthedHttp calls SessionExpiry.notify() when a request answers 401 AND
// the server refuses the refresh token (session revoked from another
// device, password reset / changed elsewhere, or the session expired).
// main.dart listens, clears the saved session and opens the sign-in
// screen, so the driver is not left on a dashboard where every request
// fails with "Session expired".
import 'package:flutter/foundation.dart';

class SessionExpiry {
  SessionExpiry._();

  /// Set once in main.dart.
  static VoidCallback? onExpired;

  /// True while the app is signing out on purpose (logout), so the 401 of
  /// an already-dead session does not open a second sign-in screen.
  static bool paused = false;

  static bool _fired = false;

  /// Fires [onExpired] once per login.
  static void notify() {
    if (paused || _fired) return;
    _fired = true;
    onExpired?.call();
  }

  /// Called after a successful login so the next expiry is reported again.
  static void reset() {
    _fired = false;
  }
}
