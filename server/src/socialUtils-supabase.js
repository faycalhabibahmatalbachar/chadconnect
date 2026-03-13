/**
 * Social Utilities - Supabase Version
 * Parsing and processing hashtags and mentions
 */

const { supabase } = require('./db-supabase');
const { notifyMention } = require('./notifications-supabase');

/**
 * Parse post body for hashtags and mentions
 * @param {string} body - Post body text
 * @returns {object} - { hashtags: string[], mentions: string[] }
 */
function parsePostBody(body) {
  const text = String(body ?? '');

  // Parse hashtags: #word (letters, numbers, underscores)
  const hashtagRegex = /#([a-zA-Z0-9_À-ÿ]+)/g;
  const hashtags = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    const tag = match[1].toLowerCase();
    if (!hashtags.includes(tag)) {
      hashtags.push(tag);
    }
  }

  // Parse mentions: @username or @display_name (alphanumeric, underscores, spaces in quotes)
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions = [];
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }

  return { hashtags, mentions };
}

/**
 * Process hashtags for a post
 * @param {number} postId - Post ID
 * @param {string[]} hashtags - Array of hashtag names
 */
async function processHashtags(postId, hashtags) {
  if (!hashtags || hashtags.length === 0) return;

  for (const tagName of hashtags) {
    try {
      // Find or create tag
      let tagId;
      
      const { data: existingTag, error: findError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .single();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert({ name: tagName })
          .select('id')
          .single();

        if (createError) {
          // Race condition - tag might have been created
          const { data: retryTag } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .single();
          tagId = retryTag?.id;
        } else {
          tagId = newTag.id;
        }
      }

      if (!tagId) continue;

      // Link post to tag
      await supabase
        .from('post_tags')
        .insert({ post_id: postId, tag_id: tagId })
        .then(({ error }) => {
          // Ignore duplicate errors
          if (error && error.code !== '23505') {
            console.error('Failed to link post tag:', error);
          }
        });
    } catch (e) {
      console.error('Failed to process hashtag:', tagName, e);
    }
  }
}

/**
 * Process mentions for a post or comment
 * @param {number} mentionerUserId - User ID who created the mention
 * @param {string} entityType - 'post' or 'comment'
 * @param {number} entityId - Post or comment ID
 * @param {string[]} mentions - Array of usernames
 */
async function processMentions(mentionerUserId, entityType, entityId, mentions) {
  if (!mentions || mentions.length === 0) return;

  for (const username of mentions) {
    try {
      // Find mentioned user by username
      const { data: mentionedUser, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (!mentionedUser || error) {
        // User not found, skip
        continue;
      }

      const mentionedUserId = mentionedUser.id;

      // Don't notify if user mentions themselves
      if (mentionedUserId === mentionerUserId) {
        continue;
      }

      // Get entity body for notification context
      let entityBody = '';
      if (entityType === 'post') {
        const { data: post } = await supabase
          .from('posts')
          .select('body')
          .eq('id', entityId)
          .single();
        entityBody = post?.body?.substring(0, 100) || '';
      } else if (entityType === 'comment') {
        const { data: comment } = await supabase
          .from('comments')
          .select('body')
          .eq('id', entityId)
          .single();
        entityBody = comment?.body?.substring(0, 100) || '';
      }

      // Create mention record
      const { error: insertError } = await supabase
        .from('mentions')
        .insert({
          mentioned_user_id: mentionedUserId,
          mentioner_user_id: mentionerUserId,
          entity_type: entityType,
          entity_id: entityId,
          position_start: 0,
          position_end: 0,
        });

      if (insertError) {
        console.error('Failed to create mention record:', insertError);
        continue;
      }

      // Send notification (async, don't wait)
      notifyMention(mentionedUserId, mentionerUserId, entityType, entityId, entityBody)
        .catch(e => console.error('Failed to send mention notification:', e));

    } catch (e) {
      console.error('Failed to process mention:', username, e);
    }
  }
}

/**
 * Get posts by hashtag
 * @param {string} tagName - Hashtag name (without #)
 * @param {object} options - { limit, offset }
 * @returns {Promise<object[]>} - Posts array
 */
async function getPostsByTag(tagName, options = {}) {
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  // Find tag
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('name', tagName.toLowerCase())
    .single();

  if (!tag) {
    return [];
  }

  // Get post IDs for tag
  const { data: postTags, error } = await supabase
    .from('post_tags')
    .select('post_id')
    .eq('tag_id', tag.id)
    .range(offset, offset + limit - 1);

  if (!postTags || postTags.length === 0) {
    return [];
  }

  const postIds = postTags.map(pt => pt.post_id);

  // Get posts
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id,
      user_id,
      body,
      media_url,
      media_kind,
      created_at,
      users!posts_user_id_fkey (id, display_name)
    `)
    .in('id', postIds)
    .eq('status', 'published');

  return posts || [];
}

/**
 * Get trending hashtags
 * @param {number} limit - Number of tags to return
 * @returns {Promise<object[]>} - Tags with post counts
 */
async function getTrendingTags(limit = 10) {
  // Get tags with post counts
  const { data: postTags, error } = await supabase
    .from('post_tags')
    .select('tag_id, tags(name)')
    .limit(1000);

  if (!postTags) {
    return [];
  }

  // Count posts per tag
  const tagCounts = {};
  postTags.forEach(pt => {
    const tagId = pt.tag_id;
    const tagName = pt.tags?.name;
    if (tagName) {
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    }
  });

  // Sort by count and return top
  const sorted = Object.entries(tagCounts)
    .map(([name, post_count]) => ({ name, post_count }))
    .sort((a, b) => b.post_count - a.post_count)
    .slice(0, limit);

  return sorted;
}

module.exports = {
  parsePostBody,
  processHashtags,
  processMentions,
  getPostsByTag,
  getTrendingTags,
};
