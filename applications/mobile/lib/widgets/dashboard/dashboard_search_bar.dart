// lib/widgets/dashboard/dashboard_search_bar.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../services/places_service.dart';
import 'dashboard_colors.dart';
import 'search_suggestions_list.dart';
import 'theme_toggle_button.dart';

/// উপরের floating search bar + theme toggle + autocomplete list।
/// Positioned screen থেকে বসাবে, এখানে শুধু SafeArea আছে।
class DashboardSearchBar extends StatelessWidget {
  const DashboardSearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.onClear,
    required this.isLoading,
    required this.suggestions,
    required this.onSuggestionSelected,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final bool isLoading;
  final List<PlaceSuggestion> suggestions;
  final ValueChanged<PlaceSuggestion> onSuggestionSelected;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: _SearchField(
                    controller: controller,
                    onChanged: onChanged,
                    onClear: onClear,
                    isLoading: isLoading,
                  ),
                ),
                const SizedBox(width: 10),
                const ThemeToggleButton(),
              ],
            ),
            if (suggestions.isNotEmpty)
              SearchSuggestionsList(
                suggestions: suggestions,
                onSelected: onSuggestionSelected,
              ),
          ],
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    required this.onChanged,
    required this.onClear,
    required this.isLoading,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Container(
      height: 52,
      decoration: BoxDecoration(
        color: isDark
            ? DashColors.darkCard.withValues(alpha: 0.92)
            : Colors.white.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? DashColors.darkBorder : Colors.grey[200]!,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          const SizedBox(width: 14),
          const Icon(Icons.search_rounded, color: DashColors.teal, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: TextStyle(
                color: DashColors.title(isDark),
                fontSize: 14,
              ),
              decoration: InputDecoration(
                hintText: 'Search for parking...',
                hintStyle: TextStyle(
                  color: DashColors.muted(isDark),
                  fontSize: 14,
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          if (isLoading)
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(DashColors.teal),
                ),
              ),
            )
          else if (controller.text.isNotEmpty)
            GestureDetector(
              onTap: onClear,
              child: Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Icon(
                  Icons.close_rounded,
                  size: 18,
                  color: DashColors.muted(isDark),
                ),
              ),
            ),
        ],
      ),
    );
  }
}