import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../domain/study_catalog.dart';

final studyApiRepositoryProvider = Provider<StudyApiRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return StudyApiRepository(dio);
});

class StudyApiState {
  const StudyApiState({required this.completedChapterIds, required this.favoriteChapterIds});

  final Set<int> completedChapterIds;
  final Set<int> favoriteChapterIds;

  static StudyApiState fromJson(Map<String, dynamic> json) {
    final completed = (json['completed_chapter_ids'] as List<dynamic>? ?? const [])
        .map((e) => (e as num).toInt())
        .toSet();
    final favorites = (json['favorite_chapter_ids'] as List<dynamic>? ?? const [])
        .map((e) => (e as num).toInt())
        .toSet();
    return StudyApiState(completedChapterIds: completed, favoriteChapterIds: favorites);
  }
}

class StudyApiRepository {
  StudyApiRepository(this._dio);

  final Dio _dio;

  Future<List<StudySubject>> fetchCatalog({required String lang}) async {
    final r = await _dio.get(
      '/api/study/catalog',
      queryParameters: {'lang': lang},
    );

    final data = r.data;
    final items = (data is Map ? data['items'] : null) as List<dynamic>?;
    if (items == null) return const [];

    return items.map((e) => StudySubject.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<StudyApiState> fetchState() async {
    final r = await _dio.get(
      '/api/study/state',
    );

    return StudyApiState.fromJson(Map<String, dynamic>.from(r.data as Map));
  }

  Future<void> setCompleted({required int chapterId, required bool completed}) async {
    await _dio.post(
      '/api/study/chapters/$chapterId/completed',
      data: {
        'completed': completed,
      },
    );
  }

  Future<void> setFavorite({required int chapterId, required bool favorite}) async {
    await _dio.post(
      '/api/study/chapters/$chapterId/favorite',
      data: {
        'favorite': favorite,
      },
    );
  }
}
