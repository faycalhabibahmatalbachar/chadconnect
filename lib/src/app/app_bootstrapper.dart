import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/push/push_bootstrap.dart';

class AppBootstrapper extends ConsumerStatefulWidget {
  const AppBootstrapper({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppBootstrapper> createState() => _AppBootstrapperState();
}

class _AppBootstrapperState extends ConsumerState<AppBootstrapper> {
  @override
  void initState() {
    super.initState();
    Future(() async {
      try {
        await ref.read(pushBootstrapProvider).init();
      } catch (_) {
      }
    });
  }

  @override
  void dispose() {
    Future(() async {
      try {
        await ref.read(pushBootstrapProvider).dispose();
      } catch (_) {
      }
    });
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
