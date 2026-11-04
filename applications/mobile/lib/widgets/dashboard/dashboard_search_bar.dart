// lib/widgets/dashboard/dashboard_search_bar.dart
import 'package:flutter/material.dart';

import 'dashboard_colors.dart';

/// Floating search field + an optional results [panel] (see SearchPanel).
/// The screen positions this; only SafeArea is handled here.
class DashboardSearchBar extends StatelessWidget {
  const DashboardSearchBar({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onClear,
    required this.onSubmitted,
    required this.isLoading,
    this.panel,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final ValueChanged<String> onSubmitted;
  final bool isLoading;
  final Widget? panel;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 54,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: focusNode.hasFocus
                      ? DashColors.teal.withValues(alpha: 0.6)
                      : DashColors.border,
                  width: focusNode.hasFocus ? 1.5 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.10),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const SizedBox(width: 14),
                  const Icon(Icons.search_rounded,
                      color: DashColors.teal, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ValueListenableBuilder<TextEditingValue>(
                      valueListenable: controller,
                      builder: (context, value, _) => TextField(
                        controller: controller,
                        focusNode: focusNode,
                        onChanged: onChanged,
                        onSubmitted: onSubmitted,
                        textInputAction: TextInputAction.search,
                        style: const TextStyle(
                          color: DashColors.title,
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                        decoration: const InputDecoration(
                          hintText: 'Search area or parking space',
                          hintStyle: TextStyle(
                            color: DashColors.muted,
                            fontSize: 14,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ),
                  ValueListenableBuilder<TextEditingValue>(
                    valueListenable: controller,
                    builder: (context, value, _) {
                      if (isLoading) {
                        return const Padding(
                          padding: EdgeInsets.only(right: 14),
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(DashColors.teal),
                            ),
                          ),
                        );
                      }
                      if (value.text.isEmpty) return const SizedBox(width: 14);
                      return IconButton(
                        onPressed: onClear,
                        splashRadius: 18,
                        icon: const Icon(
                          Icons.close_rounded,
                          size: 20,
                          color: DashColors.muted,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            if (panel != null) panel!,
          ],
        ),
      ),
    );
  }
}
