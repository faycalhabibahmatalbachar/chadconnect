import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../domain/social_models.dart';

final socialRepositoryProvider = Provider<SocialRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return SocialRepository(dio);
});

class SocialRepository {
  SocialRepository(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> uploadFile(PlatformFile file) async {
    final hasPath = file.path != null && file.path!.isNotEmpty;

    final multipart = hasPath
        ? await MultipartFile.fromFile(file.path!, filename: file.name)
        : MultipartFile.fromBytes(file.bytes ?? const [], filename: file.name);

    final formData = FormData.fromMap({'file': multipart});
    final r = await _dio.post(
      '/api/uploads',
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        headers: const {'Content-Type': 'multipart/form-data'},
      ),
    );
    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<Map<String, dynamic>> getVideoUploadStatus({required String uploadId}) async {
    final r = await _dio.get(
      '/api/uploads/video/status',
      queryParameters: {
        'upload_id': uploadId,
      },
    );

    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<void> cancelVideoUpload({required String uploadId, required int userId}) async {
    await _dio.delete(
      '/api/uploads/video',
      queryParameters: {
        'upload_id': uploadId,
        'user_id': userId,
      },
    );
  }

  Future<Map<String, dynamic>> initVideoUpload({
    required int userId,
    required String filename,
    required String mime,
    required int sizeBytes,
  }) async {
    final r = await _dio.post(
      '/api/uploads/video/init',
      data: {
        'user_id': userId,
        'filename': filename,
        'mime': mime,
        'size_bytes': sizeBytes,
      },
    );

    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<void> uploadVideoChunk({
    required String uploadId,
    required int partNumber,
    required List<int> bytes,
  }) async {
    await _dio.put(
      '/api/uploads/video/chunk',
      queryParameters: {
        'upload_id': uploadId,
        'part': partNumber,
      },
      data: bytes,
      options: Options(
        contentType: 'application/octet-stream',
        headers: const {
          'Content-Type': 'application/octet-stream',
        },
      ),
    );
  }

  Future<Map<String, dynamic>> completeVideoUpload({
    required int userId,
    required String uploadId,
    required int totalParts,
    required String body,
  }) async {
    final r = await _dio.post(
      '/api/uploads/video/complete',
      data: {
        'user_id': userId,
        'upload_id': uploadId,
        'total_parts': totalParts,
        'body': body,
      },
    );

    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<List<SocialPost>> fetchPosts({int limit = 20, int offset = 0}) async {
    final r = await _dio.get(
      '/api/posts',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );

    final data = r.data;
    final items = (data is Map ? data['items'] : null) as List<dynamic>?;
    if (items == null) return const [];

    return items.map((e) => SocialPost.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<SocialPost> createPost({
    required String body,
    String? mediaUrl,
    String? mediaKind,
    String? mediaMime,
    String? mediaName,
    int? mediaSizeBytes,
  }) async {
    final r = await _dio.post(
      '/api/posts',
      data: {
        'body': body,
        if (mediaUrl != null) 'media_url': mediaUrl,
        if (mediaKind != null) 'media_kind': mediaKind,
        if (mediaMime != null) 'media_mime': mediaMime,
        if (mediaName != null) 'media_name': mediaName,
        if (mediaSizeBytes != null) 'media_size_bytes': mediaSizeBytes,
      },
    );

    return SocialPost.fromJson(Map<String, dynamic>.from(r.data as Map));
  }

  Future<void> likePost({required int postId}) async {
    await _dio.post('/api/posts/$postId/like');
  }

  Future<void> unlikePost({required int postId}) async {
    await _dio.delete('/api/posts/$postId/like');
  }

  Future<void> setReaction({required int postId, required String reaction}) async {
    await _dio.post(
      '/api/posts/$postId/reaction',
      data: {
        'reaction': reaction,
      },
    );
  }

  Future<void> removeReaction({required int postId}) async {
    await _dio.delete('/api/posts/$postId/reaction');
  }

  Future<void> bookmarkPost({required int postId}) async {
    await _dio.post('/api/posts/$postId/bookmark');
  }

  Future<void> unbookmarkPost({required int postId}) async {
    await _dio.delete('/api/posts/$postId/bookmark');
  }

  Future<void> deletePost({required int postId}) async {
    await _dio.delete('/api/posts/$postId');
  }

  Future<void> reportPost({
    required int postId,
    required String reason,
    String? details,
  }) async {
    await _dio.post(
      '/api/reports',
      data: {
        'target_type': 'post',
        'target_id': postId,
        'reason': reason,
        if (details != null && details.trim().isNotEmpty) 'details': details,
      },
    );
  }

  Future<List<SocialComment>> fetchComments({required int postId, int limit = 100, int offset = 0}) async {
    final r = await _dio.get(
      '/api/posts/$postId/comments',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );

    final data = r.data;
    final items = (data is Map ? data['items'] : null) as List<dynamic>?;
    if (items == null) return const [];

    return items.map((e) => SocialComment.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<List<SocialComment>> fetchCommentsForUser({required int postId, int limit = 100, int offset = 0}) {
    return fetchComments(postId: postId, limit: limit, offset: offset);
  }

  Future<SocialComment> addComment({required int postId, required String body}) async {
    final r = await _dio.post(
      '/api/posts/$postId/comments',
      data: {
        'body': body,
      },
    );

    return SocialComment.fromJson(Map<String, dynamic>.from(r.data as Map));
  }

  Future<SocialComment> replyToComment({
    required int postId,
    required int parentCommentId,
    required String body,
  }) async {
    final r = await _dio.post(
      '/api/posts/$postId/comments',
      data: {
        'body': body,
        'parent_comment_id': parentCommentId,
      },
    );
    return SocialComment.fromJson(Map<String, dynamic>.from(r.data as Map));
  }

  Future<void> deleteComment({required int commentId}) async {
    await _dio.delete('/api/comments/$commentId');
  }

  Future<void> likeComment({required int commentId}) async {
    await _dio.post('/api/comments/$commentId/like');
  }

  Future<void> unlikeComment({required int commentId}) async {
    await _dio.delete('/api/comments/$commentId/like');
  }

  Future<void> reportComment({
    required int commentId,
    required String reason,
    String? details,
  }) async {
    await _dio.post(
      '/api/reports',
      data: {
        'target_type': 'comment',
        'target_id': commentId,
        'reason': reason,
        if (details != null && details.trim().isNotEmpty) 'details': details,
      },
    );
  }

  Future<SocialPost> updatePost({required int postId, required String body}) async {
    final r = await _dio.put(
      '/api/posts/$postId',
      data: {
        'body': body,
      },
    );
    return SocialPost.fromJson(Map<String, dynamic>.from(r.data as Map));
  }
}
