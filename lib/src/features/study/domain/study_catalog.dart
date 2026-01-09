class StudyChapter {
  const StudyChapter({required this.id, required this.title});

  final int id;
  final String title;

  static StudyChapter fromJson(Map<String, dynamic> json) {
    return StudyChapter(
      id: (json['id'] as num).toInt(),
      title: (json['title'] as String?) ?? '',
    );
  }
}

class StudySubject {
  const StudySubject({required this.id, required this.title, required this.chapters});

  final int id;
  final String title;
  final List<StudyChapter> chapters;

  static StudySubject fromJson(Map<String, dynamic> json) {
    final chapters = (json['chapters'] as List<dynamic>? ?? const [])
        .map((e) => StudyChapter.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList(growable: false);

    return StudySubject(
      id: (json['id'] as num).toInt(),
      title: (json['title'] as String?) ?? '',
      chapters: chapters,
    );
  }
}
