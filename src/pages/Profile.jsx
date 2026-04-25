import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Star, CalendarDays, Sparkles, Heart, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function RatingStars({ rating }) {
  const safeRating = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={15}
          color={value <= safeRating ? '#f59e0b' : '#d1d5db'}
          fill={value <= safeRating ? '#f59e0b' : 'none'}
        />
      ))}
    </div>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProfileId = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [profile, setProfile] = useState({
    id: '',
    username: 'SkillVerse User',
    city: 'City not set',
    about: 'Add an about section to introduce yourself.',
    experience: 'No professional title added yet.',
    avatar_url: '',
    top_skills: [],
    is_monetized: false,
    monetization_rate: null,
    created_at: '',
  });
  const [accountEmail, setAccountEmail] = useState('');
  const [recentPosts, setRecentPosts] = useState([]);
  const [postLikes, setPostLikes] = useState({});
  const [likeSavingPostId, setLikeSavingPostId] = useState('');
  const [shareStatusPostId, setShareStatusPostId] = useState('');
  const [reviewStats, setReviewStats] = useState({ count: 0, average: 0 });

  useEffect(() => {
    const loadProfile = async () => {
      setError('');
      setIsLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        navigate('/signin', { replace: true });
        return;
      }

      const userId = authData.user.id;
      setCurrentUserId(userId);
      const userEmail = authData.user.email || '';

      if (requestedProfileId && requestedProfileId !== userId) {
        navigate(`/profile/${requestedProfileId}`, { replace: true });
        return;
      }

      setAccountEmail(userEmail);

      const [{ data: profileData, error: profileError }, { data: postsData, error: postsError }, { data: reviewsData, error: reviewsError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,username,city,about,experience,avatar_url,top_skills,is_monetized,monetization_rate,created_at')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('skill_posts')
          .select('id,content,media_url,media_type,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('profile_reviews')
          .select('rating')
          .eq('profile_id', userId),
      ]);

      if (profileError) {
        setError(profileError.message || 'Unable to load your profile.');
        setIsLoading(false);
        return;
      }

      if (postsError) {
        setError(postsError.message || 'Unable to load recent posts.');
      }

      if (reviewsError) {
        setError(reviewsError.message || 'Unable to load ratings.');
      }

      const normalizedPosts = Array.isArray(postsData) ? postsData : [];
      const postIds = normalizedPosts.map((post) => post.id);

      let likesByPost = {};
      if (postIds.length > 0) {
        const { data: likeRows, error: likesError } = await supabase
          .from('post_likes')
          .select('post_id,user_id')
          .in('post_id', postIds);

        if (likesError) {
          setError(likesError.message || 'Unable to load post likes.');
        } else {
          const likesCountMap = {};
          const likedByMeMap = {};

          (likeRows || []).forEach((row) => {
            likesCountMap[row.post_id] = (likesCountMap[row.post_id] || 0) + 1;
            if (row.user_id === userId) likedByMeMap[row.post_id] = true;
          });

          likesByPost = postIds.reduce((acc, id) => {
            acc[id] = {
              count: likesCountMap[id] || 0,
              likedByMe: Boolean(likedByMeMap[id]),
            };
            return acc;
          }, {});
        }
      }

      const normalizedProfile = {
        id: profileData?.id || userId,
        username: profileData?.username || 'SkillVerse User',
        city: profileData?.city || 'City not set',
        about: profileData?.about || 'Add an about section to introduce yourself.',
        experience: profileData?.experience || 'No professional title added yet.',
        avatar_url: profileData?.avatar_url || '',
        top_skills: Array.isArray(profileData?.top_skills) ? profileData.top_skills : [],
        is_monetized: Boolean(profileData?.is_monetized),
        monetization_rate: profileData?.monetization_rate ?? null,
        created_at: profileData?.created_at || '',
      };

      const reviewRows = Array.isArray(reviewsData) ? reviewsData : [];
      const ratingTotal = reviewRows.reduce((sum, item) => sum + Number(item.rating || 0), 0);
      const ratingAverage = reviewRows.length ? ratingTotal / reviewRows.length : 0;

      setProfile(normalizedProfile);
      setRecentPosts(normalizedPosts);
      setPostLikes(likesByPost);
      setReviewStats({ count: reviewRows.length, average: ratingAverage });
      setIsLoading(false);
    };

    loadProfile();
  }, [navigate, requestedProfileId]);

  const avatarInitials = useMemo(() => {
    const name = String(profile.username || 'S').trim();
    if (!name) return 'S';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [profile.username]);

  const joinedText = useMemo(() => {
    if (!profile.created_at) return 'Recently joined SkillVerse';
    return `Joined ${new Date(profile.created_at).toLocaleString([], { month: 'short', year: 'numeric' })}`;
  }, [profile.created_at]);

  const refreshPostLikes = async (postId) => {
    const { data, error: likesError } = await supabase
      .from('post_likes')
      .select('post_id,user_id')
      .eq('post_id', postId);

    if (likesError) {
      setError(likesError.message || 'Unable to refresh likes.');
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    setPostLikes((prev) => ({
      ...prev,
      [postId]: {
        count: rows.length,
        likedByMe: rows.some((row) => row.user_id === currentUserId),
      },
    }));
  };

  const toggleLike = async (postId) => {
    if (!currentUserId || !postId) return;
    const state = postLikes[postId] || { count: 0, likedByMe: false };
    setLikeSavingPostId(postId);

    if (state.likedByMe) {
      const { error: unlikeError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);
      if (unlikeError) {
        setError(unlikeError.message || 'Unable to remove like.');
        setLikeSavingPostId('');
        return;
      }
    } else {
      const { error: likeError } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: currentUserId });
      if (likeError) {
        setError(likeError.message || 'Unable to like post.');
        setLikeSavingPostId('');
        return;
      }
    }

    await refreshPostLikes(postId);
    setLikeSavingPostId('');
  };

  const sharePost = async (post) => {
    const text = `${profile.username} on SkillVerse:\n${post.content || ''}`.trim();
    const url = `${window.location.origin}/profile/${profile.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'SkillVerse post', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n\n${url}`);
        setShareStatusPostId(post.id);
        setTimeout(() => setShareStatusPostId(''), 1800);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(`${text}\n\n${url}`);
        setShareStatusPostId(post.id);
        setTimeout(() => setShareStatusPostId(''), 1800);
      } catch {
        setError('Unable to share this post.');
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 20px 36px' }}>
        <div className="skeleton" style={{ height: 250, borderRadius: 26, marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 420, borderRadius: 20 }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '26px 20px 38px' }}>
      {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="profile-hero-shell animate-fade-in">
        <div className="profile-cover" />
        <div className="profile-head-row">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="profile-head-avatar" />
          ) : (
            <div className="profile-head-avatar profile-head-avatar-fallback">{avatarInitials}</div>
          )}

          <div className="profile-head-meta">
            <h1>{profile.username}</h1>
            <p>{profile.experience}</p>
            <div className="profile-inline-meta">
              <span><MapPin size={14} /> {profile.city}</span>
              <span><CalendarDays size={14} /> {joinedText}</span>
            </div>
          </div>

          <Link to={`/profile/${profile.id}`} className="profile-public-link">
            View public profile
          </Link>
        </div>
      </section>

      <section className="profile-content-grid animate-fade-in delay-100">
        <aside className="profile-side-card">
          <h3>Contact</h3>

          <div className="profile-contact-item">
            <Mail size={14} />
            <span>{accountEmail || 'Email not available'}</span>
          </div>
          <div className="profile-contact-item">
            <MapPin size={14} />
            <span>{profile.city}</span>
          </div>

          <Link to="/messages" className="profile-chat-btn">
            <MessageCircle size={16} />
            Open chats
          </Link>

          <div className="profile-rating-box">
            <p className="profile-rating-value">{reviewStats.average ? reviewStats.average.toFixed(1) : '0.0'}</p>
            <RatingStars rating={Math.round(reviewStats.average)} />
            <p className="profile-rating-caption">{reviewStats.count} review{reviewStats.count === 1 ? '' : 's'}</p>
          </div>
        </aside>

        <div className="profile-main-stack">
          <div className="profile-main-row">
            <article className="profile-intro-card">
              <div>
                <p className="profile-card-label">INTRODUCTION</p>
                <h2>{profile.experience}</h2>
              </div>
              <p>{profile.about}</p>
              <div className="profile-chip-list">
                {(profile.top_skills.length ? profile.top_skills : ['Add your top skills in onboarding']).slice(0, 5).map((skill) => (
                  <span key={skill} className="profile-chip">{skill}</span>
                ))}
              </div>
            </article>

            <article className="profile-action-card">
              <p className="profile-card-label">CREATOR MODE</p>
              <h3>{profile.is_monetized ? 'Monetized profile' : 'Standard profile'}</h3>
              <p>
                {profile.is_monetized
                  ? `Current request price: ₹${Number(profile.monetization_rate || 0).toFixed(0)}`
                  : 'Enable monetization in onboarding to accept paid collaboration requests.'}
              </p>
              <Link to="/onboarding" className="profile-action-link">
                <Sparkles size={15} />
                Update profile setup
              </Link>
            </article>
          </div>

          <article className="profile-posts-card">
            <div className="profile-posts-head">
              <h3>Your posts</h3>
              <Link to="/home">Go to feed</Link>
            </div>

            {recentPosts.length === 0 ? (
              <p className="profile-empty-text">You have not posted anything yet.</p>
            ) : (
              <div className="profile-post-list">
                {recentPosts.map((post) => (
                  <div key={post.id} className="profile-post-item">
                    {post.content && <p>{post.content}</p>}
                    {post.media_url && post.media_type === 'image' && (
                      <img src={post.media_url} alt="Post media" className="profile-post-media" />
                    )}
                    {post.media_url && post.media_type === 'video' && (
                      <video src={post.media_url} controls className="profile-post-media" />
                    )}
                    {!post.content && !post.media_url && <p>Shared an update</p>}
                    <div className="profile-post-actions">
                      <button
                        type="button"
                        className={`profile-post-action-btn ${postLikes[post.id]?.likedByMe ? 'is-active' : ''}`}
                        onClick={() => toggleLike(post.id)}
                        disabled={likeSavingPostId === post.id}
                      >
                        <Heart size={15} fill={postLikes[post.id]?.likedByMe ? '#ef4444' : 'none'} />
                        {likeSavingPostId === post.id
                          ? 'Saving...'
                          : `Like${postLikes[post.id]?.count ? ` (${postLikes[post.id].count})` : ''}`}
                      </button>
                      <button
                        type="button"
                        className="profile-post-action-btn"
                        onClick={() => sharePost(post)}
                      >
                        <Share2 size={15} />
                        {shareStatusPostId === post.id ? 'Copied' : 'Share'}
                      </button>
                    </div>
                    <span>{new Date(post.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}

export default Profile;