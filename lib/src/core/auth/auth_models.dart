import 'dart:convert';

class AuthUser {
  const AuthUser({
    required this.id,
    this.phone,
    this.displayName,
    this.role,
    this.status,
  });

  final int id;
  final String? phone;
  final String? displayName;
  final String? role;
  final String? status;

  static AuthUser fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: ((json['id'] as num?) ?? 0).toInt(),
      phone: json['phone'] as String?,
      displayName: json['display_name'] as String?,
      role: json['role'] as String?,
      status: json['status'] as String?,
    );
  }

  static AuthUser? fromAccessToken(String accessToken) {
    final payload = _decodeJwtPayload(accessToken);
    if (payload == null) return null;

    final sub = payload['sub'];
    final id = int.tryParse(String(sub ?? ''));
    if (id == null || id <= 0) return null;

    final roleRaw = payload['role'];
    final role = roleRaw is String && roleRaw.trim().isNotEmpty ? roleRaw.trim() : null;

    return AuthUser(id: id, role: role);
  }
}

class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.tokenType,
    required this.expiresIn,
    required this.obtainedAt,
  });

  final String accessToken;
  final String refreshToken;
  final String tokenType;
  final int expiresIn;
  final DateTime obtainedAt;

  Map<String, dynamic> toJson() {
    return {
      'access_token': accessToken,
      'refresh_token': refreshToken,
      'token_type': tokenType,
      'expires_in': expiresIn,
      'obtained_at': obtainedAt.toIso8601String(),
    };
  }

  static AuthTokens? fromJson(Map<String, dynamic> json) {
    final accessToken = json['access_token'];
    final refreshToken = json['refresh_token'];
    final tokenType = json['token_type'];
    final expiresInRaw = json['expires_in'];
    final obtainedAtRaw = json['obtained_at'];

    if (accessToken is! String || accessToken.trim().isEmpty) return null;
    if (refreshToken is! String || refreshToken.trim().isEmpty) return null;

    final expiresIn = expiresInRaw is num
        ? expiresInRaw.toInt()
        : expiresInRaw is String
            ? int.tryParse(expiresInRaw)
            : null;

    final obtainedAt = obtainedAtRaw is String ? DateTime.tryParse(obtainedAtRaw) : null;

    return AuthTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
      tokenType: tokenType is String && tokenType.trim().isNotEmpty ? tokenType.trim() : 'Bearer',
      expiresIn: expiresIn ?? 0,
      obtainedAt: obtainedAt ?? DateTime.now(),
    );
  }
}

class AuthSession {
  const AuthSession({required this.user, required this.tokens});

  final AuthUser user;
  final AuthTokens tokens;
}

Map<String, dynamic>? _decodeJwtPayload(String token) {
  final parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    final normalized = base64Url.normalize(parts[1]);
    final payload = utf8.decode(base64Url.decode(normalized));
    final decoded = jsonDecode(payload);
    return decoded is Map ? Map<String, dynamic>.from(decoded) : null;
  } catch (_) {
    return null;
  }
}
