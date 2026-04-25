import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck, Briefcase, FileText, Grid3x3, Handshake,
  MapPin, MessageCircle, Star, UserRound, UsersRound, Check, ShoppingBag
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

/* ── shared tiny components ─────────────────────────── */
function Avatar({ url, name, size = 80, radius = 20 }) {
  const initial = (name || 'U')[0].toUpperCase();
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 8px 22px rgba(2,6,23,0.15)', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#fff', border: '3px solid #fff', boxShadow: '0 8px 22px rgba(2,6,23,0.18)', flexShrink: 0 }}>
      {initial}
    </div>
  );
}

function SectionCard({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 4px 18px rgba(2,6,23,0.05)', ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      {Icon && <Icon size={16} color="#0284c7" />}
      <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f0a1a', margin: 0, letterSpacing: '-0.02em' }}>{children}</h2>
    </div>
  );
}

const TAB_POSTS  = 'posts';
const TAB_ABOUT  = 'about';
const TAB_SKILLS = 'skills';
const TAB_REVIEWS = 'reviews';
const TAB_PRODUCTS = 'products';

export default function PublicProfile() {
  const navigate = useNavigate();
  const { profileId } = useParams();

  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isFollowing, setIsFollowing]   = useState(false);
  const [isFollowSaving, setIsFollowSaving] = useState(false);
  const [activeTab, setActiveTab]       = useState(TAB_POSTS);
  const [posts, setPosts]               = useState([]);
  const [products, setProducts]         = useState([]);
  const [reviews, setReviews]           = useState([]);
  const [reviewDraft, setReviewDraft]   = useState({ rating: 5, text: '' });
  const [isReviewSaving, setIsReviewSaving] = useState(false);
  const [profile, setProfile] = useState({
    username: '', city: '', about: '', experience: '',
    avatar_url: '', top_skills: [],
    is_monetized: false, monetization_rate: null, monetized_label: '',
  });

  const isOwnProfile = profileId && profileId === currentUserId;
  const averageRating = reviews.length ? (reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length) : 0;

  const initials = useMemo(() => !profile.username ? 'U' : profile.username.split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join(''), [profile.username]);
  const formatDate = ds => new Date(ds).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true); setError('');
      const { data: ud, error: ue } = await supabase.auth.getUser();
      if (ue || !ud?.user) { navigate('/signin'); return; }
      if (!profileId) { navigate('/home'); return; }
      const viewerId = ud.user.id;
      setCurrentUserId(viewerId);
      const [
        { data: pd, error: pe },
        { data: postData, error: postErr },
        { data: productData, error: productErr },
        { data: followData, error: followErr },
        { data: reviewData, error: reviewErr },
      ] = await Promise.all([
        supabase.from('profiles').select('id,username,city,about,experience,avatar_url,top_skills,is_monetized,monetization_rate').eq('id', profileId).maybeSingle(),
        supabase.from('skill_posts').select('id,user_id,author_username,author_avatar_url,content,media_url,media_type,created_at').eq('user_id', profileId).order('created_at', { ascending: false }),
        supabase.from('profile_products').select('id,seller_id,title,category,price,description,product_url,image_url,image_path,is_active,created_at').eq('seller_id', profileId).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('user_follows').select('id').eq('follower_id', viewerId).eq('following_id', profileId),
        supabase.from('profile_reviews').select('id,profile_id,reviewer_id,rating,review_text,created_at').eq('profile_id', profileId).order('created_at', { ascending: false }),
      ]);
      if (pe)        setError(pe.message || 'Unable to load profile.');
      if (postErr)   setError(postErr.message || 'Unable to load posts.');
      if (productErr) setError(productErr.message || 'Unable to load products.');
      if (followErr) setError(followErr.message || 'Unable to load follow state.');
      if (reviewErr) setError(reviewErr.message || 'Unable to load reviews.');
      if (!pd)       setError('Profile not found.');
      setProfile({
        username:         pd?.username         || 'User',
        city:             pd?.city             || 'Not set',
        about:            pd?.about            || 'No about section added yet.',
        experience:       pd?.experience       || 'No experience added yet.',
        avatar_url:       pd?.avatar_url       || '',
        top_skills:       Array.isArray(pd?.top_skills) ? pd.top_skills : [],
        is_monetized:     Boolean(pd?.is_monetized),
        monetization_rate: pd?.monetization_rate ?? null,
        monetized_label:  pd?.is_monetized ? (pd?.monetization_rate ? `₹${Number(pd.monetization_rate).toFixed(0)} / request` : 'Monetized creator') : '',
      });
      setPosts(Array.isArray(postData) ? postData : []);
      setProducts(Array.isArray(productData) ? productData : []);
      setIsFollowing(Boolean(followData?.length));

      const reviewRows = Array.isArray(reviewData) ? reviewData : [];
      const reviewerIds = [...new Set(reviewRows.map(r => r.reviewer_id).filter(Boolean))];
      let reviewerMap = {};
      if (reviewerIds.length) {
        const { data: reviewersData } = await supabase
          .from('profiles')
          .select('id,username,avatar_url')
          .in('id', reviewerIds);
        reviewerMap = (reviewersData || []).reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});
      }

      const normalizedReviews = reviewRows.map(row => ({
        ...row,
        reviewer_name: reviewerMap[row.reviewer_id]?.username || 'User',
        reviewer_avatar: reviewerMap[row.reviewer_id]?.avatar_url || '',
      }));

      setReviews(normalizedReviews);
      const myReview = normalizedReviews.find(r => r.reviewer_id === viewerId);
      if (myReview) {
        setReviewDraft({
          rating: Number(myReview.rating) || 5,
          text: myReview.review_text || '',
        });
      } else {
        setReviewDraft({ rating: 5, text: '' });
      }
      setIsLoading(false);
    };
    load();
  }, [navigate, profileId]);

  const toggleFollow = async () => {
    if (!profileId || !currentUserId || isOwnProfile) return;
    setIsFollowSaving(true); setError('');
    if (!isFollowing) {
      const { error: e } = await supabase.from('user_follows').insert({ follower_id: currentUserId, following_id: profileId });
      if (e) { setError(e.message); setIsFollowSaving(false); return; }
    } else {
      const { error: e } = await supabase.from('user_follows').delete().eq('follower_id', currentUserId).eq('following_id', profileId);
      if (e) { setError(e.message); setIsFollowSaving(false); return; }
    }
    setIsFollowing(v => !v);
    setIsFollowSaving(false);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!profileId || !currentUserId || isOwnProfile) return;

    const rating = Number(reviewDraft.rating);
    const text = String(reviewDraft.text || '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError('Please choose a rating between 1 and 5.');
      return;
    }

    if (!text) {
      setError('Please write a short review.');
      return;
    }

    setError('');
    setIsReviewSaving(true);

    const { error: saveError } = await supabase
      .from('profile_reviews')
      .upsert(
        {
          profile_id: profileId,
          reviewer_id: currentUserId,
          rating,
          review_text: text,
        },
        { onConflict: 'profile_id,reviewer_id' }
      );

    if (saveError) {
      setError(saveError.message || 'Unable to save review.');
      setIsReviewSaving(false);
      return;
    }

    const { data: reviewData, error: reviewLoadError } = await supabase
      .from('profile_reviews')
      .select('id,profile_id,reviewer_id,rating,review_text,created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (reviewLoadError) {
      setError(reviewLoadError.message || 'Unable to refresh reviews.');
      setIsReviewSaving(false);
      return;
    }

    const reviewRows = Array.isArray(reviewData) ? reviewData : [];
    const reviewerIds = [...new Set(reviewRows.map(r => r.reviewer_id).filter(Boolean))];
    let reviewerMap = {};
    if (reviewerIds.length) {
      const { data: reviewersData } = await supabase
        .from('profiles')
        .select('id,username,avatar_url')
        .in('id', reviewerIds);
      reviewerMap = (reviewersData || []).reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
    }

    setReviews(reviewRows.map(row => ({
      ...row,
      reviewer_name: reviewerMap[row.reviewer_id]?.username || 'User',
      reviewer_avatar: reviewerMap[row.reviewer_id]?.avatar_url || '',
    })));
    setIsReviewSaving(false);
  };

  /* ── Tab button ── */
  const TabBtn = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 99, border: 'none', background: activeTab === id ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'transparent', color: activeTab === id ? '#fff' : '#6b7280', fontWeight: activeTab === id ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: activeTab === id ? '0 2px 12px rgba(2,132,199,0.28)' : 'none' }}>
      <Icon size={14} />{label}
    </button>
  );

  /* ── Loading ── */
  if (isLoading) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
      <div className="skeleton" style={{ height: 220, borderRadius: 24, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 288px', gap: 20 }}>
        <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '26px 20px 38px', fontFamily: 'Inter,sans-serif' }}>
      {error && <div className="alert-error animate-fade-in" style={{ marginBottom: 20 }}>{error}</div>}

      {/* ═══════════════════════════════════════════════
          HERO HEADER
      ═══════════════════════════════════════════════ */}
      <div className="animate-fade-in" style={{ borderRadius: 24, marginBottom: 24, overflow: 'hidden', boxShadow: '0 8px 34px rgba(2,6,23,0.12)', border: '1px solid #e2e8f0' }}>
        {/* Cover */}
        <div style={{ height: 142, background: 'linear-gradient(120deg,#7dd3fc 0%,#0ea5e9 46%,#0284c7 100%)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 18% 66%,rgba(255,255,255,0.22) 0%,transparent 46%),radial-gradient(circle at 84% 22%,rgba(255,255,255,0.14) 0%,transparent 38%)' }} />
        </div>

        {/* White panel */}
        <div style={{ background: '#fff', padding: '0 28px 24px' }}>
          {/* Avatar + actions row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginTop: -58 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar url={profile.avatar_url} name={profile.username || initials} size={104} radius={52} />
              {profile.is_monetized && (
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, background: 'linear-gradient(135deg,#059669,#34d399)', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={11} color="#fff" fill="#fff" />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link to={`/hire/${profileId}`} style={{ textDecoration: 'none', padding: '9px 20px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff', borderRadius: 10, border: 'none', fontWeight: 600, boxShadow: '0 8px 20px rgba(3,105,161,0.26)' }}>
                  <Handshake size={15} /> Hire
                </Link>
                <Link to={`/messages?user=${profileId}`} style={{ textDecoration: 'none', padding: '9px 20px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1.5px solid rgba(14,165,233,0.3)', color: '#0369a1', borderRadius: 10, background: '#fff', fontWeight: 600 }}>
                  <MessageCircle size={15} /> Message
                </Link>
                <button type="button" onClick={toggleFollow} disabled={isFollowSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, border: isFollowing ? '1.5px solid #dbeafe' : '1.5px solid transparent', background: isFollowing ? '#fff' : 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: isFollowing ? '#64748b' : '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: !isFollowing ? '0 8px 20px rgba(2,132,199,0.28)' : 'none' }}
                  onMouseEnter={e => { if (isFollowing) { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.35)'; e.currentTarget.style.color = '#0284c7'; } }}
                  onMouseLeave={e => { if (isFollowing) { e.currentTarget.style.borderColor = '#dbeafe'; e.currentTarget.style.color = '#64748b'; } }}
                >
                  {isFollowSaving ? '…' : isFollowing ? <><Check size={14} /> Following</> : <><UsersRound size={14} /> Follow</>}
                </button>
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontWeight: 800, fontSize: '1.55rem', color: '#0f0a1a', margin: 0, letterSpacing: '-0.04em' }}>{profile.username}</h1>
              <BadgeCheck size={20} color="#0284c7" />
              {profile.is_monetized && <span className="badge-green">{profile.monetized_label || 'Monetized ✓'}</span>}
              {isOwnProfile && <span className="badge" style={{ fontSize: '0.62rem' }}>You</span>}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, color: '#6b7280', fontSize: '0.83rem', marginBottom: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{profile.city}</span>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Grid3x3 size={13} />{posts.length} posts</span>
              <span style={{ color: '#cbd5e1' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ShoppingBag size={13} />{products.length} products</span>
            </div>

            {/* Skill chips */}
            {profile.top_skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.top_skills.slice(0, 6).map(s => <span key={s} className="badge">{s}</span>)}
                {profile.top_skills.length > 6 && <span className="badge">+{profile.top_skills.length - 6}</span>}
              </div>
            )}
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
                {[['Posts', posts.length], ['Skills', profile.top_skills.length], ['Products', products.length], ['Rating', reviews.length ? `${averageRating.toFixed(1)} / 5` : 'New']].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 99 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0284c7' }}>{val}</span>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20, width: 'fit-content', boxShadow: '0 1px 6px rgba(2,6,23,0.06)' }}>
        <TabBtn id={TAB_POSTS}  icon={Grid3x3}  label="Posts"  />
        <TabBtn id={TAB_ABOUT}  icon={FileText}  label="About"  />
        <TabBtn id={TAB_SKILLS} icon={Briefcase} label="Skills" />
        <TabBtn id={TAB_PRODUCTS} icon={ShoppingBag} label="Products" />
        <TabBtn id={TAB_REVIEWS} icon={Star} label="Reviews" />
      </div>

      {/* ── Columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 288px', gap: 20, alignItems: 'start' }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Posts tab */}
          {activeTab === TAB_POSTS && (
            posts.length === 0 ? (
              <SectionCard>
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                  <UserRound size={36} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
                  <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No posts yet</p>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>This user hasn't published anything yet.</p>
                </div>
              </SectionCard>
            ) : (
              posts.map(post => (
                <SectionCard key={post.id} style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <Avatar url={post.author_avatar_url} name={post.author_username} size={38} radius={10} />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f0a1a', margin: 0 }}>{post.author_username}</p>
                      <p style={{ fontSize: '0.73rem', color: '#9ca3af', margin: '2px 0 0' }}>{formatDate(post.created_at)}</p>
                    </div>
                  </div>
                  {post.content && <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-line', margin: '0 0 12px' }}>{post.content}</p>}
                  {post.media_url && post.media_type === 'image' && <img src={post.media_url} alt="" style={{ width: '100%', maxHeight: 380, borderRadius: 10, objectFit: 'cover' }} />}
                  {post.media_url && post.media_type === 'video' && <video src={post.media_url} controls style={{ width: '100%', maxHeight: 380, borderRadius: 10, background: '#000' }} />}
                </SectionCard>
              ))
            )
          )}

          {/* About tab */}
          {activeTab === TAB_ABOUT && (
            <>
              <SectionCard>
                <SectionTitle icon={FileText}>About</SectionTitle>
                <p style={{ color: '#374151', lineHeight: 1.75, margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{profile.about}</p>
              </SectionCard>
              <SectionCard>
                <SectionTitle icon={Briefcase}>Experience</SectionTitle>
                <p style={{ color: '#374151', lineHeight: 1.75, margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{profile.experience}</p>
              </SectionCard>
            </>
          )}

          {/* Skills tab */}
          {activeTab === TAB_SKILLS && (
            <SectionCard>
              <SectionTitle icon={Briefcase}>Top Skills</SectionTitle>
              {profile.top_skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {profile.top_skills.map(s => (
                    <span key={s} style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 16px', background: 'rgba(14,165,233,0.08)', border: '1.5px solid rgba(14,165,233,0.25)', borderRadius: 99, color: '#0284c7', fontSize: '0.85rem', fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No skills listed.</p>
              )}
            </SectionCard>
          )}

          {/* Products tab */}
          {activeTab === TAB_PRODUCTS && (
            products.length === 0 ? (
              <SectionCard>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No products listed yet.</p>
              </SectionCard>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                {products.map(product => (
                  <SectionCard key={product.id} style={{ padding: '16px 18px' }}>
                    {product.image_url && (
                      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: '1px solid #ede9fe' }}>
                        <img src={product.image_url} alt={product.title} style={{ width: '100%', height: 170, objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.74rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{product.category}</p>
                        <h3 style={{ margin: '4px 0 6px', fontSize: '0.96rem', lineHeight: 1.4, color: '#0f0a1a' }}>{product.title}</h3>
                      </div>
                      <span className="badge-green" style={{ fontSize: '0.69rem' }}>₹{Number(product.price || 0).toFixed(0)}</span>
                    </div>

                    <p style={{ margin: '0 0 10px', color: '#4b5563', fontSize: '0.84rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{product.description}</p>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {product.product_url && (
                        <a href={product.product_url} target="_blank" rel="noreferrer" className="btn-soft" style={{ textDecoration: 'none', padding: '7px 12px', fontSize: '0.79rem' }}>
                          Buy / View Link
                        </a>
                      )}
                      <Link to={`/messages?user=${profileId}`} className="btn-outline" style={{ textDecoration: 'none', padding: '7px 12px', fontSize: '0.79rem' }}>
                        Ask Seller
                      </Link>
                    </div>
                  </SectionCard>
                ))}
              </div>
            )
          )}

          {/* Reviews tab */}
          {activeTab === TAB_REVIEWS && (
            <>
              <SectionCard>
                <SectionTitle icon={Star}>Rating Overview</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f0a1a', lineHeight: 1 }}>
                    {reviews.length ? averageRating.toFixed(1) : '0.0'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          color={star <= Math.round(averageRating) ? '#f59e0b' : '#d1d5db'}
                          fill={star <= Math.round(averageRating) ? '#f59e0b' : 'transparent'}
                        />
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>
                      {reviews.length} review{reviews.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </SectionCard>

              {!isOwnProfile && (
                <SectionCard>
                  <SectionTitle icon={Star}>Rate This Profile</SectionTitle>
                  <form onSubmit={handleReviewSubmit}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isSelected = Number(reviewDraft.rating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewDraft((prev) => ({ ...prev, rating: star }))}
                            style={{
                              width: 34,
                              height: 34,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 8,
                              border: isSelected ? '1.5px solid rgba(245,158,11,0.65)' : '1.5px solid #e2e8f0',
                              background: isSelected ? 'rgba(245,158,11,0.12)' : '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            <Star size={16} color={isSelected ? '#f59e0b' : '#d1d5db'} fill={isSelected ? '#f59e0b' : 'transparent'} />
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={reviewDraft.text}
                      onChange={(e) => setReviewDraft((prev) => ({ ...prev, text: e.target.value }))}
                      placeholder="Write your review..."
                      rows={4}
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        borderRadius: 10,
                        border: '1.5px solid #e2e8f0',
                        background: '#f8fafc',
                        padding: '10px 12px',
                        fontFamily: 'inherit',
                        fontSize: '0.88rem',
                        color: '#0f0a1a',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />

                    <button type="submit" className="btn-primary" style={{ marginTop: 12, padding: '9px 18px', fontSize: '0.84rem' }} disabled={isReviewSaving}>
                      {isReviewSaving ? 'Saving...' : 'Submit Review'}
                    </button>
                  </form>
                </SectionCard>
              )}

              <SectionCard>
                <SectionTitle icon={MessageCircle}>Community Reviews</SectionTitle>
                {reviews.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>No reviews yet. Be the first to leave one.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {reviews.map((review) => (
                      <div key={review.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar url={review.reviewer_avatar} name={review.reviewer_name} size={34} radius={8} />
                            <div>
                              <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#0f0a1a' }}>{review.reviewer_name}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#9ca3af' }}>{formatDate(review.created_at)}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={13}
                                color={star <= Number(review.rating) ? '#f59e0b' : '#d1d5db'}
                                fill={star <= Number(review.rating) ? '#f59e0b' : 'transparent'}
                              />
                            ))}
                          </div>
                        </div>
                        <p style={{ margin: 0, color: '#374151', fontSize: '0.86rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{review.review_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 84, alignSelf: 'start' }}>

          {/* Profile info */}
          <SectionCard>
            <SectionTitle>Profile Info</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['City', profile.city], ['Posts', posts.length], ['Skills', profile.top_skills.length], ['Products', products.length]].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: '0.77rem', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f0a1a' }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <span style={{ fontSize: '0.77rem', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rating</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f0a1a' }}>{reviews.length ? `${averageRating.toFixed(1)} / 5` : 'New'}</span>
              </div>
            </div>
          </SectionCard>

          {/* Hire CTA */}
          {!isOwnProfile && (
            <SectionCard style={{ background: 'linear-gradient(135deg,#f0f9ff,#ecfeff)', border: '1.5px solid rgba(14,165,233,0.25)' }}>
              <SectionTitle icon={Handshake}>Work Together</SectionTitle>
              <p style={{ fontSize: '0.83rem', color: '#6b7280', margin: '0 0 14px', lineHeight: 1.55 }}>
                {profile.is_monetized
                  ? `This creator charges ${profile.monetized_label}. Send a request to get started.`
                  : 'Send a hire request — this creator can set their own price.'}
              </p>
              <Link to={`/hire/${profileId}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', fontSize: '0.875rem', background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff', borderRadius: 10, fontWeight: 600 }}>
                <Handshake size={15} /> Send Hire Request
              </Link>
              <Link to={`/messages?user=${profileId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: '9px', borderRadius: 10, border: '1.5px solid rgba(14,165,233,0.25)', color: '#0284c7', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', background: 'transparent', transition: 'all 0.18s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <MessageCircle size={15} /> Message First
              </Link>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
