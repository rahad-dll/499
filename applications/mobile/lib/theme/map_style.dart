// lib/theme/map_style.dart
//
// Custom Google Maps styles for CityPulse. Passed to GoogleMap(style: ...).
// Goal: calm base map, roads clearly readable, no POI/transit clutter so
// parking pins and the route line are the hero.
class MapStyles {
  MapStyles._();

  static const String light = '''
[
  {"elementType":"geometry","stylers":[{"color":"#f3f5f8"}]},
  {"elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#5b6577"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"},{"weight":3}]},
  {"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},
  {"featureType":"administrative.neighborhood","elementType":"labels.text.fill","stylers":[{"color":"#8a94a6"}]},
  {"featureType":"landscape.man_made","elementType":"geometry","stylers":[{"color":"#eceff4"}]},
  {"featureType":"landscape.natural","elementType":"geometry","stylers":[{"color":"#f1f4f7"}]},
  {"featureType":"poi","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.park","stylers":[{"visibility":"on"}]},
  {"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#d9f0e3"}]},
  {"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#5f9a7b"}]},
  {"featureType":"poi.medical","elementType":"labels.text","stylers":[{"visibility":"on"}]},
  {"featureType":"poi.school","elementType":"labels.text","stylers":[{"visibility":"on"}]},
  {"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},
  {"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#dfe4ec"}]},
  {"featureType":"road.local","elementType":"labels.text.fill","stylers":[{"color":"#8a94a6"}]},
  {"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},
  {"featureType":"road.arterial","elementType":"geometry.stroke","stylers":[{"color":"#d3dae5"}]},
  {"featureType":"road.arterial","elementType":"labels.text.fill","stylers":[{"color":"#4a5468"}]},
  {"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#ffe9b5"}]},
  {"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#f3cf7e"}]},
  {"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#8a6a1f"}]},
  {"featureType":"transit","stylers":[{"visibility":"off"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#bfe3f2"}]},
  {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#5d8ea6"}]}
]
''';

  static const String dark = '''
[
  {"elementType":"geometry","stylers":[{"color":"#111a2b"}]},
  {"elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#8794ab"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#0f1728"},{"weight":3}]},
  {"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},
  {"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#b4bfd3"}]},
  {"featureType":"landscape.man_made","elementType":"geometry","stylers":[{"color":"#141f33"}]},
  {"featureType":"poi","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.park","stylers":[{"visibility":"on"}]},
  {"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#10261f"}]},
  {"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#4f8a6c"}]},
  {"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#243047"}]},
  {"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#1a2438"}]},
  {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#97a3b9"}]},
  {"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#2b3a56"}]},
  {"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#34507a"}]},
  {"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#243a5c"}]},
  {"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#c3d2ea"}]},
  {"featureType":"transit","stylers":[{"visibility":"off"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#0a1220"}]},
  {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#3f5675"}]}
]
''';
}
