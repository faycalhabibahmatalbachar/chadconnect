import 'package:shared_preferences/shared_preferences.dart';

import '../domain/planning_goal.dart';

class PlanningRepository {
  PlanningRepository(this._prefs);

  final SharedPreferences _prefs;

  static const _kPrefix = 'planning.goals.';

  String _keyForWeekStart(DateTime weekStart) {
    final y = weekStart.year.toString().padLeft(4, '0');
    final m = weekStart.month.toString().padLeft(2, '0');
    final d = weekStart.day.toString().padLeft(2, '0');
    return '$_kPrefix$y-$m-$d';
  }

  List<PlanningGoal> loadGoalsForWeek(DateTime weekStart) {
    final key = _keyForWeekStart(weekStart);
    final raw = _prefs.getString(key);
    if (raw == null || raw.isEmpty) return const [];
    try {
      return PlanningGoal.decodeList(raw);
    } catch (_) {
      return const [];
    }
  }

  Future<void> saveGoalsForWeek(DateTime weekStart, List<PlanningGoal> goals) async {
    final key = _keyForWeekStart(weekStart);
    final raw = PlanningGoal.encodeList(goals);
    await _prefs.setString(key, raw);
  }
}
