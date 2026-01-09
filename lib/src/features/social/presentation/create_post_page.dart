import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/current_user_provider.dart';
import '../data/social_repository.dart';
import 'social_controller.dart';

class CreatePostPage extends ConsumerStatefulWidget {
  const CreatePostPage({super.key});

  @override
  ConsumerState<CreatePostPage> createState() => _CreatePostPageState();
}

class _CreatePostPageState extends ConsumerState<CreatePostPage> {
  final _textController = TextEditingController();
  PlatformFile? _selected;
  PlatformFile? _selectedVideo;
  bool _uploading = false;
  Color? _background;

  String? _videoUploadId;
  int _videoNextPart = 1;
  double _videoProgress = 0;
  String? _videoError;
  bool _videoPauseRequested = false;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: false,
      withData: true,
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp'],
    );
    if (result == null || result.files.isEmpty) return;
    if (!mounted) return;
    setState(() => _selected = result.files.first);
  }

  Future<void> _pickVideo() async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: false,
      withData: false,
      type: FileType.custom,
      allowedExtensions: const ['mp4', 'mov', 'mkv'],
    );
    if (result == null || result.files.isEmpty) return;
    if (!mounted) return;

    setState(() {
      _selectedVideo = result.files.first;
      _selected = null;
      _videoUploadId = null;
      _videoNextPart = 1;
      _videoProgress = 0;
      _videoError = null;
    });
  }

  String _formatBytes(int bytes) {
    const kb = 1024;
    const mb = 1024 * 1024;
    const gb = 1024 * 1024 * 1024;
    if (bytes >= gb) return '${(bytes / gb).toStringAsFixed(2)} GB';
    if (bytes >= mb) return '${(bytes / mb).toStringAsFixed(1)} MB';
    if (bytes >= kb) return '${(bytes / kb).toStringAsFixed(0)} KB';
    return '$bytes B';
  }

  String _videoMimeFromName(String name) {
    final n = name.toLowerCase();
    if (n.endsWith('.mov')) return 'video/quicktime';
    if (n.endsWith('.mkv')) return 'video/x-matroska';
    return 'video/mp4';
  }

  Future<void> _uploadVideoResumable({required int userId, required String body}) async {
    final file = _selectedVideo;
    if (file == null) return;
    if (file.path == null || file.path!.isEmpty) {
      throw Exception('Chemin vidéo introuvable sur cet appareil');
    }

    final repo = ref.read(socialRepositoryProvider);
    final f = File(file.path!);
    final sizeBytes = await f.length();
    final mime = _videoMimeFromName(file.name);

    String uploadId = _videoUploadId ?? '';
    int nextPart = _videoNextPart;
    const chunkSize = 8 * 1024 * 1024; // 8MB
    final totalParts = (sizeBytes / chunkSize).ceil().clamp(1, 1 << 30);

    _videoPauseRequested = false;

    if (uploadId.isEmpty) {
      final init = await repo.initVideoUpload(
        userId: userId,
        filename: file.name,
        mime: mime,
        sizeBytes: sizeBytes,
      );
      uploadId = (init['upload_id'] as String?) ?? '';
      if (uploadId.isEmpty) throw Exception('Init upload échoué');

      setState(() {
        _videoUploadId = uploadId;
        _videoNextPart = 1;
        _videoProgress = 0;
      });
    } else {
      final status = await repo.getVideoUploadStatus(uploadId: uploadId);
      final np = (status['next_part'] as num?)?.toInt() ?? 1;
      nextPart = np;
      setState(() => _videoNextPart = nextPart);
    }

    final raf = await f.open();
    try {
      await raf.setPosition((nextPart - 1) * chunkSize);

      for (var part = nextPart; part <= totalParts; part++) {
        if (!mounted) return;

        if (_videoPauseRequested) {
          setState(() => _videoError = 'Upload en pause');
          return;
        }

        final bytes = await raf.read(chunkSize);
        if (bytes.isEmpty) break;

        await repo.uploadVideoChunk(uploadId: uploadId, partNumber: part, bytes: bytes);

        final sent = (part * chunkSize).clamp(0, sizeBytes);
        setState(() {
          _videoNextPart = part + 1;
          _videoProgress = sent / sizeBytes;
        });
      }
    } finally {
      await raf.close();
    }

    await repo.completeVideoUpload(
      userId: userId,
      uploadId: uploadId,
      totalParts: totalParts,
      body: body,
    );

    await ref.read(socialFeedControllerProvider.notifier).refresh();
  }

  Future<void> _pickPdf() async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: false,
      withData: true,
      type: FileType.custom,
      allowedExtensions: const ['pdf'],
    );
    if (result == null || result.files.isEmpty) return;
    if (!mounted) return;
    setState(() => _selected = result.files.first);
  }

  Future<void> _pickBackground() async {
    final selected = await showModalBottomSheet<Color?>(
      context: context,
      builder: (context) {
        final theme = Theme.of(context);
        final cs = theme.colorScheme;

        final colors = <Color?>[
          null,
          cs.primary.withOpacity(0.10),
          cs.tertiary.withOpacity(0.12),
          cs.secondary.withOpacity(0.12),
          Colors.black.withOpacity(0.06),
          const Color(0xFFFFF3E0),
          const Color(0xFFE8F5E9),
          const Color(0xFFE3F2FD),
        ];

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Arrière-plan', style: theme.textTheme.titleMedium),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final c in colors)
                      InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.of(context).pop(c),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: c ?? cs.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: cs.outlineVariant.withOpacity(0.6)),
                          ),
                          child: c == null ? Icon(Symbols.block_rounded, color: cs.onSurfaceVariant) : null,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    if (!mounted) return;
    setState(() => _background = selected);
  }

  Future<void> _pickCamera() async {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Caméra: bientôt disponible')),
    );
  }

  Future<void> _publish() async {
    if (_uploading) return;

    final body = _textController.text.trim();
    if (body.isEmpty && _selected == null && _selectedVideo == null) return;

    setState(() => _uploading = true);
    try {
      if (_selectedVideo != null) {
        setState(() => _videoError = null);
        await _uploadVideoResumable(userId: ref.read(currentUserIdProvider), body: body);

        if (_videoError == 'Upload en pause') return;

        if (!mounted) return;
        Navigator.of(context).pop(true);
        return;
      }

      String? mediaUrl;
      String? mediaKind;
      String? mediaMime;
      String? mediaName;
      int? mediaSizeBytes;

      if (_selected != null) {
        final repo = ref.read(socialRepositoryProvider);
        final upload = await repo.uploadFile(_selected!);
        mediaUrl = upload['url'] as String?;
        mediaKind = upload['kind'] as String?;
        mediaMime = upload['mime'] as String?;
        mediaName = upload['original_name'] as String?;
        mediaSizeBytes = (upload['size_bytes'] as num?)?.toInt();
      }

      await ref.read(socialFeedControllerProvider.notifier).createPost(
            body,
            mediaUrl: mediaUrl,
            mediaKind: mediaKind,
            mediaMime: mediaMime,
            mediaName: mediaName,
            mediaSizeBytes: mediaSizeBytes,
          );

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _videoError = '$e');
    } finally {
      if (!mounted) return;
      setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final userId = ref.watch(currentUserIdProvider);

    final bg = _background ?? cs.surface;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Créer une publication'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 10),
            child: Center(
              child: Text(
                'Utilisateur #$userId',
                style: theme.textTheme.labelLarge?.copyWith(color: cs.onSurfaceVariant),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton(
              onPressed: _uploading ? null : _publish,
              child: _uploading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Publier'),
            ),
          ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: cs.primary.withOpacity(0.10),
                          child: Icon(Symbols.person_rounded, color: cs.primary),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Quoi de neuf ?',
                            style: theme.textTheme.titleMedium,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: bg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: cs.outlineVariant.withOpacity(0.6)),
                      ),
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
                      child: Column(
                        children: [
                          TextField(
                            controller: _textController,
                            minLines: 6,
                            maxLines: 12,
                            decoration: const InputDecoration(
                              hintText: 'Écris ici…',
                              border: InputBorder.none,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              IconButton(
                                tooltip: 'Image',
                                onPressed: _uploading ? null : _pickImage,
                                icon: Icon(Symbols.image_rounded, color: cs.primary),
                              ),
                              IconButton(
                                tooltip: 'PDF',
                                onPressed: _uploading ? null : _pickPdf,
                                icon: Icon(Symbols.picture_as_pdf_rounded, color: cs.error),
                              ),
                              IconButton(
                                tooltip: 'Vidéo',
                                onPressed: _uploading ? null : _pickVideo,
                                icon: Icon(Symbols.videocam_rounded, color: cs.tertiary),
                              ),
                              IconButton(
                                tooltip: 'Arrière-plan',
                                onPressed: _uploading ? null : _pickBackground,
                                icon: Icon(Symbols.palette_rounded, color: cs.tertiary),
                              ),
                              IconButton(
                                tooltip: 'Caméra',
                                onPressed: _uploading ? null : _pickCamera,
                                icon: Icon(Symbols.photo_camera_rounded, color: cs.secondary),
                              ),
                            ],
                          ),
                          if (_selected != null) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(Symbols.attach_file_rounded, size: 18, color: cs.onSurfaceVariant),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    _selected!.name,
                                    overflow: TextOverflow.ellipsis,
                                    style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                                  ),
                                ),
                                IconButton(
                                  tooltip: 'Retirer',
                                  onPressed: _uploading ? null : () => setState(() => _selected = null),
                                  icon: const Icon(Symbols.close_rounded, size: 18),
                                ),
                              ],
                            ),
                          ],
                          if (_selectedVideo != null) ...[
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: cs.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: cs.outlineVariant.withOpacity(0.6)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Symbols.movie_rounded, color: cs.primary),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              _selectedVideo!.name,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: theme.textTheme.titleSmall,
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              _formatBytes(_selectedVideo!.size),
                                              style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                                            ),
                                          ],
                                        ),
                                      ),
                                      IconButton(
                                        tooltip: 'Retirer',
                                        onPressed: _uploading
                                            ? null
                                            : () {
                                                setState(() {
                                                  _selectedVideo = null;
                                                  _videoUploadId = null;
                                                  _videoProgress = 0;
                                                  _videoError = null;
                                                });
                                              },
                                        icon: const Icon(Symbols.close_rounded, size: 18),
                                      ),
                                    ],
                                  ),
                                  if (_uploading) ...[
                                    const SizedBox(height: 10),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: LinearProgressIndicator(value: _videoProgress == 0 ? null : _videoProgress),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      _videoUploadId == null
                                          ? 'Initialisation…'
                                          : 'Upload chunk ${(_videoNextPart - 1).clamp(0, 1 << 30)}…',
                                      style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                                    ),
                                    const SizedBox(height: 6),
                                    Align(
                                      alignment: Alignment.centerLeft,
                                      child: TextButton.icon(
                                        onPressed: () => setState(() => _videoPauseRequested = true),
                                        icon: const Icon(Symbols.pause_rounded, size: 18),
                                        label: const Text('Pause'),
                                      ),
                                    ),
                                  ],
                                  if (_videoError != null) ...[
                                    const SizedBox(height: 10),
                                    Text(
                                      _videoError!,
                                      style: theme.textTheme.bodySmall?.copyWith(color: cs.error),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        FilledButton.icon(
                                          onPressed: _uploading
                                              ? null
                                              : () async {
                                                  setState(() {
                                                    _videoError = null;
                                                    _uploading = true;
                                                  });
                                                  try {
                                                    await _uploadVideoResumable(
                                                      userId: ref.read(currentUserIdProvider),
                                                      body: _textController.text.trim(),
                                                    );
                                                    if (!mounted) return;
                                                    Navigator.of(context).pop(true);
                                                  } catch (e) {
                                                    if (!mounted) return;
                                                    setState(() => _videoError = '$e');
                                                  } finally {
                                                    if (!mounted) return;
                                                    setState(() => _uploading = false);
                                                  }
                                                },
                                          icon: const Icon(Symbols.play_arrow_rounded),
                                          label: const Text('Reprendre'),
                                        ),
                                        const SizedBox(width: 10),
                                        TextButton(
                                          onPressed: _uploading || _videoUploadId == null
                                              ? null
                                              : () async {
                                                  final repo = ref.read(socialRepositoryProvider);
                                                  await repo.cancelVideoUpload(
                                                    uploadId: _videoUploadId!,
                                                    userId: ref.read(currentUserIdProvider),
                                                  );
                                                  if (!mounted) return;
                                                  setState(() {
                                                    _selectedVideo = null;
                                                    _videoUploadId = null;
                                                    _videoProgress = 0;
                                                    _videoError = null;
                                                  });
                                                },
                                          child: const Text('Annuler'),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
