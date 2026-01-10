import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/planning_api_repository.dart';
import '../domain/planning_goal.dart';

class PlanningState {
  const PlanningState({
    required this.weekStart,
    required this.goals,
  });

  final DateTime weekStart;
  final List<PlanningGoal> goals;

  int get total => goals.length;
  int get doneCount => goals.where((g) => g.done).length;

  double get progress {
    if (total == 0) return 0;
    return doneCount / total;
  }

  PlanningState copyWith({DateTime? weekStart, List<PlanningGoal>? goals}) {
    return PlanningState(
      weekStart: weekStart ?? this.weekStart,
      goals: goals ?? this.goals,
    );
  }
}

final planningControllerProvider = NotifierProvider<PlanningController, PlanningState>(PlanningController.new);

class PlanningController extends Notifier<PlanningState> {
  @override
  PlanningState build() {
    final now = DateTime.now();
    final weekStart = _startOfWeek(now);
    Future(() => _loadForWeek(weekStart));
    return PlanningState(weekStart: DateTime(1970, 1, 1), goals: const [])
        .copyWith(weekStart: weekStart, goals: const []);
  }

  DateTime _startOfWeek(DateTime date) {
    final d = DateTime(date.year, date.month, date.day);
    final delta = d.weekday - DateTime.monday;
    return d.subtract(Duration(days: delta));
  }

  Future<void> _loadForWeek(DateTime weekStart) async {
    final repo = ref.read(planningApiRepositoryProvider);

    try {
      final goals = await repo.fetchGoals(weekStart: weekStart);
      state = state.copyWith(weekStart: weekStart, goals: goals);
    } catch (_) {
      state = state.copyWith(weekStart: weekStart, goals: const []);
    }
  }

  Future<void> previousWeek() async {
    final target = state.weekStart.subtract(const Duration(days: 7));
    await setWeek(target);
  }

  Future<void> nextWeek() async {
    final target = state.weekStart.add(const Duration(days: 7));
    await setWeek(target);
  }

  Future<void> setWeek(DateTime anyDayInWeek) async {
    final weekStart = _startOfWeek(anyDayInWeek);
    state = state.copyWith(weekStart: weekStart, goals: const []);
    await _loadForWeek(weekStart);
  }

  Future<void> addGoal(String title) async {
    final trimmed = title.trim();
    if (trimmed.isEmpty) return;

    final repo = ref.read(planningApiRepositoryProvider);

    try {
      await repo.createGoal(weekStart: state.weekStart, title: trimmed);
      await _loadForWeek(state.weekStart);
    } catch (_) {}
  }

  Future<void> toggleGoal(int id) async {
    final repo = ref.read(planningApiRepositoryProvider);

    final current = state.goals;
    final idx = current.indexWhere((g) => g.id == id);
    if (idx < 0) return;

    final goal = current[idx];
    final nextDone = !goal.done;

    final optimistic = [...current];
    optimistic[idx] = goal.copyWith(done: nextDone);
    state = state.copyWith(goals: optimistic);

    try {
      await repo.updateGoal(id: id, done: nextDone);
    } catch (_) {
      state = state.copyWith(goals: current);
    }
  }

  Future<void> renameGoal({required int id, required String title}) async {
    final trimmed = title.trim();
    if (trimmed.isEmpty) return;

    final repo = ref.read(planningApiRepositoryProvider);
    final current = state.goals;
    final idx = current.indexWhere((g) => g.id == id);
    if (idx < 0) return;

    final optimistic = [...current];
    optimistic[idx] = optimistic[idx].copyWith(title: trimmed);
    state = state.copyWith(goals: optimistic);

    try {
      await repo.updateGoal(id: id, title: trimmed);
    } catch (_) {
      state = state.copyWith(goals: current);
    }
  }

  Future<void> deleteGoal(int id) async {
    final repo = ref.read(planningApiRepositoryProvider);
    final current = state.goals;
    state = state.copyWith(goals: current.where((g) => g.id != id).toList(growable: false));

    try {
      await repo.deleteGoal(id: id);
    } catch (_) {
      state = state.copyWith(goals: current);
    }
  }

  Future<void> clearCompleted() async {
    final repo = ref.read(planningApiRepositoryProvider);
    final current = state.goals;
    final done = current.where((g) => g.done).toList(growable: false);
    if (done.isEmpty) return;

    state = state.copyWith(goals: current.where((g) => !g.done).toList(growable: false));

    try {
      for (final g in done) {
        await repo.deleteGoal(id: g.id);
      }
      await _loadForWeek(state.weekStart);
    } catch (_) {
      state = state.copyWith(goals: current);
    }
  }
}
