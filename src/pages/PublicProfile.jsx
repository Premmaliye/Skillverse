import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Briefcase, CircleUserRound, Handshake, Mail, MapPin, MessageCircle, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function PublicProfile() {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowSaving, setIsFollowSaving] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    city: '',
    about: '',
    experience: '',
    avatar_url: '',
    top_skills: [],
    is_monetized: false,
    monetization_rate: null,
    monetized_label: ''
  });
  const [posts, setPosts] = useState([]);

  const isOwnProfile = profileId && profileId === currentUserId;

  const initials = useMemo(() => {
    if (!profile.username) {
      return 'U';
    }

    return profile.username
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [profile.username]);

  const formatDate = (dateValue) => new Date(dateValue).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        navigate('/signin');
        return;
      }

      if (!profileId) {
        navigate('/home');
        return;
      }

      const viewerId = userData.user.id;
      setCurrentUserId(viewerId);

      const [{ data: profileData, error: profileError }, { data: postData, error: postError }, { data: followData, error: followError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, city, about, experience, avatar_url, top_skills, is_monetized, monetization_rate')
          .eq('id', profileId)
          .maybeSingle(),
        supabase
          .from('skill_posts')
          .select('id, user_id, author_username, author_avatar_url, content, media_url, media_type, created_at')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', viewerId)
          .eq('following_id', profileId)
      ]);

      if (profileError) {
        setError(profileError.message || 'Unable to load profile.');
      }

      if (postError) {
        setError(postError.message || 'Unable to load posts.');
      }

      if (followError) {
        setError(followError.message || 'Unable to load follow state.');
      }

      if (!profileData) {
        setError('Profile not found.');
      }

      setProfile({
        username: profileData?.username || 'User',
        city: profileData?.city || 'Not set',
        about: profileData?.about || 'No about section added yet.',
        experience: profileData?.experience || 'No experience added yet.',
        avatar_url: profileData?.avatar_url || '',
        top_skills: Array.isArray(profileData?.top_skills) ? profileData.top_skills : [],
        is_monetized: Boolean(profileData?.is_monetized),
        monetization_rate: profileData?.monetization_rate ?? null,
        monetized_label: profileData?.is_monetized
          ? profileData?.monetization_rate
            ? `INR ${Number(profileData.monetization_rate).toFixed(2)} per request`
            : 'Monetized creator'
          : ''
      });
      setPosts(Array.isArray(postData) ? postData : []);
      setIsFollowing(Boolean(followData?.length));
      setIsLoading(false);
    };

    loadProfile();
  }, [navigate, profileId]);

  const toggleFollow = async () => {
    if (!profileId || !currentUserId || isOwnProfile) {
      return;
    }

    setIsFollowSaving(true);
    setError('');

    const nextFollowing = !isFollowing;

    if (nextFollowing) {
      const { error: followError } = await supabase.from('user_follows').insert({
        follower_id: currentUserId,
        following_id: profileId
      });

      if (followError) {
        setError(followError.message || 'Unable to follow user.');
        setIsFollowSaving(false);
        return;
      }
    } else {
      const { error: unfollowError } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profileId);

      if (unfollowError) {
        setError(unfollowError.message || 'Unable to unfollow user.');
        setIsFollowSaving(false);
        return;
      }
    }

    setIsFollowing(nextFollowing);
    setIsFollowSaving(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-48 rounded-3xl border border-border bg-primary/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-6">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover border border-primary/30"
                />
              ) : (
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">
                  {initials || <CircleUserRound size={24} />}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.username}</h1>
                <BadgeCheck size={20} className="text-primary" />
                {profile.is_monetized && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700">
                    Monetized
                  </span>
                )}
                {isOwnProfile && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/60">
                    You
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-foreground/70">
                <span className="inline-flex items-center gap-1.5"><MapPin size={16} /> {profile.city}</span>
                {profile.is_monetized && profile.monetized_label && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-xs text-emerald-700">
                    {profile.monetized_label}
                  </span>
                )}
              </div>
              <p className="mt-3 max-w-2xl text-sm text-foreground/65">
                View profile details, posts, and hiring options without leaving the page you came from.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isOwnProfile && (
              <Link
                to={`/hire/${profileId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Handshake size={16} /> Hire
              </Link>
            )}
            {!isOwnProfile && (
              <Link
                to={`/messages?user=${profileId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/[0.03] transition-colors"
              >
                <MessageCircle size={16} /> Message
              </Link>
            )}
            {!isOwnProfile && (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={isFollowSaving}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-70 ${
                  isFollowing
                    ? 'border border-border bg-background text-foreground hover:bg-foreground/[0.03]'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                <UsersRound size={16} />
                {isFollowSaving ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <main className="space-y-6">
          <article className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-3">About</h2>
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{profile.about}</p>
          </article>

          <article className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Experience</h2>
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{profile.experience}</p>
          </article>

          <article className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Recent Posts</h2>
            {posts.length === 0 ? (
              <p className="text-sm text-foreground/65">No posts yet.</p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-2xl border border-border p-4">
                    <p className="text-xs text-foreground/60">{formatDate(post.created_at)}</p>
                    {post.content && <p className="mt-2 text-sm text-foreground/85 whitespace-pre-line">{post.content}</p>}
                    {post.media_url && post.media_type === 'image' && (
                      <img src={post.media_url} alt="Post media" className="mt-3 w-full max-h-[420px] rounded-xl object-cover" />
                    )}
                    {post.media_url && post.media_type === 'video' && (
                      <video src={post.media_url} controls className="mt-3 w-full max-h-[420px] rounded-xl bg-black" />
                    )}
                  </article>
                ))}
              </div>
            )}
          </article>
        </main>

        <aside className="space-y-6">
          <article className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={18} className="text-primary" />
              <h2 className="text-xl font-semibold">Top Skills</h2>
            </div>
            {profile.top_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.top_skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm bg-background">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground/65">No skills listed.</p>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Handshake size={18} className="text-primary" />
              <h2 className="text-xl font-semibold">Hiring</h2>
            </div>
            {profile.is_monetized ? (
              <p className="text-sm text-foreground/75">This creator is monetized and available for paid requests.</p>
            ) : (
              <p className="text-sm text-foreground/75">This creator is not monetized yet, but you can still send a hire request.</p>
            )}
            {!isOwnProfile && (
              <Link
                to={`/hire/${profileId}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start Hire Request
              </Link>
            )}
          </article>
        </aside>
      </div>
    </div>
  );
}
