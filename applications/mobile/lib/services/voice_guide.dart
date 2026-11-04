// lib/services/voice_guide.dart
//
// Spoken turn instructions. Every call is wrapped in try/catch: if the
// device has no text-to-speech engine, navigation simply stays silent.
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

class VoiceGuide {
  final FlutterTts _tts = FlutterTts();
  bool _ready = false;

  /// User-facing mute switch.
  bool enabled = true;

  Future<void> init() async {
    if (_ready) return;
    try {
      await _tts.setLanguage('en-US');
      await _tts.setSpeechRate(0.5);
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.0);
      _ready = true;
    } catch (e) {
      debugPrint('VoiceGuide init failed: $e');
    }
  }

  Future<void> speak(String text) async {
    if (!enabled || !_ready || text.isEmpty) return;
    try {
      await _tts.stop();
      await _tts.speak(text);
    } catch (e) {
      debugPrint('VoiceGuide speak failed: $e');
    }
  }

  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
  }

  void dispose() {
    stop();
  }
}
