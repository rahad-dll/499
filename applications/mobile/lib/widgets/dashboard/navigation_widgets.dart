// lib/widgets/dashboard/navigation_widgets.dart
//
// UI for the route preview and in-app turn-by-turn navigation.
import 'package:flutter/material.dart';

import '../../models/route_models.dart';
import '../../services/navigation_controller.dart';
import '../../utils/format_utils.dart';
import 'dashboard_colors.dart';

const Color _navy = Color(0xFF172033);

BoxDecoration _cardDecoration({Color color = Colors.white}) => BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(22),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.18),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ],
    );

/// Round floating map button (my location, traffic...).
class MapRoundButton extends StatelessWidget {
  const MapRoundButton({
    super.key,
    required this.icon,
    required this.onTap,
    this.active = false,
    this.tooltip,
  });

  final IconData icon;
  final VoidCallback onTap;
  final bool active;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip ?? '',
      child: Material(
        color: active ? DashColors.teal : Colors.white,
        shape: const CircleBorder(),
        elevation: 4,
        shadowColor: Colors.black.withValues(alpha: 0.3),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
            width: 46,
            height: 46,
            child: Icon(
              icon,
              size: 22,
              color: active ? Colors.white : _navy,
            ),
          ),
        ),
      ),
    );
  }
}

/// Shown after tapping "Navigate": ETA, distance and a big Start button.
class RoutePreviewCard extends StatelessWidget {
  const RoutePreviewCard({
    super.key,
    required this.nav,
    required this.onStart,
    required this.onOpenGoogleMaps,
    required this.onClose,
    this.onSimulate,
  });

  final NavigationController nav;
  final VoidCallback onStart;
  final VoidCallback onOpenGoogleMaps;
  final VoidCallback onClose;

  /// Debug builds only: drive the route virtually (no need to move).
  final VoidCallback? onSimulate;

  @override
  Widget build(BuildContext context) {
    final route = nav.route;
    if (route == null) return const SizedBox.shrink();

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 14, 12, 16),
        decoration: _cardDecoration(),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    nav.destinationName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: DashColors.title,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: onClose,
                  icon: const Icon(Icons.close_rounded,
                      size: 20, color: DashColors.muted),
                ),
              ],
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  formatDuration(route.durationS),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: DashColors.title,
                    height: 1,
                  ),
                ),
                const SizedBox(width: 10),
                Padding(
                  padding: const EdgeInsets.only(bottom: 3),
                  child: Text(
                    '${formatDistance(route.distanceM)}  •  '
                    'arrive ${formatClock(DateTime.now().add(Duration(seconds: route.durationS.round())))}',
                    style: const TextStyle(
                      fontSize: 13,
                      color: DashColors.subtle,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              route.trafficAware
                  ? 'Fastest route with live traffic'
                  : 'Fastest route',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: route.trafficAware
                    ? const Color(0xFF16A34A)
                    : DashColors.muted,
              ),
            ),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: DashColors.brandGradient,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: TextButton.icon(
                          onPressed: onStart,
                          icon: const Icon(Icons.navigation_rounded,
                              color: Colors.white, size: 20),
                          label: const Text(
                            'Start',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    height: 48,
                    child: OutlinedButton.icon(
                      onPressed: onOpenGoogleMaps,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _navy,
                        side: const BorderSide(color: DashColors.border),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: const Text('Google Maps'),
                    ),
                  ),
                ],
              ),
            ),
            if (onSimulate != null)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: onSimulate,
                  icon: const Icon(Icons.bug_report_rounded, size: 16),
                  label: const Text('Simulate drive (debug)'),
                  style: TextButton.styleFrom(
                    foregroundColor: DashColors.muted,
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Dark maneuver banner at the top while navigating.
class NavigationBanner extends StatelessWidget {
  const NavigationBanner({super.key, required this.nav});

  final NavigationController nav;

  @override
  Widget build(BuildContext context) {
    final step = nav.upcoming;
    final maneuver = step?.maneuver ?? Maneuver.arrive;
    final text = step?.instruction ?? 'You will arrive at ${nav.destinationName}';

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: _cardDecoration(color: _navy),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: DashColors.teal.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(maneuver.icon,
                        color: DashColors.teal, size: 34),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          formatDistance(nav.distanceToNextM),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          text,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 13.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (nav.isRerouting)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Row(
                    children: [
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(DashColors.teal),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Rerouting...',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bottom ETA bar while navigating.
class NavigationBottomPanel extends StatelessWidget {
  const NavigationBottomPanel({
    super.key,
    required this.nav,
    required this.onEnd,
    this.voiceOn = true,
    this.onToggleVoice,
  });

  final NavigationController nav;
  final VoidCallback onEnd;
  final bool voiceOn;
  final VoidCallback? onToggleVoice;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 14, 14, 14),
        decoration: _cardDecoration(),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    formatDuration(nav.remainingS),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF16A34A),
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${formatDistance(nav.remainingM)}  •  ${formatClock(nav.eta)}',
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: DashColors.subtle,
                    ),
                  ),
                ],
              ),
            ),
            if (onToggleVoice != null)
              IconButton(
                onPressed: onToggleVoice,
                tooltip: voiceOn ? 'Mute voice' : 'Unmute voice',
                icon: Icon(
                  voiceOn ? Icons.volume_up_rounded : Icons.volume_off_rounded,
                  color: voiceOn ? DashColors.teal : DashColors.muted,
                ),
              ),
            SizedBox(
              height: 44,
              child: ElevatedButton(
                onPressed: onEnd,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'End',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shown when the driver reaches the parking space.
class ArrivalCard extends StatelessWidget {
  const ArrivalCard({
    super.key,
    required this.destinationName,
    required this.onDone,
    required this.onBook,
  });

  final String destinationName;
  final VoidCallback onDone;
  final VoidCallback onBook;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
        decoration: _cardDecoration(),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: DashColors.brandGradient,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.flag_rounded,
                  color: Colors.white, size: 26),
            ),
            const SizedBox(height: 10),
            const Text(
              'You have arrived',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: DashColors.title,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              destinationName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: DashColors.subtle),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onDone,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(46),
                      foregroundColor: _navy,
                      side: const BorderSide(color: DashColors.border),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text('Done'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onBook,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(46),
                      backgroundColor: DashColors.teal,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      'Book a slot',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
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

/// Small pill while the first route is being computed.
class RouteLoadingPill extends StatelessWidget {
  const RouteLoadingPill({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          decoration: _cardDecoration(),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(DashColors.teal),
                ),
              ),
              SizedBox(width: 12),
              Text(
                'Finding the best route...',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: DashColors.title,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
