import 'package:shared_preferences/shared_preferences.dart';

class StudyRepository {
  StudyRepository(this._prefs);

  final SharedPreferences _prefs;

  static const _kCompleted = 'study.completed_chapters';
  static const _kFavorites = 'study.favorite_chapters';

  Set<String> loadCompletedChapters() {
    final list = _prefs.getStringList(_kCompleted) ?? const <String>[];
    return list.toSet();
  }

  Future<void> saveCompletedChapters(Set<String> ids) async {
    await _prefs.setStringList(_kCompleted, ids.toList(growable: false));
  }

  Set<String> loadFavoriteChapters() {
    final list = _prefs.getStringList(_kFavorites) ?? const <String>[];
    return list.toSet();
  }

  Future<void> saveFavoriteChapters(Set<String> ids) async {
    await _prefs.setStringList(_kFavorites, ids.toList(growable: false));
  }
}
