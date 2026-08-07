import 'package:flutter/material.dart';

/// Renders an icon that YOU export from Figma (Phosphor icon set) as a PNG
/// (2x/3x) or SVG and drop into `assets/icons/<name>.png`.
///
/// Usage: AppIcon('activity', size: 20, color: AppColorsLight.accentTeal)
/// -> looks for assets/icons/activity.png
///
/// Until the real asset is exported, this shows a dashed placeholder box
/// with the icon name so the screen still compiles and runs.
class AppIcon extends StatelessWidget {
  final String name;
  final double size;
  final Color? color;

  const AppIcon(this.name, {super.key, this.size = 24, this.color});

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/icons/$name.png',
      width: size,
      height: size,
      color: color,
      errorBuilder: (context, error, stackTrace) => Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: (color ?? Colors.grey).withOpacity(0.4)),
          borderRadius: BorderRadius.circular(4),
        ),
        child: FittedBox(
          child: Text(
            name,
            style: TextStyle(fontSize: 6, color: color ?? Colors.grey),
          ),
        ),
      ),
    );
  }
}

/// Renders an image that YOU export from Figma as PNG/JPG/SVG and drop into
/// `assets/images/<name>.png`.
///
/// Until the real asset is exported, this shows a labeled placeholder box
/// (same aspect box you'd see in Figma) so layout doesn't break.
class AppImage extends StatelessWidget {
  final String name;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const AppImage(
    this.name, {
    super.key,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final child = Image.asset(
      'assets/images/$name.png',
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (context, error, stackTrace) => Container(
        width: width,
        height: height,
        alignment: Alignment.center,
        color: Colors.grey.withOpacity(0.15),
        child: Text(
          name,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
      ),
    );
    if (borderRadius == null) return child;
    return ClipRRect(borderRadius: borderRadius!, child: child);
  }
}