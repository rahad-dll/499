import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/auth_response.dart';
import '../models/user_model.dart';

class ApiService {
  // ⚠️ Replace with your actual backend URL
  static const String baseUrl = 'http://localhost:3001/api';
  
  // Sign In
  static Future<AuthResponse> signIn(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/signin'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'email': email,
        'password': password,
      }),
    );
    
    if (response.statusCode == 200) {
      return AuthResponse.fromJson(json.decode(response.body));
    } else {
      throw Exception('Login failed: ${response.statusCode}');
    }
  }
  
  // Sign Up
  static Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
    required String userType,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/signup'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'email': email,
        'password': password,
        'fullName': fullName,
        'userType': userType,
      }),
    );
    
    if (response.statusCode == 201) {
      return AuthResponse.fromJson(json.decode(response.body));
    } else {
      throw Exception('Sign up failed: ${response.statusCode}');
    }
  }
  
  // Get Profile (with token)
  static Future<User> getProfile(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/user/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
    
    if (response.statusCode == 200) {
      return User.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to get profile');
    }
  }
}