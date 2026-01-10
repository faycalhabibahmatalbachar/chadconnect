import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:chadconnect/l10n/app_localizations.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../settings/presentation/settings_controller.dart';
import '../data/institution_api_repository.dart';
import '../domain/institution.dart';

class InstitutionsPage extends ConsumerWidget {
  const InstitutionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final role = ref.watch(settingsControllerProvider).role;
    final institutionsAsync = ref.watch(institutionsProvider);

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final repo = ref.read(institutionApiRepositoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.institutions),
        actions: [
          if (role == UserRole.teacher)
            IconButton(
              onPressed: () => context.push('/profile/institutions/create'),
              icon: const Icon(Symbols.add_rounded),
              tooltip: l10n.createInstitution,
            ),
        ],
      ),
      body: institutionsAsync.when(
        data: (items) {
          if (items.isEmpty) {
            return SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: colorScheme.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(Symbols.school_rounded, color: colorScheme.primary),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(l10n.institutions, style: theme.textTheme.titleMedium),
                              const SizedBox(height: 2),
                              Text(
                                'Aucun établissement pour le moment',
                                style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }

          return SafeArea(
            bottom: false,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final it = items[index];

                final statusText = switch (it.status) {
                  InstitutionValidationStatus.pendingValidation => l10n.institutionStatusPending,
                  InstitutionValidationStatus.approved => l10n.institutionStatusApproved,
                  InstitutionValidationStatus.rejected => l10n.institutionStatusRejected,
                };

                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: ListTile(
                      leading: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Symbols.school_rounded),
                      ),
                      title: Text(it.name),
                      subtitle: Text('${it.city} • $statusText'),
                      trailing: (role == UserRole.admin && it.status == InstitutionValidationStatus.pendingValidation)
                          ? Wrap(
                              spacing: 4,
                              children: [
                                IconButton(
                                  tooltip: l10n.approve,
                                  onPressed: () async {
                                    await repo.setStatus(
                                      id: it.id,
                                      status: InstitutionValidationStatus.approved,
                                    );
                                    ref.invalidate(institutionsProvider);
                                  },
                                  icon: const Icon(Symbols.check_circle_rounded),
                                ),
                                IconButton(
                                  tooltip: l10n.reject,
                                  onPressed: () async {
                                    await repo.setStatus(
                                      id: it.id,
                                      status: InstitutionValidationStatus.rejected,
                                    );
                                    ref.invalidate(institutionsProvider);
                                  },
                                  icon: const Icon(Symbols.cancel_rounded),
                                ),
                              ],
                            )
                          : const Icon(Symbols.chevron_right_rounded),
                    ),
                  ),
                );
              },
            ),
          );
        },
        error: (e, _) => Center(child: Text(e.toString())),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
