import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

String _defaultBaseUrl() {
  const fromDefine = String.fromEnvironment('API_BASE_URL');
  if (fromDefine.isNotEmpty) return fromDefine;

  return 'https://chadconnect.onrender.com';
}

final apiBaseUrlProvider = Provider<String>((ref) {
  return _defaultBaseUrl();
});

final dioProvider = Provider<Dio>((ref) {
  final baseUrl = ref.watch(apiBaseUrlProvider);

  return Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 12),
      sendTimeout: const Duration(seconds: 12),
      headers: const {
        'Content-Type': 'application/json',
      },
    ),
  );
});
