import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:better_player/better_player.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/auth/current_user_provider.dart';
import '../data/social_repository.dart';
import '../domain/social_models.dart';
import '../../settings/presentation/settings_controller.dart';
import 'social_controller.dart';
import 'post_card.dart';

class PostDetailPage extends ConsumerStatefulWidget {
  const PostDetailPage({super.key, required this.postId, this.initialPost});

  final int postId;
  final SocialPost? initialPost;

  @override
  ConsumerState<PostDetailPage> createState() => _PostDetailPageState();
}

class _PostDetailPageState extends ConsumerState<PostDetailPage> {
  @override
  void initState() {
    super.initState();
    Future(() => ref.read(socialFeedControllerProvider.notifier).refresh());
  }

  String _relativeTime(DateTime dt) {
    final d = DateTime.now().difference(dt);
    if (d.inMinutes < 1) return 'À l\'instant';
    if (d.inMinutes < 60) return 'Il y a ${d.inMinutes} min';
    if (d.inHours < 24) return 'Il y a ${d.inHours} h';
    return 'Il y a ${d.inDays} j';
  }

  String _absoluteUrl(String baseUrl, String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return '$baseUrl$url';
    return '$baseUrl/$url';
  }

  String _absoluteMaybe(String baseUrl, String? url) {
    if (url == null || url.trim().isEmpty) return '';
    return _absoluteUrl(baseUrl, url);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final baseUrl = ref.watch(apiBaseUrlProvider);
    final currentUserId = ref.watch(currentUserIdProvider);

    final repo = ref.read(socialRepositoryProvider);

    final feed = ref.watch(socialFeedControllerProvider);
    final post = feed.valueOrNull?.firstWhereOrNull((p) => p.id == widget.postId) ?? widget.initialPost;

    if (post == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Publication')),
        body: SafeArea(
          bottom: false,
          child: Center(
            child: feed.isLoading ? const CircularProgressIndicator() : const Text('Publication introuvable'),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Publication'),
        actions: [
          IconButton(
            tooltip: 'Rafraîchir',
            onPressed: () => ref.read(socialFeedControllerProvider.notifier).refresh(),
            icon: const Icon(Symbols.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            if (post.mediaKind == 'video') ...[
              _VideoPlayerCard(
                postId: post.id,
                title: post.mediaName ?? 'Cours',
                hlsUrl: _absoluteMaybe(baseUrl, post.videoHlsUrl),
                thumbUrl: _absoluteMaybe(baseUrl, post.videoThumbUrl),
                status: post.videoStatus,
              ),
              const SizedBox(height: 12),
            ],
            PostCard(
              post: post,
              baseUrl: baseUrl,
              currentUserId: currentUserId,
              onOpen: () {},
              onReactionChanged: (reaction) => ref
                  .read(socialFeedControllerProvider.notifier)
                  .setReaction(postId: post.id, reaction: reaction),
              onComment: () {},
              onShare: () {},
              onBookmark: () => ref.read(socialFeedControllerProvider.notifier).toggleBookmark(postId: post.id),
              headerTrailing: null,
            ),
            const SizedBox(height: 12),
            Text('Commentaires', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            _CommentsBlock(
              repo: repo,
              post: post,
              currentUserId: currentUserId,
              onCommentAdded: () => ref.read(socialFeedControllerProvider.notifier).bumpCommentsCount(postId: post.id),
            ),
          ],
        ),
      ),
    );
  }
}

class _VideoPlayerCard extends ConsumerStatefulWidget {
  const _VideoPlayerCard({
    required this.postId,
    required this.title,
    required this.hlsUrl,
    required this.thumbUrl,
    required this.status,
  });

  final int postId;
  final String title;
  final String hlsUrl;
  final String thumbUrl;
  final String? status;

  @override
  ConsumerState<_VideoPlayerCard> createState() => _VideoPlayerCardState();
}

class _VideoPlayerCardState extends ConsumerState<_VideoPlayerCard> {
  BetterPlayerController? _controller;

  String get _kPosKey => 'video.last_position_ms.${widget.postId}';

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void didUpdateWidget(covariant _VideoPlayerCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.hlsUrl != widget.hlsUrl || oldWidget.status != widget.status) {
      _disposeController();
      _init();
    }
  }

  Future<void> _init() async {
    if (widget.status != 'ready' || widget.hlsUrl.isEmpty) {
      setState(() => _controller = null);
      return;
    }

    final prefs = ref.read(sharedPreferencesProvider);
    final lastMs = prefs.getInt(_kPosKey) ?? 0;

    final controller = BetterPlayerController(
      BetterPlayerConfiguration(
        aspectRatio: 16 / 9,
        autoPlay: false,
        fit: BoxFit.contain,
        controlsConfiguration: const BetterPlayerControlsConfiguration(
          enablePip: true,
          enableFullscreen: true,
          enablePlayPause: true,
          enableProgressText: true,
          enableSkips: true,
        ),
      ),
      betterPlayerDataSource: BetterPlayerDataSource(
        BetterPlayerDataSourceType.network,
        widget.hlsUrl,
        videoFormat: BetterPlayerVideoFormat.hls,
        cacheConfiguration: const BetterPlayerCacheConfiguration(useCache: true),
        notificationConfiguration: BetterPlayerNotificationConfiguration(
          showNotification: false,
        ),
      ),
    );

    if (lastMs > 0) {
      controller.addEventsListener((event) async {
        if (event.betterPlayerEventType == BetterPlayerEventType.initialized) {
          await controller.seekTo(Duration(milliseconds: lastMs));
        }
      });
    }

    controller.addEventsListener((event) async {
      if (event.betterPlayerEventType == BetterPlayerEventType.progress) {
        final p = controller.videoPlayerController?.value.position;
        if (p != null) {
          await prefs.setInt(_kPosKey, p.inMilliseconds);
        }
      }
    });

    if (!mounted) {
      controller.dispose();
      return;
    }

    setState(() => _controller = controller);
  }

  void _disposeController() {
    _controller?.dispose();
    _controller = null;
  }

  @override
  void dispose() {
    _disposeController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    final isReady = widget.status == 'ready' && widget.hlsUrl.isNotEmpty;
    final isProcessing = widget.status == null || widget.status == 'processing';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Symbols.school_rounded, color: cs.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(widget.title, style: theme.textTheme.titleMedium),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: isReady && _controller != null
                    ? BetterPlayer(controller: _controller!)
                    : Stack(
                        fit: StackFit.expand,
                        children: [
                          if (widget.thumbUrl.isNotEmpty)
                            Image.network(
                              widget.thumbUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (context, _, __) {
                                return Container(color: cs.surfaceContainerHighest);
                              },
                            )
                          else
                            Container(color: cs.surfaceContainerHighest),
                          Container(
                            color: Colors.black.withOpacity(0.35),
                          ),
                          Center(
                            child: isProcessing
                                ? Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                      ),
                                      const SizedBox(height: 10),
                                      Text('Traitement du cours…', style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white)),
                                    ],
                                  )
                                : Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.error_outline, color: Colors.white, size: 26),
                                      const SizedBox(height: 10),
                                      Text('Vidéo indisponible', style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white)),
                                    ],
                                  ),
                          ),
                        ],
                      ),
              ),
            ),
            if (isProcessing) ...[
              const SizedBox(height: 10),
              Text(
                'Ton cours est en cours de préparation (HLS). Tu peux quitter et revenir: il sera prêt automatiquement.',
                style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _AttachmentPreview extends StatelessWidget {
  const _AttachmentPreview({
    required this.theme,
    required this.absoluteUrl,
    required this.kind,
    required this.name,
  });

  final ThemeData theme;
  final String absoluteUrl;
  final String? kind;
  final String? name;

  @override
  Widget build(BuildContext context) {
    final cs = theme.colorScheme;

    if (kind == 'image') {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          absoluteUrl,
          fit: BoxFit.cover,
          errorBuilder: (context, _, __) {
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('Impossible de charger l\'image', style: theme.textTheme.bodyMedium),
            );
          },
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.outlineVariant.withOpacity(0.6)),
      ),
      child: Row(
        children: [
          Icon(Symbols.description_rounded, color: cs.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              name ?? absoluteUrl,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentsBlock extends StatefulWidget {
  const _CommentsBlock({
    required this.repo,
    required this.post,
    required this.currentUserId,
    required this.onCommentAdded,
  });

  final SocialRepository repo;
  final SocialPost post;
  final int currentUserId;
  final VoidCallback onCommentAdded;

  @override
  State<_CommentsBlock> createState() => _CommentsBlockState();
}

class _CommentsBlockState extends State<_CommentsBlock> {
  late Future<List<SocialComment>> _future;
  final _textController = TextEditingController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _future = widget.repo.fetchCommentsForUser(postId: widget.post.id);
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    if (!mounted) return;
    setState(() {
      _future = widget.repo.fetchCommentsForUser(postId: widget.post.id);
    });
  }

  Future<void> _send() async {
    if (_sending) return;
    final body = _textController.text.trim();
    if (body.isEmpty) return;

    setState(() => _sending = true);
    try {
      await widget.repo.addComment(postId: widget.post.id, body: body);
      widget.onCommentAdded();
      _textController.clear();
      await _reload();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    minLines: 1,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Ajouter un commentaire…',
                      border: InputBorder.none,
                    ),
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
          ),
        ),
        const SizedBox(height: 12),
        FutureBuilder<List<SocialComment>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              );
            }

            if (snap.hasError) {
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Erreur', style: theme.textTheme.titleMedium),
                      const SizedBox(height: 6),
                      Text('${snap.error}', style: theme.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: _reload,
                        icon: const Icon(Symbols.refresh_rounded),
                        label: const Text('Réessayer'),
                      ),
                    ],
                  ),
                ),
              );
            }

            final comments = snap.data ?? const <SocialComment>[];
            if (comments.isEmpty) {
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Aucun commentaire.', style: theme.textTheme.bodyMedium),
                ),
              );
            }

            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: comments.length,
              separatorBuilder: (context, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final c = comments[i];
                final displayName = (c.userDisplayName?.trim().isNotEmpty ?? false) ? c.userDisplayName! : 'Utilisateur #${c.userId}';

                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(displayName, style: theme.textTheme.titleSmall),
                        const SizedBox(height: 6),
                        Text(c.body, style: theme.textTheme.bodyMedium),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? firstWhereOrNull(bool Function(T) test) {
    for (final e in this) {
      if (test(e)) return e;
    }
    return null;
  }
}
