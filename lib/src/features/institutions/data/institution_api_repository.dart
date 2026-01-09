import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../domain/institution.dart';

final institutionApiRepositoryProvider = Provider<InstitutionApiRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return InstitutionApiRepository(dio);
});

final institutionsProvider = FutureProvider<List<Institution>>((ref) async {
  final repo = ref.watch(institutionApiRepositoryProvider);
  return repo.fetchAll();
});

class InstitutionApiRepository {
  InstitutionApiRepository(this._dio);

  final Dio _dio;

  Institution _fromApi(Map<String, dynamic> json) {
    final statusRaw = (json['validation_status'] as String?) ?? 'pending';
    final status = switch (statusRaw) {
      'approved' => InstitutionValidationStatus.approved,
      'rejected' => InstitutionValidationStatus.rejected,
      _ => InstitutionValidationStatus.pendingValidation,
    };

    final createdBy = json['created_by_user_id'];
    final createdByUserId = createdBy == null ? '' : createdBy.toString();

    final it = Institution(
      name: (json['name'] as String?) ?? '',
      city: (json['city'] as String?) ?? '',
      createdByUserId: createdByUserId,
      status: status,
    );

    it.id = (json['id'] as num).toInt();
    return it;
  }

  Future<List<Institution>> fetchAll() async {
    final r = await _dio.get('/api/institutions');
    final data = r.data;
    final items = (data is Map ? data['items'] : null) as List<dynamic>?;
    if (items == null) return const [];

    return items.map((e) => _fromApi(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<Institution> createPending({required int userId, required String name, required String city}) async {
    final r = await _dio.post(
      '/api/institutions',
      data: {
        'user_id': userId,
        'name': name,
        'city': city,
        'country': 'Chad',
      },
    );

    return _fromApi(Map<String, dynamic>.from(r.data as Map));
  }

  Future<Institution> setStatus({
    required int id,
    required InstitutionValidationStatus status,
    required int validatedByUserId,
    required String role,
  }) async {
    final apiStatus = switch (status) {
      InstitutionValidationStatus.pendingValidation => 'pending',
      InstitutionValidationStatus.approved => 'approved',
      InstitutionValidationStatus.rejected => 'rejected',
    };

    final r = await _dio.patch(
      '/api/institutions/$id/status',
      data: {
        'status': apiStatus,
        'validated_by_user_id': validatedByUserId,
      },
      options: Options(headers: {'x-role': role}),
    );

    return _fromApi(Map<String, dynamic>.from(r.data as Map));
  }
}
