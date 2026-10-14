// lib/widgets/dashboard/exit_dialog.dart
import 'package:flutter/material.dart';

import 'dashboard_colors.dart';

/// "Exit CityPulse?" dialog। Exit চাপলে true, Cancel বা বাইরে চাপলে false।
/// App-এর theme যা-ই হোক, এই dialog সবসময় light।
Future<bool> showExitDialog(BuildContext context) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (_) => const _ExitDialog(),
  );
  return result ?? false;
}

class _ExitDialog extends StatelessWidget {
  const _ExitDialog();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.10),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.exit_to_app_rounded,
                color: Colors.red,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Exit CityPulse?',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: DashColors.title,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Are you sure you want to exit the app?',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.grey,
                      side: const BorderSide(color: Colors.grey, width: 1.2),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Exit'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}