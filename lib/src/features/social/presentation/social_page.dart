import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:chadconnect/l10n/app_localizations.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/auth/current_user_provider.dart';
import '../data/social_repository.dart';
import '../domain/social_models.dart';
import 'social_controller.dart';
import 'post_card.dart';

class _PostAttachment extends StatelessWidget {
  const _PostAttachment({
    required this.theme,
    required this.baseUrl,
    required this.post,
  });

  final ThemeData theme;
  final String baseUrl;
  final SocialPost post;

  String get _absoluteUrl {
    final u = post.mediaUrl ?? '';
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return '$baseUrl$u';
    return '$baseUrl/$u';
  }

  Future<void> _open() async {
    final uri = Uri.parse(_absoluteUrl);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final kind = post.mediaKind;

    if (kind == 'image') {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          _absoluteUrl,
          fit: BoxFit.cover,
          errorBuilder: (context, _, __) {
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('Impossible de charger l\'image', style: theme.textTheme.bodyMedium),
            );
          },
        ),
      );
    }

    return InkWell(
      onTap: _open,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Symbols.picture_as_pdf_rounded),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(post.mediaName ?? 'Document', style: theme.textTheme.titleSmall),
                  const SizedBox(height: 2),
                  Text('Ouvrir', style: theme.textTheme.bodySmall),
                ],
              ),
            ),
            const Icon(Symbols.open_in_new_rounded),
          ],
        ),
      ),
    );
  }
}

class SocialPage extends ConsumerWidget {
  const SocialPage({super.key});

  String _relativeTime(DateTime dt) {
    final d = DateTime.now().difference(dt);
    if (d.inMinutes < 1) return 'À l\'instant';
    if (d.inMinutes < 60) return 'Il y a ${d.inMinutes} min';
    if (d.inHours < 24) return 'Il y a ${d.inHours} h';
    return 'Il y a ${d.inDays} j';
  }

  Future<void> _showReportDialog(BuildContext context, WidgetRef ref, {required int postId}) async {
    final repo = ref.read(socialRepositoryProvider);
    final reporterUserId = ref.read(currentUserIdProvider);

    final ok = await showDialog<bool>(
      context: context,
      useRootNavigator: true,
      builder: (context) {
        return _ReportPostDialog(
          repo: repo,
          reporterUserId: reporterUserId,
          postId: postId,
        );
      },
    );

    if (ok == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Signalement envoyé')));
    }
  }

