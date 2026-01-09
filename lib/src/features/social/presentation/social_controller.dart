import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/current_user_provider.dart';
import '../data/social_repository.dart';
import '../domain/social_models.dart';

final socialFeedControllerProvider = NotifierProvider<SocialFeedController, AsyncValue<List<SocialPost>>>(
  SocialFeedController.new,
);

class SocialFeedController extends Notifier<AsyncValue<List<SocialPost>>> {
  @override
  AsyncValue<List<SocialPost>> build() {
    Future(() => refresh());
    return const AsyncValue.loading();
  }

  Future<void> toggleBookmark({required int postId}) async {
    final repo = ref.read(socialRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);

    final current = state.valueOrNull;
    if (current == null) return;

    final idx = current.indexWhere((p) => p.id == postId);
    if (idx < 0) return;

    final post = current[idx];
    final nextBookmarked = !post.bookmarkedByMe;

    final optimistic = [...current];
    optimistic[idx] = post.copyWith(bookmarkedByMe: nextBookmarked);
    state = AsyncValue.data(optimistic);

    try {
      if (nextBookmarked) {
        await repo.bookmarkPost(postId: postId, userId: userId);
      } else {
        await repo.unbookmarkPost(postId: postId, userId: userId);
      }
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }

  Future<void> setReaction({required int postId, required String? reaction}) async {
    final repo = ref.read(socialRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);

    final current = state.valueOrNull;
    if (current == null) return;

    final idx = current.indexWhere((p) => p.id == postId);
    if (idx < 0) return;

    final post = current[idx];

    final nextReaction = reaction == null ? null : 'love';
    final currentReaction = post.myReaction ?? (post.likedByMe ? 'love' : null);
    final didReactionChange = nextReaction != currentReaction;
    if (!didReactionChange) return;

    final nextLiked = nextReaction != null;
    final didLikeChange = nextLiked != post.likedByMe;
    final nextLikesCount = didLikeChange
        ? (post.likesCount + (nextLiked ? 1 : -1)).clamp(0, 1 << 30)
        : post.likesCount;

    final optimistic = [...current];
    optimistic[idx] = SocialPost(
      id: post.id,
      userId: post.userId,
      userDisplayName: post.userDisplayName,
      body: post.body,
      mediaUrl: post.mediaUrl,
      mediaKind: post.mediaKind,
      mediaMime: post.mediaMime,
      mediaName: post.mediaName,
      mediaSizeBytes: post.mediaSizeBytes,
      createdAt: post.createdAt,
      likesCount: nextLikesCount,
      commentsCount: post.commentsCount,
      likedByMe: nextLiked,
      bookmarkedByMe: post.bookmarkedByMe,
      myReaction: nextReaction,
      videoStatus: post.videoStatus,
      videoDurationMs: post.videoDurationMs,
      videoWidth: post.videoWidth,
      videoHeight: post.videoHeight,
      videoThumbUrl: post.videoThumbUrl,
      videoHlsUrl: post.videoHlsUrl,
      videoVariantsJson: post.videoVariantsJson,
    );
    state = AsyncValue.data(optimistic);

    try {
      if (nextReaction == null) {
        await repo.removeReaction(postId: postId, userId: userId);
      } else {
        await repo.setReaction(postId: postId, userId: userId, reaction: nextReaction);
      }
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    final repo = ref.read(socialRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);

    try {
      final posts = await repo.fetchPosts(userId: userId);
      state = AsyncValue.data(posts);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> createPost(
    String body, {
    String? mediaUrl,
    String? mediaKind,
    String? mediaMime,
    String? mediaName,
    int? mediaSizeBytes,
  }) async {
    final trimmed = body.trim();
    if (trimmed.isEmpty && mediaUrl == null) return;

    final repo = ref.read(socialRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);

    final prev = state;
    state = const AsyncValue.loading();

    try {
      await repo.createPost(
        userId: userId,
        body: trimmed,
        mediaUrl: mediaUrl,
        mediaKind: mediaKind,
        mediaMime: mediaMime,
        mediaName: mediaName,
        mediaSizeBytes: mediaSizeBytes,
      );
      final posts = await repo.fetchPosts(userId: userId);
      state = AsyncValue.data(posts);
    } catch (e, st) {
      state = prev;
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> toggleLike({required int postId}) async {
    final repo = ref.read(socialRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);

    final current = state.valueOrNull;
    if (current == null) return;

    final idx = current.indexWhere((p) => p.id == postId);
    if (idx < 0) return;

    final post = current[idx];
    final nextLiked = !post.likedByMe;
    final nextLikesCount = (post.likesCount + (nextLiked ? 1 : -1)).clamp(0, 1 << 30);

    final optimistic = [...current];
    optimistic[idx] = post.copyWith(likedByMe: nextLiked, likesCount: nextLikesCount);
    state = AsyncValue.data(optimistic);

    try {
      if (nextLiked) {
        await repo.likePost(postId: postId, userId: userId);
      } else {
        await repo.unlikePost(postId: postId, userId: userId);
      }
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }

  Future<void> bumpCommentsCount({required int postId, int delta = 1}) async {
    final current = state.valueOrNull;
    if (current == null) return;

    final idx = current.indexWhere((p) => p.id == postId);
    if (idx < 0) return;

    final post = current[idx];
    final next = [...current];
    next[idx] = post.copyWith(commentsCount: (post.commentsCount + delta).clamp(0, 1 << 30));
    state = AsyncValue.data(next);
  }

  Future<void> deletePost({required int postId}) async {
    final repo = ref.read(socialRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);

    final current = state.valueOrNull;
    if (current == null) return;

    final idx = current.indexWhere((p) => p.id == postId);
    if (idx < 0) return;

    final optimistic = [...current]..removeAt(idx);
    state = AsyncValue.data(optimistic);

    try {
      await repo.deletePost(postId: postId, userId: userId);
    } catch (_) {
      state = AsyncValue.data(current);
    }
  }

  Future<void> updatePost({required int postId, required String body}) async {
    final trimmed = body.trim();
    if (trimmed.isEmpty) return;

    final repo = ref.read(socialRepositoryProvider);
    final userId = ref.read(currentUserIdProvider);

    final current = state.valueOrNull;
    if (current == null) return;

    final idx = current.indexWhere((p) => p.id == postId);
    if (idx < 0) return;

    final prev = current;
    final optimistic = [...current];
    optimistic[idx] = SocialPost(
      id: optimistic[idx].id,
      userId: optimistic[idx].userId,
      userDisplayName: optimistic[idx].userDisplayName,
      body: trimmed,
      mediaUrl: optimistic[idx].mediaUrl,
      mediaKind: optimistic[idx].mediaKind,
      mediaMime: optimistic[idx].mediaMime,
      mediaName: optimistic[idx].mediaName,
      mediaSizeBytes: optimistic[idx].mediaSizeBytes,
      createdAt: optimistic[idx].createdAt,
      likesCount: optimistic[idx].likesCount,
      commentsCount: optimistic[idx].commentsCount,
      likedByMe: optimistic[idx].likedByMe,
      bookmarkedByMe: optimistic[idx].bookmarkedByMe,
      myReaction: optimistic[idx].myReaction,
      videoStatus: optimistic[idx].videoStatus,
      videoDurationMs: optimistic[idx].videoDurationMs,
      videoWidth: optimistic[idx].videoWidth,
      videoHeight: optimistic[idx].videoHeight,
      videoThumbUrl: optimistic[idx].videoThumbUrl,
      videoHlsUrl: optimistic[idx].videoHlsUrl,
      videoVariantsJson: optimistic[idx].videoVariantsJson,
    );
    state = AsyncValue.data(optimistic);

    try {
      await repo.updatePost(postId: postId, userId: userId, body: trimmed);
      final posts = await repo.fetchPosts(userId: userId);
      state = AsyncValue.data(posts);
    } catch (_) {
      state = AsyncValue.data(prev);
    }
  }
}
