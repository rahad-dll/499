// lib/widgets/dashboard/space_extras_section.dart
//
// Extra info for ParkingDetailsSheet, loaded from GET /spaces/{id}:
// photo strip, description, space type, max height, contact phone,
// operating hours. Fails quietly (small retry line) so the existing sheet
// never breaks if the endpoint is slow or forbidden.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/space_detail_model.dart';
import '../../services/space_service.dart';
import '../../utils/app_snackbar.dart';
import 'dashboard_colors.dart';

class SpaceExtrasSection extends StatefulWidget {
  const SpaceExtrasSection({super.key, required this.spaceId});

  final String spaceId;

  @override
  State<SpaceExtrasSection> createState() => _SpaceExtrasSectionState();
}

class _SpaceExtrasSectionState extends State<SpaceExtrasSection> {
  final SpaceService _service = SpaceService();
  Future<SpaceDetailModel>? _future;

  @override
  void initState() {
    super.initState();
    if (widget.spaceId.isNotEmpty) {
      _future = _service.getSpace(widget.spaceId);
    }
  }

  void _retry() {
    setState(() => _future = _service.getSpace(widget.spaceId));
  }

  @override
  Widget build(BuildContext context) {
    // No id -> GET /spaces/ would hit the list endpoint, so just skip.
    if (widget.spaceId.isEmpty) return const SizedBox.shrink();

    return FutureBuilder<SpaceDetailModel>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: ClipRRect(
              borderRadius: BorderRadius.all(Radius.circular(6)),
              child: LinearProgressIndicator(
                minHeight: 4,
                color: DashColors.teal,
                backgroundColor: DashColors.border,
              ),
            ),
          );
        }

        if (snapshot.hasError) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded,
                    size: 16, color: DashColors.muted),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    "Couldn't load more details: "
                    '${snapshot.error.toString().replaceFirst('Exception: ', '')}',
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: DashColors.muted,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: _retry,
                  style: TextButton.styleFrom(
                    foregroundColor: DashColors.teal,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: const Size(0, 32),
                  ),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        final space = snapshot.data!;
        if (!space.hasAnyExtra) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (space.photos.isNotEmpty) ...[
              _PhotoStrip(spaceId: space.id, photos: space.photos),
              const SizedBox(height: 16),
            ],
            if (space.description != null) ...[
              Text(
                space.description!,
                style: const TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: DashColors.label,
                ),
              ),
              const SizedBox(height: 16),
            ],
            _InfoGrid(space: space),
            if (space.operatingHours.isNotEmpty) ...[
              const SizedBox(height: 16),
              _HoursCard(hours: space.operatingHours),
            ],
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

class _PhotoStrip extends StatelessWidget {
  const _PhotoStrip({required this.spaceId, required this.photos});

  final String spaceId;
  final List<SpacePhoto> photos;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 120,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: photos.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, i) => _PhotoTile(spaceId: spaceId, photo: photos[i]),
      ),
    );
  }
}

class _PhotoTile extends StatefulWidget {
  const _PhotoTile({required this.spaceId, required this.photo});

  final String spaceId;
  final SpacePhoto photo;

  @override
  State<_PhotoTile> createState() => _PhotoTileState();
}

class _PhotoTileState extends State<_PhotoTile> {
  late Future<String?> _urlFuture;

  @override
  void initState() {
    super.initState();
    _urlFuture = widget.photo.directUrl != null
        ? Future.value(widget.photo.directUrl)
        : SpaceService().presignPhoto(widget.spaceId, widget.photo.id);
  }

  Widget _placeholder({bool broken = false}) {
    return Container(
      width: 160,
      color: DashColors.cardAlt,
      alignment: Alignment.center,
      child: Icon(
        broken ? Icons.broken_image_outlined : Icons.image_outlined,
        color: DashColors.chevron,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: FutureBuilder<String?>(
        future: _urlFuture,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return _placeholder();
          }
          final url = snap.data;
          if (url == null) return _placeholder(broken: true);

          return GestureDetector(
            onTap: () => _openViewer(context, url),
            child: Image.network(
              url,
              width: 160,
              height: 120,
              fit: BoxFit.cover,
              loadingBuilder: (context, child, progress) =>
                  progress == null ? child : _placeholder(),
              errorBuilder: (_, __, ___) => _placeholder(broken: true),
            ),
          );
        },
      ),
    );
  }

  void _openViewer(BuildContext context, String url) {
    showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          children: [
            InteractiveViewer(
              child: Image.network(
                url,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Padding(
                  padding: EdgeInsets.all(40),
                  child: Icon(Icons.broken_image_outlined,
                      color: Colors.white54, size: 48),
                ),
              ),
            ),
            Positioned(
              top: 4,
              right: 4,
              child: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Info chips
// ---------------------------------------------------------------------------

class _InfoGrid extends StatelessWidget {
  const _InfoGrid({required this.space});

  final SpaceDetailModel space;

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];

    if (space.spaceType != null) {
      items.add(_InfoChip(
        icon: Icons.garage_rounded,
        label: 'Type',
        value: space.spaceTypeLabel,
      ));
    }
    if (space.maxHeightCm != null) {
      items.add(_InfoChip(
        icon: Icons.height_rounded,
        label: 'Max height',
        value: '${space.maxHeightCm!.toStringAsFixed(0)} cm',
      ));
    }
    if (space.contactPhone != null) {
      items.add(_InfoChip(
        icon: Icons.phone_rounded,
        label: 'Contact (tap to copy)',
        value: space.contactPhone!,
        onTap: () async {
          await Clipboard.setData(ClipboardData(text: space.contactPhone!));
          if (context.mounted) {
            showAppSnackBar(context, 'Phone number copied');
          }
        },
      ));
    }

    if (items.isEmpty) return const SizedBox.shrink();

    return Wrap(spacing: 10, runSpacing: 10, children: items);
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: DashColors.cardAlt,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: DashColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: DashColors.teal),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: DashColors.muted,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: DashColors.title,
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

// ---------------------------------------------------------------------------
// Operating hours
// ---------------------------------------------------------------------------

class _HoursCard extends StatelessWidget {
  const _HoursCard({required this.hours});

  final Map<String, String> hours;

  static const Map<String, String> _dayNames = {
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday',
    'sun': 'Sunday',
  };

  @override
  Widget build(BuildContext context) {
    // DateTime.weekday: Mon = 1 ... Sun = 7
    final todayKey = SpaceDetailModel.dayOrder[DateTime.now().weekday - 1];

    final rows = SpaceDetailModel.dayOrder
        .where(hours.containsKey)
        .map((day) {
      final isToday = day == todayKey;
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _dayNames[day] ?? day,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isToday ? FontWeight.w800 : FontWeight.w500,
                color: isToday ? DashColors.teal : DashColors.label,
              ),
            ),
            Text(
              hours[day]!,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isToday ? FontWeight.w800 : FontWeight.w600,
                color: isToday ? DashColors.teal : DashColors.title,
              ),
            ),
          ],
        ),
      );
    }).toList();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DashColors.cardAlt,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: DashColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.schedule_rounded, size: 16, color: DashColors.teal),
              SizedBox(width: 6),
              Text(
                'Operating hours',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: DashColors.label,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...rows,
        ],
      ),
    );
  }
}