  Future<void> _showEditPostDialog(BuildContext context, WidgetRef ref, {required SocialPost post}) async {
    final controller = TextEditingController(text: post.body);

    final ok = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Modifier le post'),
          content: TextField(
            controller: controller,
            autofocus: true,
            minLines: 3,
            maxLines: 8,
            decoration: const InputDecoration(hintText: 'Ton post…'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Mettre à jour'),
            ),
          ],
        );
      },
    );

    final nextBody = controller.text;
    controller.dispose();

    if (ok != true) return;
    await ref.read(socialFeedControllerProvider.notifier).updatePost(postId: post.id, body: nextBody);
  }

  void _openCreatePost(BuildContext context) {
    context.push('/social/create');
  }

  Future<void> _openCommentsSheet(BuildContext context, WidgetRef ref, SocialPost post) async {
    final repo = ref.read(socialRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);
    final theme = Theme.of(context);

    await showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      builder: (context) {
        return _CommentsSheet(
          theme: theme,
          repo: repo,
          userId: userId,
          post: post,
          onCommentAdded: () => ref.read(socialFeedControllerProvider.notifier).bumpCommentsCount(postId: post.id),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final baseUrl = ref.watch(apiBaseUrlProvider);
    final currentUserId = ref.watch(currentUserIdProvider);

    final bottomFabOffset = MediaQuery.of(context).padding.bottom + 96;

    final feed = ref.watch(socialFeedControllerProvider);
    final controller = ref.read(socialFeedControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tabSocial),
        actions: [
          IconButton(
            tooltip: 'Nouveau post',
            onPressed: () => _openCreatePost(context),
            icon: const Icon(Symbols.edit_square_rounded),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: Padding(
        padding: EdgeInsets.only(bottom: bottomFabOffset),
        child: FloatingActionButton(
          onPressed: () => _openCreatePost(context),
          child: const Icon(Symbols.add_rounded),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: controller.refresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: colorScheme.primary.withOpacity(0.12),
                        child: Icon(Symbols.groups_rounded, color: colorScheme.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Feed', style: theme.textTheme.titleMedium),
                            const SizedBox(height: 2),
                            Text(
                              'Groupes, annonces, discussions',
                              style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: 'Rafraîchir',
                        onPressed: controller.refresh,
                        icon: const Icon(Symbols.refresh_rounded),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              ...feed.when(
                data: (posts) {
                  if (posts.isEmpty) {
                    return [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Aucun post pour le moment', style: theme.textTheme.titleMedium),
                              const SizedBox(height: 6),
                              Text(
                                'Sois le premier à publier quelque chose.',
                                style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                              ),
                              const SizedBox(height: 12),
                              FilledButton.icon(
                                onPressed: () => _openCreatePost(context),
                                icon: const Icon(Symbols.add_rounded),
                                label: const Text('Créer un post'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ];
                  }

                  return posts.map((p) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: PostCard(
                        post: p,
                        baseUrl: baseUrl,
                        currentUserId: currentUserId,
                        onOpen: () => context.push('/social/post/${p.id}', extra: p),
                        onReactionChanged: (reaction) => ref
                            .read(socialFeedControllerProvider.notifier)
                            .setReaction(postId: p.id, reaction: reaction),
                        onComment: () => _openCommentsSheet(context, ref, p),
                        onShare: () {},
                        onBookmark: () => ref.read(socialFeedControllerProvider.notifier).toggleBookmark(postId: p.id),
                        headerTrailing: PopupMenuButton<String>(
                          icon: Icon(Symbols.more_horiz_rounded, color: colorScheme.onSurfaceVariant),
                          onSelected: (value) async {
                            if (value == 'edit') {
                              await _showEditPostDialog(context, ref, post: p);
                            } else if (value == 'delete') {
                              await controller.deletePost(postId: p.id);
                            } else if (value == 'report') {
                              await _showReportDialog(context, ref, postId: p.id);
                            }
                          },
                          itemBuilder: (context) {
                            return [
                              const PopupMenuItem(
                                value: 'report',
                                child: Text('Signaler'),
                              ),
                              if (p.userId == currentUserId)
                                const PopupMenuItem(
                                  value: 'edit',
                                  child: Text('Modifier'),
                                ),
                              if (p.userId == currentUserId)
                                const PopupMenuItem(
                                  value: 'delete',
                                  child: Text('Supprimer'),
                                ),
                            ];
                          },
                        ),
                      ),
                    );
                  }).toList();
                },
                loading: () {
                  return [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            const SizedBox(width: 12),
                            Text('Chargement…', style: theme.textTheme.bodyMedium),
                          ],
                        ),
                      ),
                    ),
                  ];
                },
                error: (e, _) {
                  return [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Erreur réseau', style: theme.textTheme.titleMedium),
                            const SizedBox(height: 6),
                            Text(
                              '$e',
                              style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                            ),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              onPressed: controller.refresh,
                              icon: const Icon(Symbols.refresh_rounded),
                              label: const Text('Réessayer'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ];
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CommentsSheet extends StatefulWidget {
  const _CommentsSheet({
    required this.theme,
    required this.repo,
    required this.userId,
    required this.post,
    required this.onCommentAdded,
  });

  final ThemeData theme;
  final SocialRepository repo;
  final int userId;
  final SocialPost post;
  final VoidCallback onCommentAdded;

  @override
  State<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends State<_CommentsSheet> {
  late Future<List<SocialComment>> _future;
  final _textController = TextEditingController();
  bool _sending = false;
  SocialComment? _replyTo;
  final Set<int> _expandedRepliesFor = <int>{};

  @override
  void initState() {
    super.initState();
    _future = widget.repo.fetchCommentsForUser(postId: widget.post.id, userId: widget.userId);
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    if (!mounted) return;
    setState(() {
      _future = widget.repo.fetchCommentsForUser(postId: widget.post.id, userId: widget.userId);
    });
  }

  String _relativeTime(DateTime dt) {
    final d = DateTime.now().difference(dt);
    if (d.inMinutes < 1) return 'À l\'instant';
    if (d.inMinutes < 60) return 'Il y a ${d.inMinutes} min';
    if (d.inHours < 24) return 'Il y a ${d.inHours} h';
    return 'Il y a ${d.inDays} j';
  }

  Future<void> _showReportCommentDialog(BuildContext context, {required int commentId}) async {
    final ok = await showDialog<bool>(
      context: context,
      useRootNavigator: true,
      builder: (context) {
        return _ReportCommentDialog(
          repo: widget.repo,
          reporterUserId: widget.userId,
          commentId: commentId,
        );
      },
    );

    if (ok == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Signalement envoyé')));
    }
  }

  Future<void> _send() async {
    final body = _textController.text.trim();
    if (body.isEmpty || _sending) return;

    if (!mounted) return;
    setState(() => _sending = true);
    try {
      if (_replyTo != null) {
        await widget.repo.replyToComment(
          postId: widget.post.id,
          userId: widget.userId,
          parentCommentId: _replyTo!.id,
          body: body,
        );
        if (!mounted) return;
        setState(() => _replyTo = null);
      } else {
        await widget.repo.addComment(postId: widget.post.id, userId: widget.userId, body: body);
      }
      widget.onCommentAdded();
      _textController.clear();
      await _reload();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  List<_ThreadItem> _buildThreadItems(List<SocialComment> roots, Map<int, List<SocialComment>> byParent) {
    final out = <_ThreadItem>[];

    void addItem(SocialComment c, int level) {
      out.add(_ThreadItem(comment: c, level: level));
      if (_expandedRepliesFor.contains(c.id)) {
        final children = byParent[c.id] ?? const <SocialComment>[];
        for (final child in children) {
          addItem(child, level + 1);
        }
      }
    }

    for (final r in roots) {
      addItem(r, 0);
    }

    return out;
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.theme;
    final colorScheme = theme.colorScheme;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomInset),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.72,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Row(
                  children: [
                    Expanded(child: Text('Commentaires', style: theme.textTheme.titleMedium)),
                    IconButton(onPressed: _reload, icon: const Icon(Symbols.refresh_rounded)),
                  ],
                ),
              ),
              Expanded(
                child: FutureBuilder<List<SocialComment>>(
                  future: _future,
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snap.hasError) {
                      return Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Erreur', style: theme.textTheme.titleMedium),
                            const SizedBox(height: 6),
                            Text(
                              '${snap.error}',
                              style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                            ),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              onPressed: _reload,
                              icon: const Icon(Symbols.refresh_rounded),
                              label: const Text('Réessayer'),
                            ),
                          ],
                        ),
                      );
                    }

                    final comments = snap.data ?? const [];
                    if (comments.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text('Aucun commentaire. Sois le premier !', style: theme.textTheme.bodyMedium),
                      );
                    }

                    final byParent = <int, List<SocialComment>>{};
                    final roots = <SocialComment>[];
                    for (final c in comments) {
                      final parentId = c.parentCommentId;
                      if (parentId == null) {
                        roots.add(c);
                      } else {
                        (byParent[parentId] ??= []).add(c);
                      }
                    }

                    final threaded = _buildThreadItems(roots, byParent);

                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                      itemCount: threaded.length,
                      separatorBuilder: (context, _) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        final item = threaded[i];
                        final c = item.comment;

                        final displayName = (c.userDisplayName?.trim().isNotEmpty ?? false)
                            ? c.userDisplayName!
                            : 'Utilisateur #${c.userId}';

                        final canDelete = c.userId == widget.userId || widget.post.userId == widget.userId;
                        final repliesCount = (byParent[c.id] ?? const <SocialComment>[]).length;
                        final isExpanded = _expandedRepliesFor.contains(c.id);

                        return Card(
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(14 + (item.level * 16).toDouble(), 14, 14, 14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(displayName, style: theme.textTheme.titleSmall),
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              if (c.isPostAuthor)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: colorScheme.primary.withOpacity(0.12),
                                                    borderRadius: BorderRadius.circular(999),
                                                  ),
                                                  child: Text(
                                                    'Auteur',
                                                    style: theme.textTheme.labelSmall?.copyWith(color: colorScheme.primary),
                                                  ),
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            _relativeTime(c.createdAt),
                                            style: theme.textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                                          ),
                                        ],
                                      ),
                                    ),
                                    PopupMenuButton<String>(
                                      icon: Icon(Symbols.more_horiz_rounded, color: colorScheme.onSurfaceVariant),
                                      onSelected: (value) async {
                                        if (value == 'reply') {
                                          if (!mounted) return;
                                          setState(() => _replyTo = c);
                                        } else if (value == 'report') {
                                          await _showReportCommentDialog(context, commentId: c.id);
                                        } else if (value == 'delete') {
                                          await widget.repo.deleteComment(commentId: c.id, userId: widget.userId);
                                          if (!mounted) return;
                                          await _reload();
                                        }
                                      },
                                      itemBuilder: (context) {
                                        return [
                                          const PopupMenuItem(
                                            value: 'reply',
                                            child: Text('Répondre'),
                                          ),
                                          const PopupMenuItem(
                                            value: 'report',
                                            child: Text('Signaler'),
                                          ),
                                          if (canDelete)
                                            const PopupMenuItem(
                                              value: 'delete',
                                              child: Text('Supprimer'),
                                            ),
                                        ];
                                      },
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(c.body, style: theme.textTheme.bodyMedium),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    OutlinedButton(
                                      onPressed: () async {
                                        if (c.likedByMe) {
                                          await widget.repo.unlikeComment(commentId: c.id, userId: widget.userId);
                                        } else {
                                          await widget.repo.likeComment(commentId: c.id, userId: widget.userId);
                                        }
                                        if (!mounted) return;
                                        await _reload();
                                      },
                                      child: Icon(c.likedByMe ? Symbols.favorite_rounded : Symbols.favorite_border_rounded),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${c.likesCount}',
                                      style: theme.textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                                    ),
                                  ],
                                ),
                                if (repliesCount > 0 && !isExpanded)
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: TextButton(
                                      onPressed: () {
                                        if (!mounted) return;
                                        setState(() => _expandedRepliesFor.add(c.id));
                                      },
                                      child: Text('Afficher $repliesCount réponse${repliesCount > 1 ? 's' : ''}'),
                                    ),
                                  ),
                                if (repliesCount > 0 && isExpanded)
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: TextButton(
                                      onPressed: () {
                                        if (!mounted) return;
                                        setState(() => _expandedRepliesFor.remove(c.id));
                                      },
                                      child: const Text('Masquer les réponses'),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_replyTo != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Réponse à ${(_replyTo!.userDisplayName?.trim().isNotEmpty ?? false) ? _replyTo!.userDisplayName! : 'Utilisateur #${_replyTo!.userId}'}',
                                style: theme.textTheme.bodySmall,
                              ),
                            ),
                            IconButton(
                              tooltip: 'Annuler',
                              onPressed: () {
                                if (!mounted) return;
                                setState(() => _replyTo = null);
                              },
                              icon: const Icon(Symbols.close_rounded),
                            ),
                          ],
                        ),
                      ),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _textController,
                            minLines: 1,
                            maxLines: 4,
                            decoration: const InputDecoration(hintText: 'Ajouter un commentaire…'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        FilledButton(
                          onPressed: _sending ? null : _send,
                          child: _sending
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('Envoyer'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ThreadItem {
  const _ThreadItem({required this.comment, required this.level});

  final SocialComment comment;
  final int level;
}

class _ReportPostDialog extends StatefulWidget {
  const _ReportPostDialog({
    required this.repo,
    required this.reporterUserId,
    required this.postId,
  });

  final SocialRepository repo;
  final int reporterUserId;
  final int postId;

  @override
  State<_ReportPostDialog> createState() => _ReportPostDialogState();
}

class _ReportPostDialogState extends State<_ReportPostDialog> {
  late final TextEditingController _reasonController;
  late final TextEditingController _detailsController;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _reasonController = TextEditingController(text: 'Contenu inapproprié');
    _detailsController = TextEditingController();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_sending) return;
    final reason = _reasonController.text.trim();
    final details = _detailsController.text.trim();
    if (reason.isEmpty) return;

    setState(() => _sending = true);
    try {
      await widget.repo.reportPost(
        reporterUserId: widget.reporterUserId,
        postId: widget.postId,
        reason: reason,
        details: details,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Signaler'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _reasonController,
              decoration: const InputDecoration(labelText: 'Raison'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _detailsController,
              minLines: 2,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Détails (optionnel)'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _sending ? null : () => Navigator.of(context).pop(false),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: _sending ? null : _submit,
          child: const Text('Envoyer'),
        ),
      ],
    );
  }
}

class _ReportCommentDialog extends StatefulWidget {
  const _ReportCommentDialog({
    required this.repo,
    required this.reporterUserId,
    required this.commentId,
  });

  final SocialRepository repo;
  final int reporterUserId;
  final int commentId;

  @override
  State<_ReportCommentDialog> createState() => _ReportCommentDialogState();
}

class _ReportCommentDialogState extends State<_ReportCommentDialog> {
  late final TextEditingController _reasonController;
  late final TextEditingController _detailsController;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _reasonController = TextEditingController(text: 'Contenu inapproprié');
    _detailsController = TextEditingController();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _detailsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_sending) return;
    final reason = _reasonController.text.trim();
    final details = _detailsController.text.trim();
    if (reason.isEmpty) return;

    setState(() => _sending = true);
    try {
      await widget.repo.reportComment(
        reporterUserId: widget.reporterUserId,
        commentId: widget.commentId,
        reason: reason,
        details: details,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Signaler'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _reasonController,
              decoration: const InputDecoration(labelText: 'Raison'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _detailsController,
              minLines: 2,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Détails (optionnel)'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _sending ? null : () => Navigator.of(context).pop(false),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: _sending ? null : _submit,
          child: const Text('Envoyer'),
        ),
      ],
    );
  }
}
