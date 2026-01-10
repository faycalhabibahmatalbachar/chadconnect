import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_controller.dart';
import '../features/home/presentation/home_page.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/auth/presentation/register_page.dart';
import '../features/auth/presentation/splash_page.dart';
import '../features/institutions/presentation/create_institution_page.dart';
import '../features/institutions/presentation/institutions_page.dart';
import '../features/planning/presentation/planning_page.dart';
import '../features/settings/presentation/profile_page.dart';
import '../features/social/presentation/create_post_page.dart';
import '../features/social/presentation/post_detail_page.dart';
import '../features/social/presentation/social_page.dart';
import '../features/study/presentation/study_page.dart';
import '../features/social/domain/social_models.dart';
import '../shared/bottom_nav_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

class _GoRouterRefreshNotifier extends ChangeNotifier {
  _GoRouterRefreshNotifier(this._ref) {
    _sub = _ref.listen(authControllerProvider, (_, __) {
      notifyListeners();
    });
  }

  final Ref _ref;
  late final ProviderSubscription _sub;

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = _GoRouterRefreshNotifier(ref);
  ref.onDispose(refreshNotifier.dispose);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final path = state.uri.path;

      final isSplash = path == '/splash';
      final isLogin = path == '/login';
      final isRegister = path == '/register';

      if (auth.isLoading) {
        return (isSplash || isLogin || isRegister) ? null : '/splash';
      }

      final isAuthed = auth.valueOrNull != null;

      if (!isAuthed) {
        if (isLogin || isRegister) return null;

        final from = state.uri.toString();
        final encoded = Uri.encodeComponent(from);
        return '/login?from=$encoded';
      }

      if (isSplash) return '/home';

      if (isLogin || isRegister) {
        final from = state.uri.queryParameters['from'];
        if (from != null && from.startsWith('/')) return from;
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/register',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: '/social/create',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const CreatePostPage(),
      ),
      GoRoute(
        path: '/social/post/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
          final extra = state.extra;
          final initialPost = extra is SocialPost ? extra : null;
          return PostDetailPage(postId: id, initialPost: initialPost);
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return BottomNavShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: HomePage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/study',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: StudyPage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/social',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: SocialPage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/planning',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: PlanningPage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: ProfilePage(),
                ),
                routes: [
                  GoRoute(
                    path: 'institutions',
                    builder: (context, state) => const InstitutionsPage(),
                    routes: [
                      GoRoute(
                        path: 'create',
                        builder: (context, state) => const CreateInstitutionPage(),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
