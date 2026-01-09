class SocialPost {
  const SocialPost({
    required this.id,
    required this.userId,
    required this.userDisplayName,
    required this.body,
    required this.mediaUrl,
    required this.mediaKind,
    required this.mediaMime,
    required this.mediaName,
    required this.mediaSizeBytes,
    required this.createdAt,
    required this.likesCount,
    required this.commentsCount,
    required this.likedByMe,
    required this.bookmarkedByMe,
    this.myReaction,
    this.videoStatus,
    this.videoDurationMs,
    this.videoWidth,
    this.videoHeight,
    this.videoThumbUrl,
    this.videoHlsUrl,
    this.videoVariantsJson,
  });

  final int id;
  final int userId;
  final String? userDisplayName;
  final String body;
  final String? mediaUrl;
  final String? mediaKind;
  final String? mediaMime;
  final String? mediaName;
  final int? mediaSizeBytes;
  final DateTime createdAt;
  final int likesCount;
  final int commentsCount;
  final bool likedByMe;
  final bool bookmarkedByMe;
  final String? myReaction;

  final String? videoStatus;
  final int? videoDurationMs;
  final int? videoWidth;
  final int? videoHeight;
  final String? videoThumbUrl;
  final String? videoHlsUrl;
  final Map<String, dynamic>? videoVariantsJson;

  SocialPost copyWith({
    int? likesCount,
    int? commentsCount,
    bool? likedByMe,
    bool? bookmarkedByMe,
    String? myReaction,
    String? userDisplayName,
    String? videoStatus,
    int? videoDurationMs,
    int? videoWidth,
    int? videoHeight,
    String? videoThumbUrl,
    String? videoHlsUrl,
    Map<String, dynamic>? videoVariantsJson,
  }) {
    return SocialPost(
      id: id,
      userId: userId,
      userDisplayName: userDisplayName ?? this.userDisplayName,
      body: body,
      mediaUrl: mediaUrl,
      mediaKind: mediaKind,
      mediaMime: mediaMime,
      mediaName: mediaName,
      mediaSizeBytes: mediaSizeBytes,
      createdAt: createdAt,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      likedByMe: likedByMe ?? this.likedByMe,
      bookmarkedByMe: bookmarkedByMe ?? this.bookmarkedByMe,
      myReaction: myReaction ?? this.myReaction,
      videoStatus: videoStatus ?? this.videoStatus,
      videoDurationMs: videoDurationMs ?? this.videoDurationMs,
      videoWidth: videoWidth ?? this.videoWidth,
      videoHeight: videoHeight ?? this.videoHeight,
      videoThumbUrl: videoThumbUrl ?? this.videoThumbUrl,
      videoHlsUrl: videoHlsUrl ?? this.videoHlsUrl,
      videoVariantsJson: videoVariantsJson ?? this.videoVariantsJson,
    );
  }

  static SocialPost fromJson(Map<String, dynamic> json) {
    final createdAtRaw = json['created_at'];

    final likedRaw = json['liked_by_me'];
    final likedByMe = switch (likedRaw) {
      true => true,
      false => false,
      1 => true,
      0 => false,
      _ => false,
    };

    final bookmarkedRaw = json['bookmarked_by_me'];
    final bookmarkedByMe = switch (bookmarkedRaw) {
      true => true,
      false => false,
      1 => true,
      0 => false,
      num() => bookmarkedRaw.toInt() != 0,
      String() => bookmarkedRaw == '1' || bookmarkedRaw.toLowerCase() == 'true',
      _ => false,
    };

    final myReactionRaw = json['my_reaction'];
    final myReactionValue = myReactionRaw is String && myReactionRaw.trim().isNotEmpty ? myReactionRaw.trim() : null;
    final myReaction = myReactionValue == 'like' ? 'love' : myReactionValue;

    final userDisplayNameRaw = json['user_display_name'];
    final userDisplayName =
        userDisplayNameRaw is String && userDisplayNameRaw.trim().isNotEmpty ? userDisplayNameRaw.trim() : null;

    final variantsRaw = json['video_variants_json'];
    final videoVariantsJson = variantsRaw is Map ? Map<String, dynamic>.from(variantsRaw) : null;

    return SocialPost(
      id: (json['id'] as num).toInt(),
      userId: (json['user_id'] as num).toInt(),
      userDisplayName: userDisplayName,
      body: (json['body'] as String?) ?? '',
      mediaUrl: (json['media_url'] as String?),
      mediaKind: (json['media_kind'] as String?),
      mediaMime: (json['media_mime'] as String?),
      mediaName: (json['media_name'] as String?),
      mediaSizeBytes: (json['media_size_bytes'] as num?)?.toInt(),
      createdAt: createdAtRaw is String ? DateTime.parse(createdAtRaw) : DateTime.now(),
      likesCount: ((json['likes_count'] as num?) ?? 0).toInt(),
      commentsCount: ((json['comments_count'] as num?) ?? 0).toInt(),
      likedByMe: likedByMe,
      bookmarkedByMe: bookmarkedByMe,
      myReaction: myReaction,
      videoStatus: json['video_status'] as String?,
      videoDurationMs: (json['video_duration_ms'] as num?)?.toInt(),
      videoWidth: (json['video_width'] as num?)?.toInt(),
      videoHeight: (json['video_height'] as num?)?.toInt(),
      videoThumbUrl: json['video_thumb_url'] as String?,
      videoHlsUrl: json['video_hls_url'] as String?,
      videoVariantsJson: videoVariantsJson,
    );
  }
}

class SocialComment {
  const SocialComment({
    required this.id,
    required this.postId,
    required this.userId,
    required this.parentCommentId,
    required this.body,
    required this.createdAt,
    required this.userDisplayName,
    required this.isPostAuthor,
    required this.likesCount,
    required this.likedByMe,
  });

  final int id;
  final int postId;
  final int userId;
  final int? parentCommentId;
  final String body;
  final DateTime createdAt;
  final String? userDisplayName;
  final bool isPostAuthor;
  final int likesCount;
  final bool likedByMe;

  static SocialComment fromJson(Map<String, dynamic> json) {
    final createdAtRaw = json['created_at'];

    final isPostAuthorRaw = json['is_post_author'];
    final isPostAuthor = switch (isPostAuthorRaw) {
      true => true,
      false => false,
      num() => isPostAuthorRaw.toInt() != 0,
      String() => isPostAuthorRaw == '1' || isPostAuthorRaw.toLowerCase() == 'true',
      _ => false,
    };

    final likedRaw = json['liked_by_me'];
    final likedByMe = switch (likedRaw) {
      true => true,
      false => false,
      num() => likedRaw.toInt() != 0,
      String() => likedRaw == '1' || likedRaw.toLowerCase() == 'true',
      _ => false,
    };

    return SocialComment(
      id: (json['id'] as num).toInt(),
      postId: (json['post_id'] as num).toInt(),
      userId: (json['user_id'] as num).toInt(),
      parentCommentId: (json['parent_comment_id'] as num?)?.toInt(),
      body: (json['body'] as String?) ?? '',
      createdAt: createdAtRaw is String ? DateTime.parse(createdAtRaw) : DateTime.now(),
      userDisplayName: (json['user_display_name'] as String?),
      isPostAuthor: isPostAuthor,
      likesCount: ((json['likes_count'] as num?) ?? 0).toInt(),
      likedByMe: likedByMe,
    );
  }
}
