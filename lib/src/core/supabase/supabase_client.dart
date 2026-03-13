import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';

/// Supabase configuration for ChadConnect
class SupabaseConfig {
  // Supabase project URL
  static const String supabaseUrl = 'https://xbrlpovbwwyjvefblmuz.supabase.co';
  
  // Supabase anon key (safe to expose in client)
  static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhicmxwb3Zid3d5anZlZmJsbXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDg2ODMsImV4cCI6MjA4ODkyNDY4M30.SPPTQJg9aknHd1EL6kwl1VVHh1MMLv7Qdlkp3fsfbRg';
}

/// Initialize Supabase client
Future<void> initializeSupabase() async {
  await Supabase.initialize(
    url: SupabaseConfig.supabaseUrl,
    anonKey: SupabaseConfig.supabaseAnonKey,
    debug: kDebugMode,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
      autoRefreshToken: true,
    ),
  );
}

/// Get Supabase client instance
SupabaseClient get supabase => Supabase.instance.client;

/// Get Supabase auth instance
GoTrueClient get supabaseAuth => Supabase.instance.client.auth;

/// Check if user is authenticated
bool get isAuthenticated => Supabase.instance.client.auth.currentSession != null;

/// Get current user ID
String? get currentUserId => Supabase.instance.client.auth.currentUser?.id;

/// Get current user email
String? get currentUserEmail => Supabase.instance.client.auth.currentUser?.email;

/// Get current access token
String? get currentAccessToken => Supabase.instance.client.auth.currentSession?.accessToken;

/// Get current refresh token
String? get currentRefreshToken => Supabase.instance.client.auth.currentSession?.refreshToken;
