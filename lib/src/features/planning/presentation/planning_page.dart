import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:chadconnect/l10n/app_localizations.dart';
import 'package:material_symbols_icons/symbols.dart';

import 'planning_controller.dart';

class PlanningPage extends ConsumerWidget {
  const PlanningPage({super.key});

  String _formatWeekRange(BuildContext context, DateTime weekStart) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final start = DateFormat('d MMM', locale).format(weekStart);
    final end = DateFormat('d MMM', locale).format(weekStart.add(const Duration(days: 6)));
    return '$start — $end';
  }

  Future<void> _showAddGoalDialog(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final controller = ref.read(planningControllerProvider.notifier);
    final textController = TextEditingController();

    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Nouvel objectif'),
          content: TextField(
            controller: textController,
            autofocus: true,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(labelText: 'Objectif'),
            onSubmitted: (value) => Navigator.of(context).pop(value),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(textController.text),
              child: Text(l10n.save),
            ),
          ],
        );
      },
    );

    if (result == null) return;
    await controller.addGoal(result);
  }

  Future<void> _showRenameGoalDialog(BuildContext context, WidgetRef ref, {required int id, required String currentTitle}) async {
    final l10n = AppLocalizations.of(context);
    final controller = ref.read(planningControllerProvider.notifier);
    final textController = TextEditingController(text: currentTitle);

    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Modifier l\'objectif'),
          content: TextField(
            controller: textController,
            autofocus: true,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(labelText: 'Objectif'),
            onSubmitted: (value) => Navigator.of(context).pop(value),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(textController.text),
              child: Text(l10n.save),
            ),
          ],
        );
      },
    );

    if (result == null) return;
    await controller.renameGoal(id: id, title: result);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final state = ref.watch(planningControllerProvider);
    final controller = ref.read(planningControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tabPlanning),
        actions: [
          IconButton(
            tooltip: 'Nouvel objectif',
            onPressed: () => _showAddGoalDialog(context, ref),
            icon: const Icon(Symbols.add_rounded),
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
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: colorScheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(Symbols.event_rounded, color: colorScheme.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Planning', style: theme.textTheme.titleMedium),
                          const SizedBox(height: 2),
                          Text('Semaine, objectifs, rappels', style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
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
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          tooltip: 'Semaine précédente',
                          onPressed: controller.previousWeek,
                          icon: const Icon(Symbols.chevron_left_rounded),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Semaine', style: theme.textTheme.titleMedium),
                              const SizedBox(height: 2),
                              Text(
                                _formatWeekRange(context, state.weekStart),
                                style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => controller.setWeek(DateTime.now()),
                          child: const Text('Aujourd\'hui'),
                        ),
                        IconButton(
                          tooltip: 'Semaine suivante',
                          onPressed: controller.nextWeek,
                          icon: const Icon(Symbols.chevron_right_rounded),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Objectifs', style: theme.textTheme.labelLarge?.copyWith(color: colorScheme.onSurfaceVariant)),
                                const SizedBox(height: 6),
                                Text('${state.doneCount}/${state.total}', style: theme.textTheme.headlineSmall),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: colorScheme.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Progression', style: theme.textTheme.labelLarge?.copyWith(color: colorScheme.primary)),
                                const SizedBox(height: 8),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(999),
                                  child: LinearProgressIndicator(
                                    value: state.progress,
                                    minHeight: 10,
                                    backgroundColor: colorScheme.surfaceContainerHighest,
                                    color: colorScheme.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
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
                      leading: const Icon(Symbols.checklist_rounded),
                      title: const Text('Objectifs de la semaine'),
                      subtitle: Text(
                        state.total == 0 ? 'Ajoute ton premier objectif' : 'Garde le cap, petit à petit',
                        style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                      trailing: Wrap(
                        spacing: 6,
                        children: [
                          IconButton(
                            tooltip: 'Ajouter',
                            onPressed: () => _showAddGoalDialog(context, ref),
                            icon: const Icon(Symbols.add_rounded),
                          ),
                          if (state.goals.any((g) => g.done))
                            IconButton(
                              tooltip: 'Supprimer les terminés',
                              onPressed: controller.clearCompleted,
                              icon: const Icon(Symbols.cleaning_services_rounded),
                            ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    if (state.goals.isEmpty)
                      Padding(
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
                              child: Icon(Symbols.flag_rounded, color: colorScheme.primary),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Aucun objectif', style: theme.textTheme.titleMedium),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Appuie sur + pour ajouter un objectif',
                                    style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ...state.goals.map((g) {
                        return ListTile(
                          leading: IconButton(
                            tooltip: g.done ? 'Marquer comme à faire' : 'Marquer comme terminé',
                            onPressed: () => controller.toggleGoal(g.id),
                            icon: Icon(g.done ? Symbols.check_circle_rounded : Symbols.radio_button_unchecked_rounded),
                            color: g.done ? colorScheme.primary : colorScheme.onSurfaceVariant,
                          ),
                          title: Text(
                            g.title,
                            style: g.done
                                ? theme.textTheme.bodyLarge?.copyWith(
                                    decoration: TextDecoration.lineThrough,
                                    color: colorScheme.onSurfaceVariant,
                                  )
                                : theme.textTheme.bodyLarge,
                          ),
                          subtitle: Text(
                            DateFormat('EEE d MMM', Localizations.localeOf(context).toLanguageTag()).format(g.createdAt),
                            style: theme.textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                          ),
                          trailing: PopupMenuButton<String>(
                            onSelected: (value) async {
                              if (value == 'edit') {
                                await _showRenameGoalDialog(context, ref, id: g.id, currentTitle: g.title);
                              }
                              if (value == 'delete') {
                                await controller.deleteGoal(g.id);
                              }
                            },
                            itemBuilder: (context) {
                              return const [
                                PopupMenuItem(value: 'edit', child: Text('Modifier')),
                                PopupMenuItem(value: 'delete', child: Text('Supprimer')),
                              ];
                            },
                          ),
                          onTap: () => controller.toggleGoal(g.id),
                        );
                      }),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
