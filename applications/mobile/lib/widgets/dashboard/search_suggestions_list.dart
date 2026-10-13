// lib/widgets/dashboard/search_suggestions_list.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../main.dart';
import '../../services/places_service.dart';
import 'dashboard_colors.dart';

class SearchSuggestionsList extends StatelessWidget {
  const SearchSuggestionsList({
    super.key,
    required this.suggestions,
    required this.onSelected,
  });

  final List<PlaceSuggestion> suggestions;
  final ValueChanged<PlaceSuggestion> onSelected;

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Container(
      margin: const EdgeInsets.only(top: 8),
      constraints: const BoxConstraints(maxHeight: 240),
      decoration: BoxDecoration(
        color: DashColors.card(isDark),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? DashColors.darkBorder : Colors.grey[200]!,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        padding: EdgeInsets.zero,
        itemCount: suggestions.length,
        separatorBuilder: (_, __) => Divider(
          height: 1,
          color: DashColors.border(isDark),
        ),
        itemBuilder: (context, index) {
          final s = suggestions[index];
          return ListTile(
            dense: true,
            leading: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: DashColors.teal.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.place_rounded,
                color: DashColors.teal,
                size: 18,
              ),
            ),
            title: Text(
              s.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: DashColors.title(isDark),
              ),
            ),
            onTap: () => onSelected(s),
          );
        },
      ),
    );
  }
}