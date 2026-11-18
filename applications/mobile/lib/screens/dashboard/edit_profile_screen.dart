// lib/screens/dashboard/edit_profile_screen.dart
//
// PATCH /profiles/me — sends ONLY the fields the driver changed.
// Driver fields: full_name, phone, driving_licence_no, licence_type,
// date_of_birth (YYYY-MM-DD), vehicle_classes (BRTA classes).
// 400 = invalid value, 409 = phone already used by another account.
// Changing the phone marks it as not verified.
//
// Pops with `true` when something was saved.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../services/authed_http.dart';
import '../../services/profile_service.dart';
import '../../utils/app_toast.dart';

const Color _kAccent = Color(0xFF18D6C0);

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key, required this.profile});

  /// The GET /profiles/me body currently on screen.
  final Map<String, dynamic> profile;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _service = ProfileService();
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _licenceCtrl;

  String? _licenceType;
  DateTime? _dob;
  final Set<String> _classes = {};

  // original values → only changed fields are sent
  late final String _origName;
  late final String _origPhone;
  late final String _origLicence;
  late final String? _origLicenceType;
  late final String? _origDob;
  late final Set<String> _origClasses;

  bool _saving = false;
  String? _phoneServerError;

  static const Map<String, String> _classNames = {
    'H': 'H · Heavy',
    'M': 'M · Medium',
    'L': 'L · Light',
    'C': 'C · Motorcycle',
    'T': 'T · Tractor',
    'P': 'P · PSV',
    'X': 'X · Special',
  };

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    final driver = p['profile'] is Map
        ? Map<String, dynamic>.from(p['profile'] as Map)
        : <String, dynamic>{};

    _origName = p['full_name']?.toString() ?? '';
    _origPhone = p['phone']?.toString() ?? '';
    _origLicence = driver['driving_licence_no']?.toString() ?? '';
    final lt = driver['licence_type']?.toString();
    _origLicenceType = ProfileService.licenceTypes.contains(lt) ? lt : null;
    final dobRaw = driver['date_of_birth']?.toString();
    _origDob = (dobRaw == null || dobRaw.isEmpty) ? null : dobRaw;
    final rawClasses = driver['vehicle_classes'];
    _origClasses = rawClasses is List
        ? rawClasses
            .map((e) => e.toString())
            .where(ProfileService.vehicleClasses.contains)
            .toSet()
        : <String>{};

    _nameCtrl = TextEditingController(text: _origName);
    _phoneCtrl = TextEditingController(text: _origPhone);
    _licenceCtrl = TextEditingController(text: _origLicence);
    _licenceType = _origLicenceType;
    _dob = _origDob == null ? null : DateTime.tryParse(_origDob!);
    _classes.addAll(_origClasses);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _licenceCtrl.dispose();
    super.dispose();
  }

  String? _dobString(DateTime? d) {
    if (d == null) return null;
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '${d.year}-$m-$day';
  }

  /// Only the fields that differ from what the server has.
  Map<String, dynamic> _changes() {
    final changes = <String, dynamic>{};

    final name = _nameCtrl.text.trim();
    if (name != _origName) changes['full_name'] = name;

    final phone = _phoneCtrl.text.trim();
    if (phone != _origPhone) changes['phone'] = phone;

    final licence = _licenceCtrl.text.trim();
    if (licence != _origLicence) {
      changes['driving_licence_no'] = licence.isEmpty ? null : licence;
    }

    if (_licenceType != _origLicenceType) changes['licence_type'] = _licenceType;

    final dob = _dobString(_dob);
    if (dob != _origDob) changes['date_of_birth'] = dob;

    final sameClasses = _classes.length == _origClasses.length &&
        _classes.containsAll(_origClasses);
    if (!sameClasses) {
      // keep the BRTA order for a tidy request
      changes['vehicle_classes'] = ProfileService.vehicleClasses
          .where(_classes.contains)
          .toList();
    }
    return changes;
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final initial = _dob ?? DateTime(now.year - 25, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isAfter(now) ? now : initial,
      firstDate: DateTime(1940),
      lastDate: now,
      helpText: 'Date of birth',
    );
    if (picked != null && mounted) setState(() => _dob = picked);
  }

  Future<void> _save() async {
    setState(() => _phoneServerError = null);
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final changes = _changes();
    if (changes.isEmpty) {
      showAppToast(context, 'Nothing changed', color: Colors.orange);
      return;
    }

    setState(() => _saving = true);
    try {
      await _service.updateProfile(changes);
      if (!mounted) return;
      setState(() => _saving = false);
      showAppToast(
        context,
        changes.containsKey('phone')
            ? 'Profile updated. Your new phone number needs verifying.'
            : 'Profile updated',
        color: const Color(0xFF22C55E),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        if (e is ApiException && e.statusCode == 409) {
          _phoneServerError = e.message;
        }
      });
      showAppToast(context, e.toString().replaceFirst('Exception: ', ''), color: Colors.red);
    }
  }

  InputDecoration _decoration(
    bool isDark,
    String label,
    IconData icon, {
    String? hint,
    String? errorText,
  }) {
    final border = isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0);
    return InputDecoration(
      labelText: label,
      hintText: hint,
      errorText: errorText,
      prefixIcon: Icon(icon, color: _kAccent),
      filled: true,
      fillColor: isDark ? const Color(0xFF1A2740) : Colors.white,
      labelStyle: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: _kAccent, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Colors.red),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Colors.red, width: 1.6),
      ),
    );
  }

  Widget _sectionTitle(String text, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 10),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w800,
          color: isDark ? Colors.white : const Color(0xFF172033),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final textColor = isDark ? Colors.white : const Color(0xFF172033);
    final muted = isDark ? Colors.grey[400] : Colors.grey[600];

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1728) : const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: isDark ? const Color(0xFF1A2740) : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
        elevation: 0,
      ),
      body: AbsorbPointer(
        absorbing: _saving,
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _sectionTitle('Personal information', isDark),
              TextFormField(
                controller: _nameCtrl,
                textCapitalization: TextCapitalization.words,
                style: TextStyle(color: textColor),
                decoration: _decoration(isDark, 'Full name', Icons.person_outline_rounded),
                validator: (v) {
                  final value = (v ?? '').trim();
                  // empty is only an error when it would clear a saved name
                  if (value.isEmpty) return _origName.isEmpty ? null : 'Enter your name';
                  if (value.length > 255) return 'Name is too long';
                  return null;
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                maxLength: 11,
                style: TextStyle(color: textColor),
                decoration: _decoration(
                  isDark,
                  'Mobile number',
                  Icons.phone_outlined,
                  hint: '01XXXXXXXXX',
                  errorText: _phoneServerError,
                ).copyWith(counterText: ''),
                onChanged: (_) {
                  if (_phoneServerError != null) {
                    setState(() => _phoneServerError = null);
                  }
                },
                validator: (v) {
                  final value = (v ?? '').trim();
                  if (value == _origPhone) return null;
                  if (!ProfileService.phonePattern.hasMatch(value)) {
                    return 'Use a Bangladeshi mobile number (01XXXXXXXXX)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 4),
              Text(
                'Changing the number marks it as not verified.',
                style: TextStyle(fontSize: 11.5, color: muted),
              ),
              const SizedBox(height: 18),
              _sectionTitle('Driving licence', isDark),
              TextFormField(
                controller: _licenceCtrl,
                textCapitalization: TextCapitalization.characters,
                maxLength: 50,
                style: TextStyle(color: textColor),
                decoration: _decoration(
                  isDark,
                  'Licence number',
                  Icons.credit_card_outlined,
                  hint: 'e.g. DK0123456789',
                ).copyWith(counterText: ''),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String?>(
                value: _licenceType,
                dropdownColor: isDark ? const Color(0xFF1A2740) : Colors.white,
                style: TextStyle(color: textColor, fontSize: 15),
                decoration: _decoration(isDark, 'Licence type', Icons.category_outlined),
                items: const [
                  DropdownMenuItem<String?>(value: null, child: Text('Not set')),
                  DropdownMenuItem<String?>(value: 'professional', child: Text('Professional')),
                  DropdownMenuItem<String?>(
                    value: 'non_professional',
                    child: Text('Non-professional'),
                  ),
                ],
                onChanged: (v) => setState(() => _licenceType = v),
              ),
              const SizedBox(height: 14),
              InkWell(
                onTap: _pickDob,
                borderRadius: BorderRadius.circular(14),
                child: InputDecorator(
                  decoration: _decoration(isDark, 'Date of birth', Icons.cake_outlined).copyWith(
                    suffixIcon: _dob == null
                        ? const Icon(Icons.calendar_month_rounded, color: _kAccent)
                        : IconButton(
                            tooltip: 'Clear',
                            icon: Icon(Icons.close_rounded, color: muted),
                            onPressed: () => setState(() => _dob = null),
                          ),
                  ),
                  child: Text(
                    _dobString(_dob) ?? 'Not set',
                    style: TextStyle(fontSize: 15, color: _dob == null ? muted : textColor),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              _sectionTitle('Vehicle classes (BRTA)', isDark),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: ProfileService.vehicleClasses.map((c) {
                  final selected = _classes.contains(c);
                  return FilterChip(
                    label: Text(_classNames[c] ?? c),
                    selected: selected,
                    showCheckmark: true,
                    checkmarkColor: Colors.white,
                    selectedColor: _kAccent,
                    backgroundColor: isDark ? const Color(0xFF1A2740) : Colors.white,
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: selected
                          ? Colors.white
                          : (isDark ? Colors.grey[300] : Colors.grey[700]),
                    ),
                    side: BorderSide(
                      color: selected
                          ? _kAccent
                          : (isDark ? const Color(0xFF2A3B57) : const Color(0xFFE2E8F0)),
                    ),
                    onSelected: (on) => setState(() {
                      if (on) {
                        _classes.add(c);
                      } else {
                        _classes.remove(c);
                      }
                    }),
                  );
                }).toList(),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _kAccent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                        )
                      : const Text(
                          'Save changes',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
