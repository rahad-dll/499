// lib/screens/dashboard/active_devices_screen.dart
//
// "Active Devices" — every login session that is still valid
// (GET /auth/sessions) with a button to sign one out
// (DELETE /auth/sessions/{id}). Opened from the Profile menu.
//
// NOTE: the backend does not say which row is "this device", so every row
// has a sign-out button. Signing out your own row revokes its refresh token.
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/device_session_model.dart';
import '../../services/device_session_service.dart';
import '../../utils/app_snackbar.dart';
import '../../widgets/dashboard/dashboard_colors.dart';

class ActiveDevicesScreen extends StatefulWidget {
  const ActiveDevicesScreen({super.key});

  @override
  State<ActiveDevicesScreen> createState() => _ActiveDevicesScreenState();
}

class _ActiveDevicesScreenState extends State<ActiveDevicesScreen> {
  final DeviceSessionService _service = DeviceSessionService();

  List<DeviceSession> _sessions = [];
  bool _isLoading = true;
  String? _error;
  String? _revokingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool showSpinner = true}) async {
    if (showSpinner) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }
    try {
      final sessions = await _service.fetchSessions();
      if (!mounted) return;
      setState(() {
        _sessions = sessions;
        _isLoading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _revoke(DeviceSession session) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Sign out this session?'),
        content: const Text(
          'That login will stop working. If it is the device you are using '
          'right now, you will have to sign in again.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _revokingId = session.id);
    try {
      await _service.revoke(session.id);
      if (!mounted) return;
      setState(() {
        _sessions.removeWhere((s) => s.id == session.id);
        _revokingId = null;
      });
      showAppSnackBar(context, 'Session signed out');
    } catch (e) {
      if (!mounted) return;
      setState(() => _revokingId = null);
      showAppSnackBar(
        context,
        e.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    }
  }

  String _formatDate(DateTime? d) =>
      d == null ? '—' : DateFormat('d MMM y, h:mm a').format(d);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DashColors.background,
      appBar: AppBar(
        title: const Text(
          'Active Devices',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        backgroundColor: Colors.white,
        foregroundColor: DashColors.title,
        elevation: 0,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: DashColors.teal),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded,
                  size: 48, color: DashColors.muted),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: DashColors.label),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _load,
                style: ElevatedButton.styleFrom(
                  backgroundColor: DashColors.teal,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: DashColors.teal,
      onRefresh: () => _load(showSpinner: false),
      child: _sessions.isEmpty
          ? ListView(
              // ListView so pull-to-refresh still works on an empty list
              padding: const EdgeInsets.symmetric(horizontal: 32),
              children: const [
                SizedBox(height: 120),
                Icon(Icons.devices_other_rounded,
                    size: 48, color: DashColors.muted),
                SizedBox(height: 12),
                Text(
                  'No active sessions',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: DashColors.title,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  'Every session was signed out. Log out and sign in again '
                  'to see this device here.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: DashColors.label, height: 1.4),
                ),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _sessions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _buildCard(_sessions[i]),
            ),
    );
  }

  Widget _buildCard(DeviceSession session) {
    final isRevoking = _revokingId == session.id;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DashColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: DashColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: DashColors.teal.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.smartphone_rounded, color: DashColors.teal),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.deviceName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: DashColors.title,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Signed in: ${_formatDate(session.createdAt)}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: DashColors.subtle,
                  ),
                ),
                Text(
                  'Expires: ${_formatDate(session.expiresAt)}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: DashColors.muted,
                  ),
                ),
                if (session.ipAddress != null)
                  Text(
                    'IP: ${session.ipAddress}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: DashColors.muted,
                    ),
                  ),
              ],
            ),
          ),
          isRevoking
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.red,
                  ),
                )
              : IconButton(
                  tooltip: 'Sign out this session',
                  onPressed: () => _revoke(session),
                  icon: const Icon(Icons.logout_rounded, color: Colors.red),
                ),
        ],
      ),
    );
  }
}
