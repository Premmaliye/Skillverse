import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, MessageCircle, Share2, UsersRound, Check, Search, MoreVertical, PenLine, Smile, Mic } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState('');
  const [currentUserId, setCurrentUserId]   = useState('');
  const [accounts, setAccounts]             = useState([]);
  const [followingIds, setFollowingIds]     = useState([]);
  const [feedPosts, setFeedPosts]           = useState([]);
  const [feedLoading, setFeedLoading]       = useState(true);
  const [followActionId, setFollowActionId] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState('');
  const [commentDrafts, setCommentDrafts]   = useState({});
  const [commentSubmittingId, setCommentSubmittingId] = useState('');
  const [shareStatusId, setShareStatusId]   = useState('');
  const [postLikes, setPostLikes]           = useState({});
  const [postComments, setPostComments]     = useState({});
  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();

  const loadFollowFeed = useCallback(async (followingList, viewerId) => {
    if (!Array.isArray(followingList) || followingList.length === 0) {
      setFeedPosts([]); setPostLikes({}); setPostComments({}); setFeedLoading(false); return;
    }
    setFeedLoading(true);
    const postIds = [];
    const { data: postData, error: postError } = await supabase.from('skill_posts').select('id,user_id,author_username,author_avatar_url,content,media_url,media_path,media_type,created_at').in('user_id', followingList).order('created_at', { ascending: false });
    if (postError) { setError(postError.message || 'Unable to load feed.'); setFeedPosts([]); setPostLikes({}); setPostComments({}); setFeedLoading(false); return; }
    const nextPosts = Array.isArray(postData) ? postData : [];
    nextPosts.forEach(p => postIds.push(p.id));
    setFeedPosts(nextPosts);
    if (postIds.length === 0) { setPostLikes({}); setPostComments({}); setFeedLoading(false); return; }
    const [{ data: likeData, error: likeErr }, { data: commentData, error: commentErr }] = await Promise.all([
      supabase.from('post_likes').select('post_id,user_id').in('post_id', postIds),
      supabase.from('post_comments').select('id,post_id,user_id,author_username,author_avatar_url,content,created_at').in('post_id', postIds).order('created_at', { ascending: true }),
    ]);
    if (likeErr) setError(likeErr.message || 'Unable to load likes.');
    if (commentErr) setError(commentErr.message || 'Unable to load comments.');
    const likeMap = {}; const likedByPost = {};
    (likeData || []).forEach(l => { likeMap[l.post_id] = (likeMap[l.post_id] || 0) + 1; if (l.user_id === viewerId) likedByPost[l.post_id] = true; });
    const commentMap = {};
    (commentData || []).forEach(c => { if (!commentMap[c.post_id]) commentMap[c.post_id] = []; commentMap[c.post_id].push(c); });
    setPostLikes(postIds.reduce((acc, id) => { acc[id] = { count: likeMap[id] || 0, likedByMe: Boolean(likedByPost[id]) }; return acc; }, {}));
    setPostComments(commentMap);
    setFeedLoading(false);
  }, []);

  const refreshPostEngagement = useCallback(async (postId) => {
    if (!postId || !currentUserId) return;

    const [{ data: likeData, error: likeErr }, { data: commentData, error: commentErr }] = await Promise.all([
      supabase.from('post_likes').select('post_id,user_id').eq('post_id', postId),
      supabase.from('post_comments').select('id,post_id,user_id,author_username,author_avatar_url,content,created_at').eq('post_id', postId).order('created_at', { ascending: true }),
    ]);

    if (likeErr) {
      setError(likeErr.message || 'Unable to load likes.');
      return;
    }

    if (commentErr) {
      setError(commentErr.message || 'Unable to load comments.');
      return;
    }

    const likeCount = (likeData || []).length;
    const likedByMe = (likeData || []).some((item) => item.user_id === currentUserId);

    setPostLikes((prev) => ({
      ...prev,
      [postId]: { count: likeCount, likedByMe }
    }));

    setPostComments((prev) => ({
      ...prev,
      [postId]: Array.isArray(commentData) ? commentData : []
    }));
  }, [currentUserId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true); setError('');
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) { navigate('/signin'); return; }
      const userId = userData.user.id;
      setCurrentUserId(userId);
      const [{ data: profileData }, { data: followData }] = await Promise.all([
        supabase.from('profiles').select('id,username,avatar_url,city,about,experience,top_skills').order('username', { ascending: true }),
        supabase.from('user_follows').select('following_id').eq('follower_id', userId),
      ]);
      setAccounts(Array.isArray(profileData) ? profileData : []);
      const followingList = (followData || []).map(r => r.following_id);
      setFollowingIds(followingList);
      await loadFollowFeed(followingList, userId);
      setIsLoading(false);
    };
    load();
  }, [navigate, loadFollowFeed]);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    return accounts.filter(a => (a.username || '').toLowerCase().includes(searchQuery) || (a.city || '').toLowerCase().includes(searchQuery) || (Array.isArray(a.top_skills) ? a.top_skills.join(' ').toLowerCase() : '').includes(searchQuery));
  }, [accounts, searchQuery]);

  const openProfile = id => navigate(`/profile/${id}`);

  const formatDate = ds => !ds ? 'Just now' : new Date(ds).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const toggleFollow = async (targetId) => {
    if (!currentUserId || currentUserId === targetId) return;
    setFollowActionId(targetId); setError('');
    const isFollowing = followingIds.includes(targetId);
    if (isFollowing) {
      const next = followingIds.filter(id => id !== targetId);
      const { error: e } = await supabase.from('user_follows').delete().eq('follower_id', currentUserId).eq('following_id', targetId);
      if (e) { setError(e.message); setFollowActionId(''); return; }
      setFollowingIds(next); await loadFollowFeed(next, currentUserId);
    } else {
      const next = [...followingIds, targetId];
      const { error: e } = await supabase.from('user_follows').insert({ follower_id: currentUserId, following_id: targetId });
      if (e) { setError(e.message); setFollowActionId(''); return; }
      setFollowingIds(next); await loadFollowFeed(next, currentUserId);
    }
    setFollowActionId('');
  };

  const toggleLike = async (postId) => {
    const s = postLikes[postId];
    if (!currentUserId || !s) return;
    setError('');
    let actionError = null;

    if (s.likedByMe) {
      const { error: unlikeError } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
      actionError = unlikeError;
    } else {
      const { error: likeError } = await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId });
      actionError = likeError;
    }

    if (actionError) {
      setError(actionError.message || 'Unable to update like.');
      return;
    }

    await refreshPostEngagement(postId);
  };

  const submitComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text || !currentUserId) return;
    const me = accounts.find(a => a.id === currentUserId);
    if (!me) { setError('Profile not loaded.'); return; }
    setCommentSubmittingId(postId); setError('');

    const { error: commentError } = await supabase.from('post_comments').insert({ post_id: postId, user_id: currentUserId, author_username: me.username, author_avatar_url: me.avatar_url || null, content: text });
    if (commentError) {
      setError(commentError.message || 'Unable to post comment.');
      setCommentSubmittingId('');
      return;
    }

    setCommentDrafts(p => ({ ...p, [postId]: '' }));
    setCommentSubmittingId('');
    await refreshPostEngagement(postId);
    setActiveCommentPostId(postId);
  };

  const sharePost = async (post) => {
    const text = `${post.author_username || 'SkillVerse User'} on SkillVerse:\n${post.content || ''}`.trim();
    const url  = window.location.origin + '/home';
    try {
      if (navigator.share) { await navigator.share({ title: 'SkillVerse post', text, url }); }
      else { await navigator.clipboard.writeText(`${text}\n\n${url}`); setShareStatusId(post.id); setTimeout(() => setShareStatusId(''), 1800); }
    } catch { try { await navigator.clipboard.writeText(`${text}\n\n${url}`); setShareStatusId(post.id); setTimeout(() => setShareStatusId(''), 1800); } catch { setError('Unable to share.'); } }
  };

  /* Reusable avatar */
  const Avatar = ({ url, name, size = 40, radius = '50%' }) => {
    const initials = (name || 'U')[0].toUpperCase();
    return url
      ? <img src={url} alt={name} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0 }} />
      : <div style={{ width: size, height: size, borderRadius: radius, background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))', border: '2px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>{initials}</div>;
  };

  return (
    <div className="home-shell" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '22px 20px 96px' }}>
      {error && <div className="alert-error animate-fade-in" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="home-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, alignItems: 'stretch', minHeight: 'calc(100vh - 110px)' }}>

        {/* ── Feed ── */}
        <main className="home-feed-main" style={{ minWidth: 0, width: '100%', maxWidth: 860, justifySelf: 'center', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 110px)', overflow: 'hidden' }}>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: '1.8rem', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Following Feed</h1>
              <p style={{ color: '#6b7280', fontSize: '0.83rem', margin: 0 }}>Posts from people you follow</p>
            </div>
            <span style={{ fontSize: '0.88rem', color: '#7a8091', background: '#f3f3f8', border: '1px solid #e3e5ef', borderRadius: 99, padding: '6px 16px', fontWeight: 600 }}>{feedPosts.length} post{feedPosts.length === 1 ? '' : 's'}</span>
          </div>

          <div className="feed-composer card" style={{ padding: '14px 16px', borderRadius: 18, marginBottom: 14, borderColor: '#dbe4ee' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PenLine size={16} color="#64748b" />
              <div style={{ flex: 1, color: '#475569', fontSize: '0.95rem' }}>What's on your mind right now?</div>
              <button type="button" className="btn-soft" style={{ padding: '7px 10px' }}>
                <Smile size={14} />
              </button>
              <button type="button" className="btn-soft" style={{ padding: '7px 10px' }}>
                <Mic size={14} />
              </button>
              <button type="button" className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                Post
              </button>
            </div>
          </div>

          <div className="home-feed-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {feedLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
              </div>
            ) : feedPosts.length === 0 ? (
              <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <UsersRound size={24} color="#94a3b8" />
                </div>
                <p style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>No posts yet</p>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Follow people from the sidebar to see their posts here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {feedPosts.map(post => {
                const liked = postLikes[post.id]?.likedByMe;
                const likeCount = postLikes[post.id]?.count || 0;
                const comments = postComments[post.id] || [];
                const showComments = activeCommentPostId === post.id;
                return (
                  <article key={post.id} className="card animate-fade-in feed-post-card" style={{ padding: '16px 18px', borderRadius: 18, borderColor: '#dbe4ee', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)', transition: 'all 0.22s' }}>
                    {/* Author */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <button type="button" onClick={() => openProfile(post.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <Avatar url={post.author_avatar_url} name={post.author_username} size={42} />
                      </button>
                      <div style={{ flex: 1 }}>
                        <button type="button" onClick={() => openProfile(post.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#0f0a1a', fontFamily: 'inherit' }}>
                          {post.author_username || 'SkillVerse User'}
                        </button>
                        <p style={{ fontSize: '0.75rem', color: '#8d93a4', margin: 0 }}>{formatDate(post.created_at)}</p>
                      </div>
                      <button
                        type="button"
                        aria-label="Post menu"
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#9ca3af', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {post.content && <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.65, marginBottom: 12, whiteSpace: 'pre-line' }}>{post.content}</p>}
                    {post.media_url && post.media_type === 'video' && <video src={post.media_url} controls style={{ width: '100%', maxHeight: 430, borderRadius: 14, background: '#000', marginBottom: 12 }} />}
                    {post.media_url && post.media_type === 'image' && <img src={post.media_url} alt="Post" style={{ width: '100%', maxHeight: 430, borderRadius: 14, objectFit: 'cover', marginBottom: 12 }} />}

                    {/* Actions */}
                    <div style={{ borderTop: '1px solid #edf0f7', paddingTop: 12 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[
                          { icon: Heart, label: liked ? `Liked (${likeCount})` : likeCount ? `Like (${likeCount})` : 'Like', onClick: () => toggleLike(post.id), active: liked, fill: liked },
                          { icon: MessageCircle, label: `Comment${comments.length ? ` (${comments.length})` : ''}`, onClick: () => setActiveCommentPostId(showComments ? '' : post.id), active: showComments },
                          { icon: Share2, label: shareStatusId === post.id ? '✓ Copied' : 'Share', onClick: () => sharePost(post) },
                        ].map(({ icon, label, onClick, active, fill }) => (
                          <button key={label} type="button" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 11, border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : '#e5e7f0'}`, background: active ? 'rgba(99,102,241,0.08)' : '#fdfdff', color: active ? '#6366f1' : '#6b7280', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit' }}
                            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = '#6366f1'; } }}
                            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#6b7280'; } }}
                          >
                            {createElement(icon, { size: 14, fill: fill ? 'currentColor' : 'none' })}
                            {label}
                          </button>
                        ))}
                      </div>

                      {showComments && (
                        <div style={{ marginTop: 14 }}>
                          {comments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
                              {comments.map(c => (
                                <div key={c.id} style={{ display: 'flex', gap: 10, background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                                  <Avatar url={c.author_avatar_url} name={c.author_username} size={30} />
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0f0a1a' }}>{c.author_username}</span>
                                      <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{formatDate(c.created_at)}</span>
                                    </div>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{c.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <textarea value={commentDrafts[post.id] || ''} onChange={e => setCommentDrafts(p => ({ ...p, [post.id]: e.target.value }))} placeholder="Write a comment…" rows={2} style={{ flex: 1, padding: '9px 12px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.85rem', fontFamily: 'inherit', color: '#0f172a', outline: 'none', resize: 'none', transition: 'border-color 0.2s' }}
                              onFocus={e => e.target.style.borderColor = '#6366f1'}
                              onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <button type="button" onClick={() => submitComment(post.id)} disabled={commentSubmittingId === post.id || !(commentDrafts[post.id] || '').trim()} className="btn-soft" style={{ alignSelf: 'flex-end', flexShrink: 0 }}>
                              {commentSubmittingId === post.id ? '…' : 'Post'}
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
          </div>
        </main>

        {/* ── Sidebar ── */}
        <aside className="home-sidebar" style={{ position: 'sticky', top: 80, alignSelf: 'start', height: 'fit-content' }}>
          <div className="card" style={{ padding: '20px 20px', borderRadius: 18, borderColor: '#e6e8f1', boxShadow: '0 1px 2px rgba(15, 10, 26, 0.04)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 110px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.02em' }}>
                  <UsersRound size={17} color="#6366f1" /> People to Follow
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Find creators and connect</p>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 99, padding: '3px 10px', fontWeight: 600 }}>{followingIds.length} following</span>
            </div>

            <div className="home-people-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                  {searchQuery ? 'No matching accounts.' : 'No accounts yet.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredAccounts.map(account => {
                  const isFollowing = followingIds.includes(account.id);
                  const isSelf = account.id === currentUserId;
                  return (
                    <div key={account.id} style={{ background: '#f7f7fc', borderRadius: 12, padding: '12px 14px', border: '1px solid #eceff6', transition: 'border-color 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#eceff6'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <button type="button" onClick={() => openProfile(account.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                          <Avatar url={account.avatar_url} name={account.username} size={36} radius={10} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button type="button" onClick={() => openProfile(account.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#0f0a1a', fontFamily: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
                              {account.username}
                            </button>
                            {isSelf && <span className="badge" style={{ fontSize: '0.62rem', padding: '1px 7px' }}>You</span>}
                          </div>
                          <p style={{ fontSize: '0.73rem', color: '#9ca3af', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.city || 'SkillVerse creator'}</p>
                        </div>
                      </div>
                      {(account.top_skills || []).slice(0,2).length > 0 && (
                        <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                          {(account.top_skills || []).slice(0,2).map(s => <span key={s} style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 99, color: '#6366f1', fontWeight: 500 }}>{s}</span>)}
                        </div>
                      )}
                      <button type="button" onClick={() => toggleFollow(account.id)} disabled={followActionId === account.id || isSelf}
                        style={{ width: '100%', padding: '6px 12px', borderRadius: 8, border: isSelf ? '1px solid #e2e8f0' : isFollowing ? '1px solid #e2e8f0' : '1px solid transparent', background: isSelf ? 'transparent' : isFollowing ? 'transparent' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: isSelf ? '#9ca3af' : isFollowing ? '#6b7280' : '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: isSelf ? 'default' : 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'inherit', boxShadow: (!isSelf && !isFollowing) ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }}
                      >
                        {isSelf ? 'Your account' : followActionId === account.id ? 'Updating…' : isFollowing ? <><Check size={12} /> Following</> : 'Follow'}
                      </button>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
