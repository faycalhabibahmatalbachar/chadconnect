import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_api_repository.dart';
import 'auth_models.dart';
import 'auth_token_storage.dart';

final authControllerProvider = NotifierProvider<AuthController, AsyncValue<AuthSession?>>(AuthController.new);

class AuthController extends Notifier<AsyncValue<AuthSession?>> {
  @override
  AsyncValue<AuthSession?> build() {
    Future(() => _bootstrap());
    return const AsyncValue.loading();
  }

  AuthSession? get session => state.valueOrNull;

  bool get isAuthenticated => session != null;

  Future<void> _bootstrap() async {
    final storage = ref.read(authTokenStorageProvider);
    final repo = ref.read(authApiRepositoryProvider);

    try {
      final stored = await storage.readTokens();
      if (stored == null) {
        state = const AsyncValue.data(null);
        return;
      }

      var tokens = stored;

      if (_isAccessTokenExpiredOrNear(tokens)) {
        try {
          tokens = await repo.refresh(refreshToken: tokens.refreshToken);
          await storage.writeTokens(tokens);
        } catch (_) {
          await storage.clear();
          state = const AsyncValue.data(null);
          return;
        }
      }

      var user = AuthUser.fromAccessToken(tokens.accessToken);
      try {
        final me = await repo.me(accessToken: tokens.accessToken);
        if (me != null) user = me;
      } catch (_) {}

      if (user == null || user.id <= 0) {
        await storage.clear();
        state = const AsyncValue.data(null);
        return;
      }

      state = AsyncValue.data(AuthSession(user: user, tokens: tokens));
    } catch (_) {
      try {
        await storage.clear();
      } catch (_) {}
      state = const AsyncValue.data(null);
    }
  }

  bool _isAccessTokenExpiredOrNear(AuthTokens tokens) {
    if (tokens.expiresIn <= 0) return false;

    final expiry = tokens.obtainedAt.add(Duration(seconds: tokens.expiresIn));
    final now = DateTime.now();

    return now.isAfter(expiry.subtract(const Duration(seconds: 15)));
  }

  Future<void> login({required String phone, required String password}) async {
    final storage = ref.read(authTokenStorageProvider);
    final repo = ref.read(authApiRepositoryProvider);

    state = const AsyncValue.loading();

    try {
      final session = await repo.login(phone: phone, password: password);
      await storage.writeTokens(session.tokens);
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> register({
    required String phone,
    required String displayName,
    required String password,
  }) async {
    final storage = ref.read(authTokenStorageProvider);
    final repo = ref.read(authApiRepositoryProvider);

    state = const AsyncValue.loading();

    try {
      final session = await repo.register(phone: phone, displayName: displayName, password: password);
      await storage.writeTokens(session.tokens);
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> setTokens(AuthTokens tokens) async {
    final storage = ref.read(authTokenStorageProvider);

    final user = AuthUser.fromAccessToken(tokens.accessToken);
    if (user == null) {
      await storage.clear();
      state = const AsyncValue.data(null);
      return;
    }

    await storage.writeTokens(tokens);

    final current = session;
    final nextUser = current?.user.id == user.id
        ? AuthUser(
            id: user.id,
            phone: current?.user.phone,
            displayName: current?.user.displayName,
            role: user.role ?? current?.user.role,
            status: current?.user.status,
          )
        : user;

    state = AsyncValue.data(AuthSession(user: nextUser, tokens: tokens));
  }

  Future<void> logout() async {
    final storage = ref.read(authTokenStorageProvider);
    final repo = ref.read(authApiRepositoryProvider);

    final refreshToken = session?.tokens.refreshToken;

    try {
      if (refreshToken != null && refreshToken.trim().isNotEmpty) {
        await repo.logout(refreshToken: refreshToken);
      }
    } catch (_) {}

    await storage.clear();
    state = const AsyncValue.data(null);
  }
}
