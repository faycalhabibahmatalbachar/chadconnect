import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum UserRole {
  student,
  teacher,
  admin,
}

class AppSettings {
  const AppSettings({
    required this.locale,
    required this.role,
    required this.themeMode,
  });

  final Locale locale;
  final UserRole role;
  final ThemeMode themeMode;

  AppSettings copyWith({Locale? locale, UserRole? role, ThemeMode? themeMode}) {
    return AppSettings(
      locale: locale ?? this.locale,
      role: role ?? this.role,
      themeMode: themeMode ?? this.themeMode,
    );
  }
}

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden in ProviderScope');
});

final settingsControllerProvider = NotifierProvider<SettingsController, AppSettings>(SettingsController.new);

class SettingsController extends Notifier<AppSettings> {
  static const _kLocale = 'settings.locale';
  static const _kRole = 'settings.role';
  static const _kThemeMode = 'settings.themeMode';

  @override
  AppSettings build() {
    final prefs = ref.watch(sharedPreferencesProvider);

    final localeCode = prefs.getString(_kLocale) ?? 'fr';
    final roleCode = prefs.getString(_kRole) ?? 'student';
    final themeCode = prefs.getString(_kThemeMode) ?? 'system';

    final locale = Locale(localeCode);
    final role = switch (roleCode) {
      'teacher' => UserRole.teacher,
      'admin' => UserRole.admin,
      _ => UserRole.student,
    };
    final themeMode = switch (themeCode) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };

    return AppSettings(locale: locale, role: role, themeMode: themeMode);
  }

  Future<void> setLocale(Locale locale) async {
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setString(_kLocale, locale.languageCode);
    state = state.copyWith(locale: locale);
  }

  Future<void> setRole(UserRole role) async {
    final prefs = ref.read(sharedPreferencesProvider);
    final value = switch (role) {
      UserRole.student => 'student',
      UserRole.teacher => 'teacher',
      UserRole.admin => 'admin',
    };
    await prefs.setString(_kRole, value);
    state = state.copyWith(role: role);
  }

  Future<void> setThemeMode(ThemeMode themeMode) async {
    final prefs = ref.read(sharedPreferencesProvider);
    final value = switch (themeMode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };
    await prefs.setString(_kThemeMode, value);
    state = state.copyWith(themeMode: themeMode);
  }
}
