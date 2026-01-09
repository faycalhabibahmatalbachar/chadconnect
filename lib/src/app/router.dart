import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/home/presentation/home_page.dart';
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

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/home',
    routes: [
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
