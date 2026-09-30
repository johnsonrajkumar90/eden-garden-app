import 'package:flutter/material.dart';

/// A bottom navigation tab: the page it opens, and which website pages belong to it.
class AppTab {
  const AppTab({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.path,
    required this.prefixes,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String path;
  final List<String> prefixes;
}

const List<AppTab> appTabs = [
  AppTab(
    label: 'Stays',
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
    path: '/',
    prefixes: ['/stays', '/book', '/pay', '/booking', '/find-booking'],
  ),
  AppTab(
    label: 'Services',
    icon: Icons.room_service_outlined,
    selectedIcon: Icons.room_service,
    path: '/services',
    prefixes: ['/services'],
  ),
  AppTab(
    label: 'Buy',
    icon: Icons.apartment_outlined,
    selectedIcon: Icons.apartment,
    path: '/homes-for-sale',
    prefixes: ['/homes-for-sale', '/plots'],
  ),
  AppTab(
    label: 'Trips',
    icon: Icons.luggage_outlined,
    selectedIcon: Icons.luggage,
    path: '/trips',
    prefixes: ['/trips', '/invoices'],
  ),
  AppTab(
    label: 'Account',
    icon: Icons.person_outline,
    selectedIcon: Icons.person,
    path: '/me',
    prefixes: ['/me', '/login', '/signup', '/admin', '/host', '/referral', '/delete-account', '/privacy-policy', '/panel'],
  ),
];

/// Which tab a website address belongs to, or null (keep the current tab).
int? tabIndexForPath(String path) {
  final p = path.isEmpty ? '/' : path;
  if (p == '/') return 0;
  int? best;
  var bestLen = 0;
  for (var i = 0; i < appTabs.length; i++) {
    for (final prefix in appTabs[i].prefixes) {
      final match = p == prefix || p.startsWith('$prefix/') || (p.startsWith(prefix) && prefix.length > 1 && !_isLetter(p, prefix.length));
      if (match && prefix.length > bestLen) {
        best = i;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

bool _isLetter(String s, int index) {
  if (index >= s.length) return false;
  final c = s.codeUnitAt(index);
  return (c >= 97 && c <= 122) || c == 45 || c == 95; // a-z, '-', '_'
}
