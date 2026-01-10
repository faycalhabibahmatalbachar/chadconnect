import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_api_repository.dart';
import 'auth_controller.dart';
import 'auth_models.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._ref, this._dio);

  final Ref _ref;
  final Dio _dio;

  Future<AuthTokens>? _refreshing;

  bool _isAuthPath(RequestOptions options) {
    final path = options.path;
    return path.contains('/api/auth/');
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (_isAuthPath(options)) {
      handler.next(options);
      return;
    }

    final session = _ref.read(authControllerProvider).valueOrNull;
    final token = session?.tokens.accessToken;

    if (token != null && token.trim().isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  Future<AuthTokens> _refreshTokens(String refreshToken) async {
    if (_refreshing != null) return _refreshing!;

    final future = () async {
      final repo = _ref.read(authApiRepositoryProvider);
      final tokens = await repo.refresh(refreshToken: refreshToken);
      await _ref.read(authControllerProvider.notifier).setTokens(tokens);
      return tokens;
    }();

    _refreshing = future;
    try {
      return await future;
    } finally {
      _refreshing = null;
    }
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final status = err.response?.statusCode;
    final options = err.requestOptions;

    if (status != 401 || _isAuthPath(options)) {
      handler.next(err);
      return;
    }

    if (options.extra['__retry'] == true) {
      handler.next(err);
      return;
    }

    final session = _ref.read(authControllerProvider).valueOrNull;
    final refreshToken = session?.tokens.refreshToken;

    if (refreshToken == null || refreshToken.trim().isEmpty) {
      await _ref.read(authControllerProvider.notifier).logout();
      handler.next(err);
      return;
    }

    try {
      final tokens = await _refreshTokens(refreshToken);

      options.extra['__retry'] = true;
      options.headers['Authorization'] = 'Bearer ${tokens.accessToken}';

      final response = await _dio.fetch(options);
      handler.resolve(response);
    } catch (_) {
      await _ref.read(authControllerProvider.notifier).logout();
      handler.next(err);
    }
  }
}
