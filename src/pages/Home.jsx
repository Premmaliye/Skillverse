import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Heart, MessageCircle, Share2, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [followActionId, setFollowActionId] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentSubmittingId, setCommentSubmittingId] = useState('');
  const [shareStatusId, setShareStatusId] = useState('');
  const [postLikes, setPostLikes] = useState({});
  const [postComments, setPostComments] = useState({});
  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();

  const loadFollowFeed = useCallback(async (followingList, viewerId) => {
    if (!Array.isArray(followingList) || followingList.length === 0) {
      setFeedPosts([]);
      setPostLikes({});
      setPostComments({});
      setFeedLoading(false);
      return;
    }

    setFeedLoading(true);
    const postIds = [];
    const { data: postData, error: postError } = await supabase
      .from('skill_posts')
      .select('id, user_id, author_username, author_avatar_url, content, media_url, media_path, media_type, created_at')
      .in('user_id', followingList)
      .order('created_at', { ascending: false });

    if (postError) {
      setError(postError.message || 'Unable to load follow feed.');
      setFeedPosts([]);
      setPostLikes({});
      setPostComments({});
      setFeedLoading(false);
      return;
    } else {
      const nextPosts = Array.isArray(postData) ? postData : [];
      nextPosts.forEach((post) => postIds.push(post.id));
      setFeedPosts(nextPosts);
    }

    if (postIds.length === 0) {
      setPostLikes({});
      setPostComments({});
      setFeedLoading(false);
      return;
    }

    const [{ data: likeData, error: likeError }, { data: commentData, error: commentError }] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds),
      supabase
        .from('post_comments')
        .select('id, post_id, user_id, author_username, author_avatar_url, content, created_at')
        .in('post_id', postIds)
        .order('created_at', { ascending: true })
    ]);

    if (likeError) {
      setError(likeError.message || 'Unable to load post likes.');
    }

    if (commentError) {
      setError(commentError.message || 'Unable to load post comments.');
    }

    const likeMap = {};
    const likedByPost = {};
    (Array.isArray(likeData) ? likeData : []).forEach((like) => {
      likeMap[like.post_id] = (likeMap[like.post_id] || 0) + 1;

      if (like.user_id === viewerId) {
        likedByPost[like.post_id] = true;
      }
    });

    const commentMap = {};
    (Array.isArray(commentData) ? commentData : []).forEach((comment) => {
      if (!commentMap[comment.post_id]) {
        commentMap[comment.post_id] = [];
      }

      commentMap[comment.post_id].push(comment);
    });

    setPostLikes(
      postIds.reduce((accumulator, postId) => {
        accumulator[postId] = {
          count: likeMap[postId] || 0,
          likedByMe: Boolean(likedByPost[postId])
        };
        return accumulator;
      }, {})
    );
    setPostComments(commentMap);

    setFeedLoading(false);
  }, []);

  useEffect(() => {
    const loadHome = async () => {
      setIsLoading(true);
      setError('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        navigate('/signin');
        return;
      }

      const userId = userData.user.id;
      setCurrentUserId(userId);

      const [{ data: profileData, error: profileError }, { data: followData, error: followError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url, city, about, experience, top_skills')
          .order('username', { ascending: true }),
        supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', userId)
      ]);

      if (profileError) {
        setError(profileError.message || 'Unable to load accounts.');
      }

      if (followError) {
        setError(followError.message || 'Unable to load follow status.');
      }

      setAccounts(Array.isArray(profileData) ? profileData : []);

      const followingList = Array.isArray(followData) ? followData.map((row) => row.following_id) : [];
      setFollowingIds(followingList);
      await loadFollowFeed(followingList, userId);
      setIsLoading(false);
    };

    loadHome();
  }, [navigate, loadFollowFeed]);

  const followingCount = useMemo(() => followingIds.length, [followingIds]);
  const filteredAccounts = useMemo(() => {
    if (!searchQuery) {
      return accounts;
    }

    return accounts.filter((account) => {
      const username = (account.username || '').toLowerCase();
      const city = (account.city || '').toLowerCase();
      const skills = Array.isArray(account.top_skills) ? account.top_skills.join(' ').toLowerCase() : '';

      return username.includes(searchQuery) || city.includes(searchQuery) || skills.includes(searchQuery);
    });
  }, [accounts, searchQuery]);

  const openProfilePage = (profileId) => {
    navigate(`/profile/${profileId}`);
  };

  const formatPostDate = (dateString) => {
    if (!dateString) {
      return 'Just now';
    }

    return new Date(dateString).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleFollow = async (targetUserId) => {
    if (!currentUserId || currentUserId === targetUserId) {
      return;
    }

    setFollowActionId(targetUserId);
    setError('');

    const isFollowing = followingIds.includes(targetUserId);

    if (isFollowing) {
      const nextFollowingIds = followingIds.filter((id) => id !== targetUserId);
      const { error: unfollowError } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);

      if (unfollowError) {
        setError(unfollowError.message || 'Unable to unfollow account.');
        setFollowActionId('');
        return;
      }

      setFollowingIds(nextFollowingIds);
      await loadFollowFeed(nextFollowingIds, currentUserId);
    } else {
      const nextFollowingIds = [...followingIds, targetUserId];
      const { error: followError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUserId,
          following_id: targetUserId
        });

      if (followError) {
        setError(followError.message || 'Unable to follow account.');
        setFollowActionId('');
        return;
      }

      setFollowingIds(nextFollowingIds);
      await loadFollowFeed(nextFollowingIds, currentUserId);
    }

    setFollowActionId('');
  };

  const toggleLike = async (postId) => {
    const likeState = postLikes[postId];
    if (!currentUserId || !likeState) {
      return;
    }

    setError('');

    if (likeState.likedByMe) {
      const { error: unlikeError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);

      if (unlikeError) {
        setError(unlikeError.message || 'Unable to remove like.');
        return;
      }
    } else {
      const { error: likeError } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: currentUserId
        });

      if (likeError) {
        setError(likeError.message || 'Unable to like post.');
        return;
      }
    }

    await loadFollowFeed(followingIds, currentUserId);
  };

  const handleCommentChange = (postId, value) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value
    }));
  };

  const submitComment = async (postId) => {
    const commentText = (commentDrafts[postId] || '').trim();
    if (!commentText || !currentUserId) {
      return;
    }

    const currentProfile = accounts.find((account) => account.id === currentUserId);
    if (!currentProfile) {
      setError('Unable to load your profile details for comments.');
      return;
    }

    setCommentSubmittingId(postId);
    setError('');

    const { error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: currentUserId,
        author_username: currentProfile.username,
        author_avatar_url: currentProfile.avatar_url || null,
        content: commentText
      });

    if (commentError) {
      setError(commentError.message || 'Unable to post comment.');
      setCommentSubmittingId('');
      return;
    }

    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: ''
    }));
    setCommentSubmittingId('');
    await loadFollowFeed(followingIds, currentUserId);
    setActiveCommentPostId(postId);
  };

  const sharePost = async (post) => {
    const text = `${post.author_username || 'SkillVerse User'} shared on SkillVerse:\n${post.content || ''}`.trim();
    const url = window.location.origin + '/home';

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'SkillVerse post',
          text,
          url
        });
      } else {
        await navigator.clipboard.writeText(`${text}\n\n${url}`);
        setShareStatusId(post.id);
        setTimeout(() => setShareStatusId(''), 1800);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(`${text}\n\n${url}`);
        setShareStatusId(post.id);
        setTimeout(() => setShareStatusId(''), 1800);
      } catch {
        setError('Unable to share this post right now.');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <main className="space-y-6">


          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold">Following Feed</h2>
                <p className="text-sm text-foreground/70">Posts from the accounts you follow.</p>
              </div>
              <div className="rounded-full border border-border px-3 py-1 text-xs text-foreground/70">
                {feedPosts.length} posts
              </div>
            </div>

            {feedLoading ? (
              <div className="space-y-3">
                <div className="h-24 rounded-xl bg-primary/10 animate-pulse" />
                <div className="h-24 rounded-xl bg-primary/10 animate-pulse" />
                <div className="h-24 rounded-xl bg-primary/10 animate-pulse" />
              </div>
            ) : feedPosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-sm text-foreground/65">
                You are not following anyone yet, so there are no posts to show.
              </div>
            ) : (
              <div className="space-y-4">
                {feedPosts.map((post) => {
                  const postOwner = post.author_username || 'SkillVerse User';
                  const postAvatar = post.author_avatar_url || '';
                  const ownerInitial = postOwner?.[0]?.toUpperCase() || 'U';

                  return (
                    <article key={post.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => openProfilePage(post.user_id)}
                          className="shrink-0 cursor-pointer"
                          aria-label={`View ${postOwner} profile`}
                        >
                          {postAvatar ? (
                            <img src={postAvatar} alt={postOwner} className="h-10 w-10 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="h-10 w-10 rounded-full border border-border bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                              {ownerInitial}
                            </div>
                          )}
                        </button>

                        <div>
                          <button
                            type="button"
                            onClick={() => openProfilePage(post.user_id)}
                            className="font-medium leading-tight hover:text-primary transition-colors text-left"
                          >
                            {postOwner}
                          </button>
                          <p className="text-xs text-foreground/60">{formatPostDate(post.created_at)}</p>
                        </div>
                      </div>

                      {post.content && <p className="text-sm text-foreground/85 whitespace-pre-line mb-3">{post.content}</p>}

                      {post.media_url && post.media_type === 'video' && (
                        <video src={post.media_url} controls className="w-full max-h-[420px] rounded-lg bg-black" />
                      )}

                      {post.media_url && post.media_type === 'image' && (
                        <img src={post.media_url} alt="Post media" className="w-full max-h-[420px] rounded-lg object-cover" />
                      )}

                      <div className="mt-4 border-t border-border pt-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => toggleLike(post.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                              postLikes[post.id]?.likedByMe
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-foreground/75 hover:bg-foreground/[0.03]'
                            }`}
                          >
                            <Heart size={16} className={postLikes[post.id]?.likedByMe ? 'fill-current' : ''} />
                            Like {postLikes[post.id]?.count ? `(${postLikes[post.id].count})` : ''}
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? '' : post.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground/75 hover:bg-foreground/[0.03] transition-colors"
                          >
                            <MessageCircle size={16} />
                            Comment {postComments[post.id]?.length ? `(${postComments[post.id].length})` : ''}
                          </button>

                          <button
                            type="button"
                            onClick={() => sharePost(post)}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground/75 hover:bg-foreground/[0.03] transition-colors"
                          >
                            <Share2 size={16} />
                            {shareStatusId === post.id ? 'Copied' : 'Share'}
                          </button>
                        </div>

                        {activeCommentPostId === post.id && (
                          <div className="mt-4 space-y-3">
                            <div className="space-y-2 max-h-64 overflow-auto pr-1">
                              {(postComments[post.id] || []).length > 0 ? (
                                postComments[post.id].map((comment) => {
                                  const commentInitial = comment.author_username?.[0]?.toUpperCase() || 'U';

                                  return (
                                    <div key={comment.id} className="flex items-start gap-3 rounded-2xl border border-border p-3 bg-foreground/[0.02]">
                                      {comment.author_avatar_url ? (
                                        <img
                                          src={comment.author_avatar_url}
                                          alt={comment.author_username}
                                          className="h-8 w-8 rounded-full object-cover border border-border"
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full border border-border bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                          {commentInitial}
                                        </div>
                                      )}

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-sm font-medium leading-none">{comment.author_username}</p>
                                          <span className="text-[11px] text-foreground/50">{formatPostDate(comment.created_at)}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-foreground/80 whitespace-pre-line">{comment.content}</p>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-sm text-foreground/60">No comments yet.</p>
                              )}
                            </div>

                            <div className="flex items-start gap-2">
                              <textarea
                                value={commentDrafts[post.id] || ''}
                                onChange={(event) => handleCommentChange(post.id, event.target.value)}
                                placeholder="Write a comment..."
                                rows={2}
                                className="min-h-12 flex-1 rounded-xl border border-border px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                              <button
                                type="button"
                                onClick={() => submitComment(post.id)}
                                disabled={commentSubmittingId === post.id || !(commentDrafts[post.id] || '').trim()}
                                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
                              >
                                {commentSubmittingId === post.id ? 'Sending...' : 'Post'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

     
        </main>

        <aside className="lg:sticky lg:top-6 lg:self-start lg:justify-self-end lg:ml-auto w-full lg:max-w-[340px] h-fit rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <UsersRound size={20} className="text-primary" /> People to follow
              </h2>
              <p className="text-sm text-foreground/60 mt-1">Find creators and connect with them.</p>
            </div>
            <div className="rounded-full border border-border px-3 py-1 text-xs text-foreground/70">
              {followingCount} following
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <div className="h-20 rounded-xl bg-primary/10 animate-pulse" />
              <div className="h-20 rounded-xl bg-primary/10 animate-pulse" />
              <div className="h-20 rounded-xl bg-primary/10 animate-pulse" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-foreground/65">
              {searchQuery ? 'No matching accounts found.' : 'No accounts found yet.'}
            </div>
          ) : (
            <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
              {filteredAccounts.map((account) => {
                const isFollowing = followingIds.includes(account.id);
                const isSelf = account.id === currentUserId;
                const initials = account.username
                  ? account.username
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('')
                  : 'U';

                return (
                  <article key={account.id} className="rounded-xl border border-border p-3.5">
                    <div className="flex items-center gap-3">
                      {account.avatar_url ? (
                        <button type="button" onClick={() => openProfilePage(account.id)} className="shrink-0">
                          <img
                          src={account.avatar_url}
                          alt={account.username}
                          className="h-12 w-12 rounded-full object-cover border border-border"
                          />
                        </button>
                      ) : (
                        <button type="button" onClick={() => openProfilePage(account.id)} className="h-12 w-12 rounded-full border border-border bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                          {initials}
                        </button>
                      )}

                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => openProfilePage(account.id)} className="font-semibold truncate flex items-center gap-2 text-left w-full">
                          <span className="truncate">{account.username}</span>
                          {isSelf && (
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/60">
                              You
                            </span>
                          )}
                        </button>
                        <p className="text-xs text-foreground/60 truncate">{account.city || 'SkillVerse creator'}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(Array.isArray(account.top_skills) ? account.top_skills : []).slice(0, 2).map((skill) => (
                            <span key={skill} className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[11px] text-foreground/70">
                              {skill}
                            </span>
                          ))}
                          {!account.top_skills?.length && (
                            <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[11px] text-foreground/50">
                              No skills listed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFollow(account.id)}
                      disabled={followActionId === account.id || isSelf}
                      className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-70 ${
                        isSelf
                          ? 'border border-border bg-background text-foreground/50 cursor-default'
                          : isFollowing
                          ? 'border border-border bg-background text-foreground hover:bg-foreground/[0.03]'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {isSelf ? (
                        'Your account'
                      ) : followActionId === account.id ? (
                        'Updating...'
                      ) : isFollowing ? (
                        <><Check size={16} /> Following</>
                      ) : (
                        'Follow'
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
