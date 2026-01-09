import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:chadconnect/l10n/app_localizations.dart';
import 'package:material_symbols_icons/symbols.dart';

import 'study_controller.dart';

class StudyPage extends ConsumerWidget {
  const StudyPage({super.key});

  Future<bool> _confirmClear(BuildContext context, {required String title, required String message}) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Confirmer'),
            ),
          ],
        );
      },
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final state = ref.watch(studyControllerProvider);
    final controller = ref.read(studyControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.tabStudy)),
      body: SafeArea(
        bottom: false,
        child: state.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text(e.toString())),
          data: (data) {
            final percent = (data.overallProgress * 100).round();
            return ListView(
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
                      child: Icon(Symbols.menu_book_rounded, color: colorScheme.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Catalogue', style: theme.textTheme.titleMedium),
                          const SizedBox(height: 2),
                          Text('Matières, chapitres, progression', style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
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
                        Expanded(child: Text('Progression', style: theme.textTheme.titleMedium)),
                        Text('$percent%', style: theme.textTheme.titleMedium),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: data.overallProgress,
                        minHeight: 10,
                        backgroundColor: colorScheme.surfaceContainerHighest,
                        color: colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
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
                                Text('Chapitres terminés', style: theme.textTheme.labelLarge?.copyWith(color: colorScheme.onSurfaceVariant)),
                                const SizedBox(height: 6),
                                Text('${data.completedCount}/${data.totalChapters}', style: theme.textTheme.headlineSmall),
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
                                Text('Favoris', style: theme.textTheme.labelLarge?.copyWith(color: colorScheme.primary)),
                                const SizedBox(height: 6),
                                Text('${data.favoriteCount}', style: theme.textTheme.headlineSmall),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final ok = await _confirmClear(
                                context,
                                title: 'Réinitialiser la progression',
                                message: 'Cela va décocher tous les chapitres terminés.',
                              );
                              if (!ok) return;
                              await controller.clearProgress();
                            },
                            icon: const Icon(Symbols.restart_alt_rounded),
                            label: const Text('Reset progression'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final ok = await _confirmClear(
                                context,
                                title: 'Vider les favoris',
                                message: 'Cela va retirer tous les favoris.',
                              );
                              if (!ok) return;
                              await controller.clearFavorites();
                            },
                            icon: const Icon(Symbols.bookmark_remove_rounded),
                            label: const Text('Reset favoris'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            ...data.catalog.map((subject) {
              final p = data.progressForSubject(subject.id);
              final subjectPercent = (p * 100).round();

              final total = subject.chapters.length;
              final done = subject.chapters.where((c) => data.completedChapterIds.contains(c.id)).length;

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: ExpansionTile(
                      tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      childrenPadding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                      title: Text(subject.title, style: theme.textTheme.titleMedium),
                      subtitle: Text(
                        '$done/$total • $subjectPercent%',
                        style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                      trailing: SizedBox(
                        width: 54,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: LinearProgressIndicator(
                            value: p,
                            minHeight: 8,
                            backgroundColor: colorScheme.surfaceContainerHighest,
                            color: colorScheme.primary,
                          ),
                        ),
                      ),
                      children: [
                        ...subject.chapters.map((c) {
                          final isDone = data.completedChapterIds.contains(c.id);
                          final isFav = data.favoriteChapterIds.contains(c.id);
                          return ListTile(
                            leading: IconButton(
                              tooltip: isDone ? 'Marquer comme à faire' : 'Marquer comme terminé',
                              onPressed: () => controller.toggleCompleted(c.id),
                              icon: Icon(isDone ? Symbols.check_circle_rounded : Symbols.radio_button_unchecked_rounded),
                              color: isDone ? colorScheme.primary : colorScheme.onSurfaceVariant,
                            ),
                            title: Text(
                              c.title,
                              style: isDone
                                  ? theme.textTheme.bodyLarge?.copyWith(
                                      decoration: TextDecoration.lineThrough,
                                      color: colorScheme.onSurfaceVariant,
                                    )
                                  : theme.textTheme.bodyLarge,
                            ),
                            trailing: IconButton(
                              tooltip: isFav ? 'Retirer des favoris' : 'Ajouter aux favoris',
                              onPressed: () => controller.toggleFavorite(c.id),
                              icon: Icon(isFav ? Symbols.bookmark_rounded : Symbols.bookmark),
                              color: isFav ? colorScheme.primary : colorScheme.onSurfaceVariant,
                            ),
                            onTap: () => controller.toggleCompleted(c.id),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              );
            }),
              ],
            );
          },
        ),
      ),
    );
  }
}
