import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_base.dart';
import 'auth_models.dart';

final authApiRepositoryProvider = Provider<AuthApiRepository>((ref) {
  final dio = ref.watch(rawDioProvider);
  return AuthApiRepository(dio);
});

class AuthApiRepository {
  AuthApiRepository(this._dio);

  final Dio _dio;

  Future<AuthSession> register({
    required String phone,
    required String displayName,
    required String password,
  }) async {
    final r = await _dio.post(
      '/api/auth/register',
      data: {
        'phone': phone,
        'display_name': displayName,
        'password': password,
      },
    );

    final data = r.data;
    if (data is! Map) throw StateError('Invalid auth/register response');

    final userRaw = data['user'];
    if (userRaw is! Map) throw StateError('Invalid auth/register user');

    final accessToken = data['access_token'];
    final refreshToken = data['refresh_token'];
    final tokenType = data['token_type'];
    final expiresIn = data['expires_in'];

    if (accessToken is! String || accessToken.trim().isEmpty) throw StateError('Missing access_token');
    if (refreshToken is! String || refreshToken.trim().isEmpty) throw StateError('Missing refresh_token');

    final tokens = AuthTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
      tokenType: tokenType is String && tokenType.trim().isNotEmpty ? tokenType.trim() : 'Bearer',
      expiresIn: expiresIn is num
          ? expiresIn.toInt()
          : expiresIn is String
              ? int.tryParse(expiresIn) ?? 0
              : 0,
      obtainedAt: DateTime.now(),
    );

    final user = AuthUser.fromJson(Map<String, dynamic>.from(userRaw));
    return AuthSession(user: user, tokens: tokens);
  }

  Future<AuthSession> login({
    required String phone,
    required String password,
  }) async {
    final r = await _dio.post(
      '/api/auth/login',
      data: {
        'phone': phone,
        'password': password,
      },
    );

    final data = r.data;
    if (data is! Map) throw StateError('Invalid auth/login response');

    final userRaw = data['user'];
    if (userRaw is! Map) throw StateError('Invalid auth/login user');

    final accessToken = data['access_token'];
    final refreshToken = data['refresh_token'];
    final tokenType = data['token_type'];
    final expiresIn = data['expires_in'];

    if (accessToken is! String || accessToken.trim().isEmpty) throw StateError('Missing access_token');
    if (refreshToken is! String || refreshToken.trim().isEmpty) throw StateError('Missing refresh_token');

    final tokens = AuthTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
      tokenType: tokenType is String && tokenType.trim().isNotEmpty ? tokenType.trim() : 'Bearer',
      expiresIn: expiresIn is num
          ? expiresIn.toInt()
          : expiresIn is String
              ? int.tryParse(expiresIn) ?? 0
              : 0,
      obtainedAt: DateTime.now(),
    );

    final user = AuthUser.fromJson(Map<String, dynamic>.from(userRaw));
    return AuthSession(user: user, tokens: tokens);
  }

  Future<AuthTokens> refresh({required String refreshToken}) async {
    final r = await _dio.post(
      '/api/auth/refresh',
      data: {
        'refresh_token': refreshToken,
      },
    );

    final data = r.data;
    if (data is! Map) throw StateError('Invalid auth/refresh response');

    final accessToken = data['access_token'];
    final newRefreshToken = data['refresh_token'];
    final tokenType = data['token_type'];
    final expiresIn = data['expires_in'];

    if (accessToken is! String || accessToken.trim().isEmpty) throw StateError('Missing access_token');
    if (newRefreshToken is! String || newRefreshToken.trim().isEmpty) throw StateError('Missing refresh_token');

    return AuthTokens(
      accessToken: accessToken,
      refreshToken: newRefreshToken,
      tokenType: tokenType is String && tokenType.trim().isNotEmpty ? tokenType.trim() : 'Bearer',
      expiresIn: expiresIn is num
          ? expiresIn.toInt()
          : expiresIn is String
              ? int.tryParse(expiresIn) ?? 0
              : 0,
      obtainedAt: DateTime.now(),
    );
  }

  Future<void> logout({required String refreshToken}) async {
    await _dio.post(
      '/api/auth/logout',
      data: {
        'refresh_token': refreshToken,
      },
    );
  }

  Future<AuthUser?> me({required String accessToken}) async {
    final r = await _dio.get(
      '/api/auth/me',
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );

    final data = r.data;
    if (data == null) return null;
    if (data is! Map) return null;

    return AuthUser.fromJson(Map<String, dynamic>.from(data));
  }
}
