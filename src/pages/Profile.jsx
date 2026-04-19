import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Briefcase, ImagePlus, Mail, MapPin, Trash2, UserRound, Video } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { apiGet, apiPost, apiPut } from '../lib/apiClient';

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [viewedUserId, setViewedUserId] = useState('');
  const [postText, setPostText] = useState('');
  const [postMediaFile, setPostMediaFile] = useState(null);
  const [postMediaPreview, setPostMediaPreview] = useState('');
  const [postMediaType, setPostMediaType] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isPayingMonetization, setIsPayingMonetization] = useState(false);
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [posts, setPosts] = useState([]);
  const [hireTerms, setHireTerms] = useState('No custom terms added yet.');
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    gender: '',
    age: '',
    city: '',
    about: '',
    experience: '',
    topSkills: [],
    avatarUrl: '',
    isMonetized: false
  });
  const isOwnProfile = !viewedUserId || viewedUserId === userId;
  const profileTitle = isOwnProfile ? 'My Profile' : 'Profile';

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

  const resetPostDraft = () => {
    setPostText('');
    setPostMediaFile(null);
    setPostMediaPreview('');
    setPostMediaType('');
  };

  const loadPosts = useCallback(async (ownerId) => {
    if (!ownerId) {
      setPosts([]);
      setFeedLoading(false);
      return;
    }

    setFeedError('');
    setFeedLoading(true);

    const { data, error: postsError } = await supabase
      .from('skill_posts')
      .select('id, user_id, author_username, author_avatar_url, content, media_url, media_path, media_type, created_at')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });

    if (postsError) {
      setFeedError(postsError.message || 'Unable to load posts.');
      setPosts([]);
    } else {
      setPosts(Array.isArray(data) ? data : []);
    }

    setFeedLoading(false);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      setError('');
      setIsLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        navigate('/signin');
        return;
      }

      const user = userData.user;
      setUserId(user.id);
      const targetUserId = searchParams.get('id') || user.id;
      setViewedUserId(targetUserId);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, gender, age, city, about, experience, top_skills, avatar_url, is_monetized')
        .eq('id', targetUserId)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message || 'Unable to load profile data.');
      }

      const fallbackName = user.user_metadata?.username || user.user_metadata?.full_name || user.email || 'User';
      const fallbackAvatar = user.user_metadata?.avatar_url || '';
      const profileUserName = profileData?.username || (targetUserId === user.id ? fallbackName : 'User');

      setProfile({
        username: profileUserName,
        email: user.email || '',
        gender: profileData?.gender || 'Not set',
        age: profileData?.age ? String(profileData.age) : 'Not set',
        city: profileData?.city || 'Not set',
        about: profileData?.about || 'Not added yet.',
        experience: profileData?.experience || 'Not added yet.',
        topSkills: Array.isArray(profileData?.top_skills) ? profileData.top_skills : [],
        avatarUrl: profileData?.avatar_url || fallbackAvatar,
        isMonetized: Boolean(profileData?.is_monetized)
      });

      await loadPosts(targetUserId);

      if (targetUserId === user.id) {
        try {
          const termsResponse = await apiGet(`/api/hiring/terms/${user.id}`);
          setHireTerms(termsResponse.data?.terms_text || 'No custom terms added yet.');
        } catch {
          setHireTerms('No custom terms added yet.');
        }
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [navigate, loadPosts, searchParams]);

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

  const handlePostMediaChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setFeedError('Only image or video files are allowed.');
      return;
    }

    const sizeLimit = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > sizeLimit) {
      setFeedError(isVideo ? 'Video should be 20MB or smaller.' : 'Image should be 5MB or smaller.');
      return;
    }

    setFeedError('');
    setPostMediaFile(file);
    setPostMediaType(isVideo ? 'video' : 'image');
    setPostMediaPreview(URL.createObjectURL(file));
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();

    if (!isOwnProfile) {
      setFeedError('You can only post on your own profile.');
      return;
    }

    const cleanText = postText.trim();
    if (!cleanText && !postMediaFile) {
      setFeedError('Write something or add media before posting.');
      return;
    }

    if (!userId) {
      setFeedError('Please sign in again to create a post.');
      return;
    }

    setIsPosting(true);
    setFeedError('');

    let mediaUrl = null;
    let mediaPath = null;
    let mediaType = null;

    if (postMediaFile) {
      const extension = postMediaFile.name.split('.').pop()?.toLowerCase() || 'bin';
      mediaPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(mediaPath, postMediaFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        setIsPosting(false);
        setFeedError(uploadError.message || 'Failed to upload media.');
        return;
      }

      const { data: publicMedia } = supabase.storage
        .from('post-media')
        .getPublicUrl(mediaPath);

      mediaUrl = publicMedia?.publicUrl || null;
      mediaType = postMediaType;
    }

    const { error: insertError } = await supabase
      .from('skill_posts')
      .insert({
        user_id: userId,
        author_username: profile.username,
        author_avatar_url: profile.avatarUrl || null,
        content: cleanText || null,
        media_url: mediaUrl,
        media_path: mediaPath,
        media_type: mediaType
      });

    if (insertError) {
      if (mediaPath) {
        await supabase.storage.from('post-media').remove([mediaPath]);
      }

      setIsPosting(false);
      setFeedError(insertError.message || 'Failed to create post.');
      return;
    }

    resetPostDraft();
    await loadPosts(userId);
    setIsPosting(false);
  };

  const handleDeletePost = async (post) => {
    if (!post || post.user_id !== userId) {
      return;
    }

    setFeedError('');

    const { error: deleteError } = await supabase
      .from('skill_posts')
      .delete()
      .eq('id', post.id)
      .eq('user_id', userId);

    if (deleteError) {
      setFeedError(deleteError.message || 'Unable to delete post.');
      return;
    }

    if (post.media_path) {
      await supabase.storage.from('post-media').remove([post.media_path]);
    }

    await loadPosts(userId);
  };

  const loadRazorpayScript = async () => {
    if (window.Razorpay) {
      return true;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const startMonetizationPayment = async () => {
    if (!isOwnProfile || !userId || profile.isMonetized) {
      return;
    }

    setError('');
    setIsPayingMonetization(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Unable to load Razorpay checkout.');
        setIsPayingMonetization(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;

      const orderResponse = await apiPost('/api/monetization/create-order', {});
      const { order, razorpayKeyId } = orderResponse.data;

      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'SkillVerse Monetization',
        description: 'Account monetization fee (INR 200)',
        order_id: order.id,
        prefill: {
          name: profile.username || sessionUser?.user_metadata?.full_name || '',
          email: profile.email || sessionUser?.email || ''
        },
        theme: {
          color: '#aa3bff'
        },
        handler: async (response) => {
          try {
            await apiPost('/api/monetization/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            setProfile((prev) => ({
              ...prev,
              isMonetized: true
            }));
          } catch (verifyError) {
            setError(verifyError.message || 'Payment verification failed.');
          } finally {
            setIsPayingMonetization(false);
          }
        }
      });

      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setIsPayingMonetization(false);
      });

      rzp.open();
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to start monetization payment.');
      setIsPayingMonetization(false);
    }
  };

  const handleSaveHireTerms = async () => {
    if (!isOwnProfile) {
      return;
    }

    setIsSavingTerms(true);
    setError('');

    try {
      await apiPut('/api/hiring/terms', { termsText: hireTerms });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save terms and conditions.');
    } finally {
      setIsSavingTerms(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border bg-background p-6 md:p-8 animate-pulse">
          <div className="h-8 w-52 bg-primary/10 rounded mb-4" />
          <div className="h-4 w-72 bg-primary/10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile avatar"
                  className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover border border-primary/30"
                />
              ) : (
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">
                  {initials || <UserRound size={24} />}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.username}</h1>
                <BadgeCheck size={20} className="text-primary" />
                {profile.isMonetized && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700">
                    Monetized
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-foreground/60">{profileTitle}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-foreground/70">
                <span className="inline-flex items-center gap-1.5"><Mail size={16} /> {profile.email}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin size={16} /> {profile.city}</span>
                {!isOwnProfile && (
                  <Link
                    to={`/hire/${viewedUserId}`}
                    className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Hire
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div className="rounded-xl border border-border bg-background p-4 text-center min-w-[90px]">
              <p className="text-lg font-bold">{profile.age}</p>
              <p className="text-xs text-foreground/60">Age</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 text-center min-w-[90px]">
              <p className="text-lg font-bold">{profile.gender}</p>
              <p className="text-xs text-foreground/60">Gender</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 text-center min-w-[90px]">
              <p className="text-lg font-bold">{profile.topSkills.length}</p>
              <p className="text-xs text-foreground/60">Skills</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="lg:col-span-2 space-y-6">
          {isOwnProfile && (
            <article className="rounded-2xl border border-border bg-background p-6">
              <h2 className="text-xl font-semibold mb-3">Create Post</h2>
              <p className="text-sm text-foreground/70 mb-4">Share updates, images, or short videos with the SkillVerse community.</p>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <textarea
                  value={postText}
                  onChange={(event) => setPostText(event.target.value)}
                  placeholder="What are you working on today?"
                  rows={4}
                  className="w-full rounded-xl border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {postMediaPreview && (
                  <div className="rounded-xl border border-border overflow-hidden bg-foreground/[0.02]">
                    {postMediaType === 'video' ? (
                      <video src={postMediaPreview} controls className="w-full max-h-[360px] bg-black" />
                    ) : (
                      <img src={postMediaPreview} alt="Post preview" className="w-full max-h-[360px] object-cover" />
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-foreground/[0.03] transition-colors">
                    {postMediaType === 'video' ? <Video size={16} /> : <ImagePlus size={16} />}
                    Add image/video
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handlePostMediaChange}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    {(postText || postMediaFile) && (
                      <button
                        type="button"
                        onClick={resetPostDraft}
                        className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-foreground/[0.03] transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isPosting}
                      className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
                    >
                      {isPosting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </form>
            </article>
          )}

          <article className="rounded-2xl border border-border bg-background p-6">
            <h2 className="text-xl font-semibold mb-3">About</h2>
            <p className="text-foreground/80 leading-relaxed">{profile.about}</p>
          </article>

          <article className="rounded-2xl border border-border bg-background p-6">
            <h2 className="text-xl font-semibold mb-3">Experience</h2>
            <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{profile.experience}</p>
          </article>

          <article className="rounded-2xl border border-border bg-background p-6">
            <h2 className="text-xl font-semibold mb-3">My Posts</h2>
            <p className="mb-4 text-sm text-foreground/70">Only your own posts are shown here.</p>

            {feedError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {feedError}
              </div>
            )}

            {feedLoading ? (
              <div className="space-y-3">
                <div className="h-20 rounded-lg bg-primary/10 animate-pulse" />
                <div className="h-20 rounded-lg bg-primary/10 animate-pulse" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-sm text-foreground/65">No posts yet. Be the first to share something.</p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const postOwner = post.author_username || 'SkillVerse User';
                  const postAvatar = post.author_avatar_url || '';
                  const ownerInitial = postOwner?.[0]?.toUpperCase() || 'U';
                  const isOwnPost = post.user_id === userId;

                  return (
                    <article key={post.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {postAvatar ? (
                            <img src={postAvatar} alt={postOwner} className="h-10 w-10 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="h-10 w-10 rounded-full border border-border bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                              {ownerInitial}
                            </div>
                          )}
                          <div>
                            <p className="font-medium leading-tight">{postOwner}</p>
                            <p className="text-xs text-foreground/60">{formatPostDate(post.created_at)}</p>
                          </div>
                        </div>

                        {isOwnPost && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground/70 hover:text-destructive hover:border-destructive/40 transition-colors"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>

                      {post.content && <p className="text-sm text-foreground/85 whitespace-pre-line mb-3">{post.content}</p>}

                      {post.media_url && post.media_type === 'video' && (
                        <video src={post.media_url} controls className="w-full max-h-[420px] rounded-lg bg-black" />
                      )}

                      {post.media_url && post.media_type === 'image' && (
                        <img src={post.media_url} alt="Post media" className="w-full max-h-[420px] rounded-lg object-cover" />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="space-y-6">
          {isOwnProfile && (
            <article className="rounded-2xl border border-border bg-background p-6">
              <h2 className="text-xl font-semibold mb-3">Monetize Account</h2>
              <p className="text-sm text-foreground/70 mb-4">
                To monetize your account, pay a fixed one-time amount of INR 200 via Razorpay.
              </p>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background px-3 py-3">
                  <p className="text-sm font-medium">Monetization status</p>
                  <p className="text-xs text-foreground/60 mt-1">
                    {profile.isMonetized ? 'Active (payment completed)' : 'Not active yet'}
                  </p>
                </div>

                {!profile.isMonetized && (
                  <button
                    type="button"
                    onClick={startMonetizationPayment}
                    disabled={isPayingMonetization}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
                  >
                    {isPayingMonetization ? 'Opening Razorpay...' : 'Pay INR 200 & Monetize'}
                  </button>
                )}
              </div>
            </article>
          )}

          {isOwnProfile && (
            <article className="rounded-2xl border border-border bg-background p-6">
              <h2 className="text-xl font-semibold mb-3">Hire Terms & Conditions</h2>
              <p className="text-sm text-foreground/70 mb-4">
                These terms are shown before someone sends you a hiring request.
              </p>
              <textarea
                rows={7}
                value={hireTerms}
                onChange={(event) => setHireTerms(event.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleSaveHireTerms}
                disabled={isSavingTerms}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isSavingTerms ? 'Saving...' : 'Save terms'}
              </button>
            </article>
          )}

          <article className="rounded-2xl border border-border bg-background p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={18} className="text-primary" />
              <h2 className="text-xl font-semibold">Top Skills</h2>
            </div>

            {profile.topSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.topSkills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm bg-background">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground/65">No skills added yet.</p>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}
