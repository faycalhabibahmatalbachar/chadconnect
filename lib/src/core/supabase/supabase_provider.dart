import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'supabase_client.dart';

/// Provider for Supabase client
final supabaseProvider = Provider<SupabaseClient>((ref) {
  return supabase;
});

/// Provider for Supabase auth
final supabaseAuthProvider = Provider<GoTrueClient>((ref) {
  return supabaseAuth;
});

/// Provider for current user ID
final currentUserIdProvider = Provider<String?>((ref) {
  return currentUserId;
});

/// Provider for current access token
final accessTokenProvider = Provider<String?>((ref) {
  return currentAccessToken;
});

/// Provider for auth state changes
final authStateChangesProvider = StreamProvider<AuthState?>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange;
});

/// Provider to check if user is authenticated
final isAuthenticatedProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateChangesProvider);
  return authState.when(
    data: (state) => state?.session != null,
    loading: () => false,
    error: (_, __) => false,
  );
});
