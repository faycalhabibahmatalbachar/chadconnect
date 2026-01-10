import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'auth_models.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final authTokenStorageProvider = Provider<AuthTokenStorage>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return AuthTokenStorage(storage);
});

class AuthTokenStorage {
  AuthTokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const _kTokensKey = 'auth.tokens';

  Future<AuthTokens?> readTokens() async {
    final raw = await _storage.read(key: _kTokensKey);
    if (raw == null || raw.trim().isEmpty) return null;

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return null;
      return AuthTokens.fromJson(Map<String, dynamic>.from(decoded));
    } catch (_) {
      return null;
    }
  }

  Future<void> writeTokens(AuthTokens tokens) async {
    await _storage.write(key: _kTokensKey, value: jsonEncode(tokens.toJson()));
  }

  Future<void> clear() async {
    await _storage.delete(key: _kTokensKey);
  }
}
