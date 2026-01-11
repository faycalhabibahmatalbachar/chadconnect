import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Configuration: utiliser le serveur Render par défaut en production
// Pour développement local, définir la variable d'environnement
// `API_BASE_URL` ou basculer USE_LOCAL à true si nécessaire.
const bool USE_LOCAL = false;

String _defaultBaseUrl() {
  const fromDefine = String.fromEnvironment('API_BASE_URL');
  if (fromDefine.isNotEmpty) return fromDefine;

  // Switch entre local et Render
  if (USE_LOCAL) {
    // 10.0.2.2 = localhost depuis l'émulateur Android
    return 'http://10.0.2.2:3000';
  } else {
    // API hébergée sur Render (service API)
    return 'https://chadconnect-api.onrender.com';
  }
}

BaseOptions apiBaseOptions(String baseUrl) {
  return BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 60),
    receiveTimeout: const Duration(seconds: 30),
    sendTimeout: const Duration(seconds: 30),
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
