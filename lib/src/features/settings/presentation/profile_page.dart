import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:chadconnect/l10n/app_localizations.dart';
import 'package:material_symbols_icons/symbols.dart';

import 'settings_controller.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final settings = ref.watch(settingsControllerProvider);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final roleText = switch (settings.role) {
      UserRole.student => l10n.roleStudent,
      UserRole.teacher => l10n.roleTeacher,
      UserRole.admin => l10n.roleAdmin,
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tabProfile),
        actions: const [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: Icon(Symbols.notifications),
          ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
                      child: Icon(Symbols.person_rounded, color: colorScheme.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Utilisateur', style: theme.textTheme.titleMedium),
                          const SizedBox(height: 2),
                          Text(roleText, style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
                        ],
                      ),
                    ),
                    Icon(Symbols.verified_rounded, color: colorScheme.tertiary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Symbols.badge_rounded),
                      title: Text(l10n.profileRole),
                      subtitle: Text(roleText),
                      trailing: DropdownButton<UserRole>(
                        value: settings.role,
                        onChanged: (value) {
                          if (value == null) return;
                          ref.read(settingsControllerProvider.notifier).setRole(value);
                        },
                        items: [
                          DropdownMenuItem(value: UserRole.student, child: Text(l10n.roleStudent)),
                          DropdownMenuItem(value: UserRole.teacher, child: Text(l10n.roleTeacher)),
                          DropdownMenuItem(value: UserRole.admin, child: Text(l10n.roleAdmin)),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Symbols.language_rounded),
                      title: Text(l10n.language),
                      subtitle: Text(settings.locale.languageCode == 'ar' ? l10n.languageArabic : l10n.languageFrench),
                      trailing: DropdownButton<Locale>(
                        value: settings.locale,
                        onChanged: (value) {
                          if (value == null) return;
                          ref.read(settingsControllerProvider.notifier).setLocale(value);
                        },
                        items: [
                          DropdownMenuItem(value: const Locale('fr'), child: Text(l10n.languageFrench)),
                          DropdownMenuItem(value: const Locale('ar'), child: Text(l10n.languageArabic)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: ListTile(
                  leading: const Icon(Symbols.school_rounded),
                  title: Text(l10n.institutions),
                  subtitle: Text('Gérer vos établissements', style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
                  trailing: const Icon(Symbols.chevron_right_rounded),
                  onTap: () => context.push('/profile/institutions'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
