enum InstitutionValidationStatus {
  pendingValidation,
  approved,
  rejected,
}
class Institution {
  Institution({
    required this.name,
    required this.city,
    required this.createdByUserId,
    required this.status,
    int? id,
    DateTime? createdAt,
  })  : id = id ?? 0,
        createdAt = createdAt ?? DateTime.now();

  int id;

  String name;
  String city;
  String createdByUserId;
  InstitutionValidationStatus status;
  DateTime createdAt;
}
