import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Configuration: utiliser le serveur Render par défaut en production
// Pour développement local, définir la variable d'environnement
// `API_BASE_URL` ou basculer useLocal à true si nécessaire.
const bool useLocal = false;

String _defaultBaseUrl() {
  const fromDefine = String.fromEnvironment('API_BASE_URL');
  if (fromDefine.isNotEmpty) return fromDefine;

  // Switch entre local et Render
  if (useLocal || !kReleaseMode) {
    // 10.0.2.2 = localhost depuis l'émulateur Android
    return 'http://10.0.2.2:3001';
  } else {
    // API hébergée sur Render (service API)
    return 'https://chadconnect-api-vmwt.onrender.com';
  }
}

BaseOptions apiBaseOptions(String baseUrl) {
  return BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 60),
    receiveTimeout: const Duration(minutes: 3),
    sendTimeout: const Duration(minutes: 3),
    headers: const {
      'Content-Type': 'application/json',
    },
  );
}

final apiBaseUrlProvider = Provider<String>((ref) {
  return _defaultBaseUrl();
});

final rawDioProvider = Provider<Dio>((ref) {
  final baseUrl = ref.watch(apiBaseUrlProvider);
  return Dio(apiBaseOptions(baseUrl));
});
