import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

class SessionService {
  static const String _sessionKey = 'user_session';
  static const String _rememberKey = 'remember_me';
  
  // Save user session (like session cookie)
  static Future<void> saveSession(User user, bool rememberMe) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionKey, json.encode(user.toJson()));
    await prefs.setBool(_rememberKey, rememberMe);
  }
  
  // Get current session
  static Future<User?> getSession() async {
    final prefs = await SharedPreferences.getInstance();
    final sessionData = prefs.getString(_sessionKey);
    if (sessionData != null) {
      try {
        final jsonData = json.decode(sessionData);
        return User.fromJson(jsonData);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  
  // Check if user is logged in
  static Future<bool> isLoggedIn() async {
    final user = await getSession();
    return user != null && user.isLoggedIn;
  }
  
  // Clear session (logout)
  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
    await prefs.remove(_rememberKey);
  }
  
  // Get remember me status
  static Future<bool> getRememberMe() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_rememberKey) ?? false;
  }
  
  // Update user in session
  static Future<void> updateSession(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionKey, json.encode(user.toJson()));
  }
}