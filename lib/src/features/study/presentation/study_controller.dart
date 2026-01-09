import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/current_user_provider.dart';
import '../../settings/presentation/settings_controller.dart';
import '../data/study_api_repository.dart';
import '../domain/study_catalog.dart';

class StudyData {
  const StudyData({
    required this.catalog,
    required this.completedChapterIds,
    required this.favoriteChapterIds,
  });

  final List<StudySubject> catalog;
  final Set<int> completedChapterIds;
  final Set<int> favoriteChapterIds;

  int get completedCount => completedChapterIds.length;
  int get favoriteCount => favoriteChapterIds.length;

  int get totalChapters => catalog.fold<int>(0, (acc, s) => acc + s.chapters.length);

  double get overallProgress {
    if (totalChapters == 0) return 0;
    return completedCount / totalChapters;
  }

  double progressForSubject(int subjectId) {
    final subject = catalog.firstWhere((s) => s.id == subjectId);
    final total = subject.chapters.length;
    if (total == 0) return 0;
    final done = subject.chapters.where((c) => completedChapterIds.contains(c.id)).length;
    return done / total;
  }

  StudyData copyWith({
    List<StudySubject>? catalog,
    Set<int>? completedChapterIds,
    Set<int>? favoriteChapterIds,
  }) {
    return StudyData(
      catalog: catalog ?? this.catalog,
      completedChapterIds: completedChapterIds ?? this.completedChapterIds,
      favoriteChapterIds: favoriteChapterIds ?? this.favoriteChapterIds,
    );
  }
}

final studyControllerProvider = NotifierProvider<StudyController, AsyncValue<StudyData>>(StudyController.new);

class StudyController extends Notifier<AsyncValue<StudyData>> {
  @override
  AsyncValue<StudyData> build() {
    Future(() => refresh());
    return const AsyncValue.loading();
  }

  Future<void> refresh() async {
    final repo = ref.read(studyApiRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);
    final lang = ref.read(settingsControllerProvider).locale.languageCode;

    state = const AsyncValue.loading();
    try {
      final catalog = await repo.fetchCatalog(lang: lang);
      final apiState = await repo.fetchState(userId: userId);
      state = AsyncValue.data(
        StudyData(
          catalog: catalog,
          completedChapterIds: apiState.completedChapterIds,
          favoriteChapterIds: apiState.favoriteChapterIds,
        ),
      );
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> toggleCompleted(int chapterId) async {
    final repo = ref.read(studyApiRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);
    final current = state.valueOrNull;
    if (current == null) return;

    final next = {...current.completedChapterIds};
    final nextValue = !next.contains(chapterId);
    if (nextValue) {
      next.add(chapterId);
    } else {
      next.remove(chapterId);
    }

    state = AsyncValue.data(current.copyWith(completedChapterIds: next));

    try {
      await repo.setCompleted(userId: userId, chapterId: chapterId, completed: nextValue);
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }

  Future<void> toggleFavorite(int chapterId) async {
    final repo = ref.read(studyApiRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);
    final current = state.valueOrNull;
    if (current == null) return;

    final next = {...current.favoriteChapterIds};
    final nextValue = !next.contains(chapterId);
    if (nextValue) {
      next.add(chapterId);
    } else {
      next.remove(chapterId);
    }

    state = AsyncValue.data(current.copyWith(favoriteChapterIds: next));

    try {
      await repo.setFavorite(userId: userId, chapterId: chapterId, favorite: nextValue);
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }

  Future<void> clearProgress() async {
    final repo = ref.read(studyApiRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);
    final current = state.valueOrNull;
    if (current == null) return;

    final ids = current.completedChapterIds.toList(growable: false);
    state = AsyncValue.data(current.copyWith(completedChapterIds: const <int>{}));

    try {
      for (final id in ids) {
        await repo.setCompleted(userId: userId, chapterId: id, completed: false);
      }
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }

  Future<void> clearFavorites() async {
    final repo = ref.read(studyApiRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);
    final current = state.valueOrNull;
    if (current == null) return;

    final ids = current.favoriteChapterIds.toList(growable: false);
    state = AsyncValue.data(current.copyWith(favoriteChapterIds: const <int>{}));

    try {
      for (final id in ids) {
        await repo.setFavorite(userId: userId, chapterId: id, favorite: false);
      }
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }
}
