// lib/utils/currency_formatter.dart
//
// Single source of truth for money formatting so every screen shows
// Bangladeshi Taka (৳) the same way instead of the old '$' sign.
// Kept dependency-free (no intl package needed) — just inserts a
// thousands separator manually.

/// Formats a numeric amount as Taka, e.g. formatTaka(5000) -> '৳5,000.00'
/// Pass showDecimals: false for whole-number displays, e.g. '৳5,000'.
String formatTaka(num amount, {bool showDecimals = true}) {
  final isNegative = amount < 0;
  final absAmount = amount.abs();

  final fixed = showDecimals
      ? absAmount.toStringAsFixed(2)
      : absAmount.round().toString();

  final dotIndex = fixed.indexOf('.');
  final wholePart = dotIndex == -1 ? fixed : fixed.substring(0, dotIndex);
  final decimalPart = dotIndex == -1 ? '' : fixed.substring(dotIndex);

  final buffer = StringBuffer();
  final reversedDigits = wholePart.split('').reversed.toList();
  for (int i = 0; i < reversedDigits.length; i++) {
    buffer.write(reversedDigits[i]);
    final posFromRight = i + 1;
    if (posFromRight % 3 == 0 && posFromRight != reversedDigits.length) {
      buffer.write(',');
    }
  }
  final groupedWhole = buffer.toString().split('').reversed.join();

  return '${isNegative ? '-' : ''}৳$groupedWhole$decimalPart';
}

/// Convenience wrapper for hourly rates, e.g. formatTakaPerHour(120) -> '৳120.00/hr'
String formatTakaPerHour(double rate) => '${formatTaka(rate)}/hr';