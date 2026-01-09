import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/institution.dart';

final institutionRepositoryProvider = Provider<InstitutionRepository>((ref) {
  return const InstitutionRepository();
});

class InstitutionRepository {
  const InstitutionRepository();

  Stream<List<Institution>> watchAll() {
    throw UnimplementedError('Local repository disabled (migrated to SQL/API).');
  }

  Future<void> createPending({
    required String name,
    required String city,
    required String createdByUserId,
  }) async {
    throw UnimplementedError('Local repository disabled (migrated to SQL/API).');
  }

  Future<void> setStatus({required int id, required InstitutionValidationStatus status}) async {
    throw UnimplementedError('Local repository disabled (migrated to SQL/API).');
  }
}

final institutionsProvider = StreamProvider<List<Institution>>((ref) {
  return ref.watch(institutionRepositoryProvider).watchAll();
});
