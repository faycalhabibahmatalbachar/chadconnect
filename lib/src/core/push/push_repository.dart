import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_providers.dart';

final pushRepositoryProvider = Provider<PushRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return PushRepository(dio);
});

class PushRepository {
  PushRepository(this._dio);

  final Dio _dio;

  Future<void> registerToken({
    required String token,
    required String platform,
  }) async {
    await _dio.post(
      '/api/push/register',
      data: {
        'token': token,
        'platform': platform,
      },
    );
  }
}
