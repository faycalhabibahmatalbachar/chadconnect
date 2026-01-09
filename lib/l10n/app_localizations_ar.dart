// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'ChadConnect';

  @override
  String get tabHome => 'الرئيسية';

  @override
  String get tabStudy => 'المراجعة';

  @override
  String get tabSocial => 'اجتماعي';

  @override
  String get tabPlanning => 'الخطة';

  @override
  String get tabProfile => 'الملف الشخصي';

  @override
  String get profileRole => 'الدور';

  @override
  String get roleStudent => 'طالب';

  @override
  String get roleTeacher => 'أستاذ';

  @override
  String get roleAdmin => 'مشرف';

  @override
  String get language => 'اللغة';

  @override
  String get languageFrench => 'الفرنسية';

  @override
  String get languageArabic => 'العربية';

  @override
  String get institutions => 'المؤسسات';

  @override
  String get createInstitution => 'إنشاء مؤسسة';

  @override
  String get institutionName => 'الاسم';

  @override
  String get institutionCity => 'المدينة';

  @override
  String get fieldRequired => 'حقل مطلوب';

  @override
  String get save => 'حفظ';

  @override
  String get approve => 'قبول';

  @override
  String get reject => 'رفض';

  @override
  String get institutionStatusPending => 'بانتظار التحقق';

  @override
  String get institutionStatusApproved => 'تمت الموافقة';

  @override
  String get institutionStatusRejected => 'مرفوض';

  @override
  String get institutionSaved => 'تم حفظ المؤسسة (بانتظار موافقة الإدارة)';
}
