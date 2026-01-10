import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../domain/planning_goal.dart';

final planningApiRepositoryProvider = Provider<PlanningApiRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return PlanningApiRepository(dio);
});

class PlanningApiRepository {
  PlanningApiRepository(this._dio);

  final Dio _dio;

  String _date(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  PlanningGoal _fromApi(Map<String, dynamic> json) {
    final createdAtRaw = json['created_at'];
    final updatedAtRaw = json['updated_at'];

    final createdAt = createdAtRaw is String
        ? DateTime.parse(createdAtRaw)
        : updatedAtRaw is String
            ? DateTime.parse(updatedAtRaw)
            : DateTime.now();

    return PlanningGoal(
      id: (json['id'] as num).toInt(),
      title: (json['title'] as String?) ?? '',
      done: (json['done'] as num?) == 1 || (json['done'] as bool?) == true,
      createdAt: createdAt,
    );
  }

  Future<List<PlanningGoal>> fetchGoals({required DateTime weekStart}) async {
    final r = await _dio.get(
      '/api/planning/goals',
      queryParameters: {
        'week_start': _date(weekStart),
      },
    );

    final data = r.data;
    final items = (data is Map ? data['items'] : null) as List<dynamic>?;
    if (items == null) return const [];

    return items.map((e) => _fromApi(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<PlanningGoal> createGoal({required DateTime weekStart, required String title}) async {
    final r = await _dio.post(
      '/api/planning/goals',
      data: {
        'week_start': _date(weekStart),
        'title': title,
      },
    );

    return _fromApi(Map<String, dynamic>.from(r.data as Map));
  }

  Future<PlanningGoal> updateGoal({required int id, String? title, bool? done}) async {
    final data = <String, Object?>{};
    if (title != null) data['title'] = title;
    if (done != null) data['done'] = done;

    final r = await _dio.patch(
      '/api/planning/goals/$id',
      data: data,
    );

    return _fromApi(Map<String, dynamic>.from(r.data as Map));
  }

  Future<void> deleteGoal({required int id}) async {
    await _dio.delete('/api/planning/goals/$id');
  }
}
