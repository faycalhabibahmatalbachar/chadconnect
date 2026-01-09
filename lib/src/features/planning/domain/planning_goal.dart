import 'dart:convert';

class PlanningGoal {
  const PlanningGoal({
    required this.id,
    required this.title,
    required this.done,
    required this.createdAt,
  });

  final int id;
  final String title;
  final bool done;
  final DateTime createdAt;

  PlanningGoal copyWith({String? title, bool? done}) {
    return PlanningGoal(
      id: id,
      title: title ?? this.title,
      done: done ?? this.done,
      createdAt: createdAt,
    );
  }

  Map<String, Object?> toJson() {
    return {
      'id': id,
      'title': title,
      'done': done,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory PlanningGoal.fromJson(Map<String, Object?> json) {
    return PlanningGoal(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String,
      done: json['done'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  static List<PlanningGoal> decodeList(String raw) {
    final items = jsonDecode(raw) as List<dynamic>;
    return items
        .cast<Map<String, dynamic>>()
        .map((e) => PlanningGoal.fromJson(Map<String, Object?>.from(e)))
        .toList(growable: false);
  }

  static String encodeList(List<PlanningGoal> goals) {
    return jsonEncode(goals.map((g) => g.toJson()).toList(growable: false));
  }
}
