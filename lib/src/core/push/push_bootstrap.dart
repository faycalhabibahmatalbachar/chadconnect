import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../auth/current_user_provider.dart';
import 'push_repository.dart';

class PushBootstrap {
  PushBootstrap(this._ref);

  final Ref _ref;

  StreamSubscription<String>? _tokenRefreshSub;

  Future<void> init() async {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    await Permission.notification.request();

    final messaging = FirebaseMessaging.instance;

    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    await _registerCurrentToken();

    _tokenRefreshSub?.cancel();
    _tokenRefreshSub = messaging.onTokenRefresh.listen((token) async {
      await _registerToken(token);
    });

    FirebaseMessaging.onMessage.listen((message) {
      if (kDebugMode) {
        // ignore: avoid_print
        print('FCM onMessage: ${message.messageId} ${message.notification?.title}');
      }
    });
  }

  Future<void> dispose() async {
    await _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
  }

  Future<void> _registerCurrentToken() async {
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null || token.isEmpty) return;
    await _registerToken(token);
  }

  Future<void> _registerToken(String token) async {
    final userId = _ref.read(currentUserIdProvider);
    final repo = _ref.read(pushRepositoryProvider);

    await repo.registerToken(
      userId: userId,
      token: token,
      platform: 'android',
    );
  }
}

final pushBootstrapProvider = Provider<PushBootstrap>((ref) {
  return PushBootstrap(ref);
});
