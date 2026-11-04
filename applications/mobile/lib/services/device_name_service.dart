// lib/services/device_name_service.dart
//
// Reads a human-friendly name for this device (e.g. "Samsung SM-A546E",
// "iPhone 14", "Chrome on Windows") so the server's session list
// (GET /auth/sessions) shows which device is which.
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

class DeviceNameService {
  static String? _cached;

  static Future<String> getDeviceName() async {
    if (_cached != null) return _cached!;
    String name = 'CityPulse App';
    try {
      final info = DeviceInfoPlugin();
      if (kIsWeb) {
        final w = await info.webBrowserInfo;
        name = '${w.browserName.name} (web)';
      } else {
        switch (defaultTargetPlatform) {
          case TargetPlatform.android:
            final a = await info.androidInfo;
            name = '${_cap(a.manufacturer)} ${a.model}'.trim();
            break;
          case TargetPlatform.iOS:
            final i = await info.iosInfo;
            name = i.name.isNotEmpty ? i.name : i.utsname.machine;
            break;
          case TargetPlatform.windows:
            name = (await info.windowsInfo).computerName;
            break;
          case TargetPlatform.macOS:
            name = (await info.macOsInfo).computerName;
            break;
          case TargetPlatform.linux:
            name = (await info.linuxInfo).prettyName;
            break;
          default:
            break;
        }
      }
    } catch (_) {
      // fall back to the generic name
    }
    if (name.trim().isEmpty) name = 'CityPulse App';
    return _cached = name;
  }

  static String _cap(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}
