// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'ChadConnect';

  @override
  String get tabHome => 'Accueil';

  @override
  String get tabStudy => 'Réviser';

  @override
  String get tabSocial => 'Social';

  @override
  String get tabPlanning => 'Planning';

  @override
  String get tabProfile => 'Profil';

  @override
  String get profileRole => 'Rôle';

  @override
  String get roleStudent => 'Élève';

  @override
  String get roleTeacher => 'Enseignant';

  @override
  String get roleAdmin => 'Admin';

  @override
  String get language => 'Langue';

  @override
  String get languageFrench => 'Français';

  @override
  String get languageArabic => 'Arabe';

  @override
  String get institutions => 'Établissements';

  @override
  String get createInstitution => 'Créer un établissement';

  @override
  String get institutionName => 'Nom';

  @override
  String get institutionCity => 'Ville';

  @override
  String get fieldRequired => 'Champ obligatoire';

  @override
  String get save => 'Enregistrer';

  @override
  String get approve => 'Approuver';

  @override
  String get reject => 'Refuser';

  @override
  String get institutionStatusPending => 'En attente de validation';

  @override
  String get institutionStatusApproved => 'Validé';

  @override
  String get institutionStatusRejected => 'Rejeté';

  @override
  String get institutionSaved =>
      'Établissement enregistré (validation admin en attente)';
}
