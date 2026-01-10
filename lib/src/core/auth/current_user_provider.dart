import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_controller.dart';

final currentUserIdProvider = Provider<int>((ref) {
  final session = ref.watch(authControllerProvider).valueOrNull;
  return session?.user.id ?? 0;
});
