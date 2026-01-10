import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_interceptor.dart';
import 'api_base.dart';

export 'api_base.dart';

final dioProvider = Provider<Dio>((ref) {
  final baseUrl = ref.watch(apiBaseUrlProvider);

  final dio = Dio(apiBaseOptions(baseUrl));
  dio.interceptors.add(AuthInterceptor(ref, dio));
  return dio;
});
