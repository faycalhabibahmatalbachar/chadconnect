import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:chadconnect/l10n/app_localizations.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/current_user_provider.dart';
import '../../settings/presentation/settings_controller.dart';
import '../data/institution_api_repository.dart';

class CreateInstitutionPage extends ConsumerStatefulWidget {
  const CreateInstitutionPage({super.key});

  @override
  ConsumerState<CreateInstitutionPage> createState() => _CreateInstitutionPageState();
}

class _CreateInstitutionPageState extends ConsumerState<CreateInstitutionPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _city = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final repo = ref.read(institutionApiRepositoryProvider);
    final role = ref.read(settingsControllerProvider).role;
    final userId = ref.read(currentUserIdProvider);

    if (role != UserRole.teacher) {
      return;
    }

    await repo.createPending(userId: userId, name: _name.text.trim(), city: _city.text.trim());

    ref.invalidate(institutionsProvider);

    if (!mounted) return;

    final l10n = AppLocalizations.of(context);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.institutionSaved)));
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.createInstitution)),
      body: SafeArea(
        bottom: false,
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: colorScheme.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(Symbols.school_rounded, color: colorScheme.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(l10n.createInstitution, style: theme.textTheme.titleMedium),
                            const SizedBox(height: 2),
                            Text(
                              'Remplis les informations ci-dessous',
                              style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _name,
                        decoration: InputDecoration(labelText: l10n.institutionName),
                        validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _city,
                        decoration: InputDecoration(labelText: l10n.institutionCity),
                        validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _submit,
                  child: Text(l10n.save),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
