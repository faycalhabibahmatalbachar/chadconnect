import 'package:animated_emoji/animated_emoji.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../domain/social_models.dart';

class PostCard extends StatefulWidget {
  const PostCard({
    super.key,
    required this.post,
    required this.baseUrl,
    required this.currentUserId,
    required this.onReactionChanged,
    required this.onComment,
    required this.onShare,
    required this.onBookmark,
    required this.onOpen,
    required this.headerTrailing,
  });

  final SocialPost post;
  final String baseUrl;
  final int currentUserId;

  final ValueChanged<String?> onReactionChanged;
  final VoidCallback onComment;
  final VoidCallback onShare;
  final VoidCallback onBookmark;
  final VoidCallback onOpen;
  final Widget? headerTrailing;

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> with SingleTickerProviderStateMixin {
  late final AnimationController _heartController;
  late final Animation<double> _heartScale;
  late final Animation<double> _heartOpacity;

  @override
  void initState() {
    super.initState();
    _heartController = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _heartScale = CurvedAnimation(parent: _heartController, curve: Curves.easeOutBack);
    _heartOpacity = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.0), weight: 35),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.0), weight: 65),
    ]).animate(CurvedAnimation(parent: _heartController, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _heartController.dispose();
    super.dispose();
  }

  String _relativeTime(DateTime dt) {
    final d = DateTime.now().difference(dt);
    if (d.inMinutes < 1) return 'À l\'instant';
    if (d.inMinutes < 60) return 'Il y a ${d.inMinutes} min';
    if (d.inHours < 24) return 'Il y a ${d.inHours} h';
    return 'Il y a ${d.inDays} j';
  }

  String get _authorLabel {
    if (widget.post.userId == widget.currentUserId) return 'Vous';
    final name = widget.post.userDisplayName;
    if (name != null && name.trim().isNotEmpty) return name.trim();
    return 'Utilisateur #${widget.post.userId}';
  }

  String? get _absoluteMediaUrl {
    final u = widget.post.mediaUrl;
    if (u == null || u.isEmpty) return null;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return '${widget.baseUrl}$u';
    return '${widget.baseUrl}/$u';
  }

  Future<void> _openMedia() async {
    final url = _absoluteMediaUrl;
    if (url == null) return;
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Widget _reactionEmoji(AnimatedEmojiData emoji, {double size = 22}) {
    return AnimatedEmoji(
      emoji,
      size: size,
      repeat: true,
    );
  }

  Widget _reactionIcon(String value, {double size = 22}) {
    switch (value) {
      case 'like':
        return _reactionEmoji(AnimatedEmojis.thumbsUp, size: size);
      case 'love':
        return _reactionEmoji(AnimatedEmojis.heartFace, size: size);
      case 'haha':
        return _reactionEmoji(AnimatedEmojis.joy, size: size);
      case 'wow':
        return _reactionEmoji(AnimatedEmojis.astonished, size: size);
      case 'sad':
        return _reactionEmoji(AnimatedEmojis.cry, size: size);
      case 'angry':
        return _reactionEmoji(AnimatedEmojis.angry, size: size);
      default:
        return Icon(Symbols.thumb_up_rounded, size: size);
    }
  }

  String get _mediaTypeLabel {
    if (widget.post.mediaKind == 'image') return 'Image';
    if (widget.post.mediaKind == 'video') return 'Vidéo';
    return 'PDF';
  }

  IconData get _mediaTypeIcon {
    if (widget.post.mediaKind == 'image') return Symbols.image_rounded;
    if (widget.post.mediaKind == 'video') return Symbols.videocam_rounded;
    return Symbols.picture_as_pdf_rounded;
  }

  String? get _absoluteVideoThumbUrl {
    final u = widget.post.videoThumbUrl;
    if (u == null || u.isEmpty) return null;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return '${widget.baseUrl}$u';
    return '${widget.baseUrl}/$u';
  }

  String? get _absoluteVideoHlsUrl {
    final u = widget.post.videoHlsUrl;
    if (u == null || u.isEmpty) return null;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return '${widget.baseUrl}$u';
    return '${widget.baseUrl}/$u';
  }

  String _formatDurationMs(int ms) {
    final total = (ms / 1000).floor();
    final h = total ~/ 3600;
    final m = (total % 3600) ~/ 60;
    final s = total % 60;
    if (h > 0) return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  bool get _isLoved {
    final r = widget.post.myReaction ?? (widget.post.likedByMe ? 'love' : null);
    return r != null;
  }

  bool get _isBookmarked => widget.post.bookmarkedByMe;

  String get _shareUrl {
    final base = Uri.tryParse(widget.baseUrl);
    if (base == null) return widget.baseUrl;
    return base.replace(path: '/social/post/${widget.post.id}').toString();
  }

  String get _shareText {
    final body = widget.post.body.trim();
    final snippet = body.length <= 160 ? body : '${body.substring(0, 160)}…';
    if (snippet.isEmpty) return _shareUrl;
    return '$snippet\n\n$_shareUrl';
  }

  Future<void> _openShareSheet() async {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    await showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      builder: (context) {
        return SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: Icon(Symbols.link_rounded, color: cs.onSurfaceVariant),
                title: const Text('Copier le lien'),
                subtitle: Text(
                  _shareUrl,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                ),
                onTap: () async {
                  await Clipboard.setData(ClipboardData(text: _shareUrl));
                  if (context.mounted) Navigator.of(context).pop();
                  if (!mounted) return;
                  ScaffoldMessenger.of(this.context).showSnackBar(
                    const SnackBar(content: Text('Lien copié')),
                  );
                },
              ),
              ListTile(
                leading: Icon(Symbols.share_rounded, color: cs.onSurfaceVariant),
                title: const Text('Partager'),
                onTap: () async {
                  if (context.mounted) Navigator.of(context).pop();
                  final box = this.context.findRenderObject() as RenderBox?;
                  final origin = box == null ? null : (box.localToGlobal(Offset.zero) & box.size);
                  await Share.share(
                    _shareText,
                    sharePositionOrigin: origin,
                  );
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  void _triggerHeartBurst() {
    HapticFeedback.lightImpact();
    _heartController.forward(from: 0);
  }

  void _toggleLove() {
    if (_isLoved) {
      widget.onReactionChanged(null);
    } else {
      widget.onReactionChanged('love');
    }
  }

  void _onDoubleTapLove() {
    if (!_isLoved) {
      widget.onReactionChanged('love');
    }
    _triggerHeartBurst();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    const instagramLoveColor = Color(0xFFE1306C);

    final mediaUrl = _absoluteMediaUrl;
    final videoThumb = _absoluteVideoThumbUrl;
    final videoReady = widget.post.mediaKind == 'video' && (_absoluteVideoHlsUrl != null) && widget.post.videoStatus == 'ready';
    final videoProcessing = widget.post.mediaKind == 'video' && (widget.post.videoStatus == null || widget.post.videoStatus == 'processing');

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onOpen,
      onDoubleTap: _onDoubleTapLove,
      child: Card(
        clipBehavior: Clip.none,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: cs.surfaceContainerHighest,
                        child: const Icon(Symbols.person_rounded, size: 18),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_authorLabel, style: theme.textTheme.titleSmall),
                            const SizedBox(height: 2),
                            Text(
                              _relativeTime(widget.post.createdAt),
                              style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      if (widget.headerTrailing != null) widget.headerTrailing!,
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (widget.post.body.trim().isNotEmpty) Text(widget.post.body, style: theme.textTheme.bodyLarge),
                  if (mediaUrl != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Icon(_mediaTypeIcon, size: 18, color: cs.onSurfaceVariant),
                        const SizedBox(width: 8),
                        Text(
                          _mediaTypeLabel,
                          style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (widget.post.mediaKind == 'video')
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            AspectRatio(
                              aspectRatio: 16 / 9,
                              child: videoThumb != null
                                  ? Image.network(
                                      videoThumb,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, _, __) {
                                        return Container(color: cs.surfaceContainerHighest);
                                      },
                                    )
                                  : Container(color: cs.surfaceContainerHighest),
                            ),
                            Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.black.withOpacity(0.00),
                                    Colors.black.withOpacity(0.35),
                                  ],
                                ),
                              ),
                            ),
                            if (videoProcessing)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.55),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                                    const SizedBox(width: 10),
                                    Text('Traitement…', style: theme.textTheme.bodySmall?.copyWith(color: Colors.white)),
                                  ],
                                ),
                              )
                            else
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.55),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Icon(
                                  Icons.play_arrow_rounded,
                                  color: Colors.white,
                                  size: 34,
                                ),
                              ),
                            Positioned(
                              right: 10,
                              bottom: 10,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (widget.post.videoDurationMs != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Colors.black.withOpacity(0.55),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        _formatDurationMs(widget.post.videoDurationMs!),
                                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.white),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )
                    else if (widget.post.mediaKind == 'image')
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          mediaUrl,
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
                      )
                    else
                      InkWell(
                        onTap: _openMedia,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: cs.surfaceContainerHighest,
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
                                    Text(widget.post.mediaName ?? 'Document', style: theme.textTheme.titleSmall),
                                    const SizedBox(height: 2),
                                    Text('Ouvrir', style: theme.textTheme.bodySmall),
                                  ],
                                ),
                              ),
                              const Icon(Symbols.open_in_new_rounded),
                            ],
                          ),
                        ),
                      ),
                  ],
                  const SizedBox(height: 10),
                  Divider(height: 1, color: cs.outlineVariant.withOpacity(0.6)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Material(
                        type: MaterialType.transparency,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () {
                            final wasLoved = _isLoved;
                            _toggleLove();
                            if (!wasLoved) {
                              _triggerHeartBurst();
                            }
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 180),
                                  transitionBuilder: (child, anim) {
                                    return ScaleTransition(scale: anim, child: child);
                                  },
                                  child: _isLoved
                                      ? Icon(
                                          Icons.favorite,
                                          key: const ValueKey('loved'),
                                          size: 20,
                                          color: instagramLoveColor,
                                        )
                                      : Icon(
                                          Icons.favorite_border,
                                          key: const ValueKey('unloved'),
                                          size: 20,
                                          color: cs.onSurfaceVariant,
                                        ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${widget.post.likesCount}',
                                  style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Material(
                        type: MaterialType.transparency,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: widget.onComment,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Symbols.chat_bubble_outline, size: 20, color: cs.onSurfaceVariant),
                                const SizedBox(width: 6),
                                Text(
                                  '${widget.post.commentsCount}',
                                  style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Material(
                        type: MaterialType.transparency,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: _openShareSheet,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Symbols.share_rounded, size: 20, color: cs.onSurfaceVariant),
                                const SizedBox(width: 6),
                                Text(
                                  '0',
                                  style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Material(
                        type: MaterialType.transparency,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: widget.onBookmark,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 180),
                              transitionBuilder: (child, anim) {
                                return ScaleTransition(scale: anim, child: child);
                              },
                              child: _isBookmarked
                                  ? Icon(
                                      Icons.bookmark,
                                      key: const ValueKey('bookmarked'),
                                      size: 20,
                                      color: cs.primary,
                                    )
                                  : Icon(
                                      Icons.bookmark_border,
                                      key: const ValueKey('unbookmarked'),
                                      size: 20,
                                      color: cs.onSurfaceVariant,
                                    ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              IgnorePointer(
                ignoring: true,
                child: AnimatedBuilder(
                  animation: _heartController,
                  builder: (context, _) {
                    if (_heartController.isDismissed) return const SizedBox.shrink();
                    return Opacity(
                      opacity: _heartOpacity.value,
                      child: Transform.scale(
                        scale: 0.6 + (_heartScale.value * 0.6),
                        child: Icon(
                          Icons.favorite,
                          size: 96,
                          color: instagramLoveColor,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
