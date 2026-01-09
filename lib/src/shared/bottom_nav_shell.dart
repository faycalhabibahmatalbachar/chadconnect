import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:chadconnect/l10n/app_localizations.dart';
import 'package:material_symbols_icons/symbols.dart';

class BottomNavShell extends StatelessWidget {
  const BottomNavShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  void _onTap(int index) {
    navigationShell.goBranch(index, initialLocation: index == navigationShell.currentIndex);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.only(bottom: 10),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Material(
            color: colorScheme.surfaceContainer,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: colorScheme.outlineVariant.withValues(alpha: 0.6)),
            ),
            child: NavigationBar(
              backgroundColor: Colors.transparent,
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: _onTap,
              destinations: [
                NavigationDestination(
                  icon: const Icon(Symbols.home),
                  selectedIcon: const Icon(Symbols.home_rounded),
                  label: l10n.tabHome,
                ),
                NavigationDestination(
                  icon: const Icon(Symbols.menu_book),
                  selectedIcon: const Icon(Symbols.menu_book_rounded),
                  label: l10n.tabStudy,
                ),
                NavigationDestination(
                  icon: const Icon(Symbols.groups),
                  selectedIcon: const Icon(Symbols.groups_rounded),
                  label: l10n.tabSocial,
                ),
                NavigationDestination(
                  icon: const Icon(Symbols.event),
                  selectedIcon: const Icon(Symbols.event_rounded),
                  label: l10n.tabPlanning,
                ),
                NavigationDestination(
                  icon: const Icon(Symbols.person),
                  selectedIcon: const Icon(Symbols.person_rounded),
                  label: l10n.tabProfile,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
