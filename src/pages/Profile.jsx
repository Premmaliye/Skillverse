import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Briefcase, Mail, MapPin, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    gender: '',
    age: '',
    city: '',
    about: '',
    experience: '',
    topSkills: [],
    avatarUrl: ''
  });

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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, gender, age, city, about, experience, top_skills, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message || 'Unable to load profile data.');
      }

      const fallbackName = user.user_metadata?.username || user.user_metadata?.full_name || user.email || 'User';
      const fallbackAvatar = user.user_metadata?.avatar_url || '';

      setProfile({
        username: profileData?.username || fallbackName,
        email: user.email || '',
        gender: profileData?.gender || 'Not set',
        age: profileData?.age ? String(profileData.age) : 'Not set',
        city: profileData?.city || 'Not set',
        about: profileData?.about || 'Not added yet.',
        experience: profileData?.experience || 'Not added yet.',
        topSkills: Array.isArray(profileData?.top_skills) ? profileData.top_skills : [],
        avatarUrl: profileData?.avatar_url || fallbackAvatar
      });

      setIsLoading(false);
    };

    loadProfile();
  }, [navigate]);

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
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-foreground/70">
                <span className="inline-flex items-center gap-1.5"><Mail size={16} /> {profile.email}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin size={16} /> {profile.city}</span>
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
          <article className="rounded-2xl border border-border bg-background p-6">
            <h2 className="text-xl font-semibold mb-3">About</h2>
            <p className="text-foreground/80 leading-relaxed">{profile.about}</p>
          </article>

          <article className="rounded-2xl border border-border bg-background p-6">
            <h2 className="text-xl font-semibold mb-3">Experience</h2>
            <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{profile.experience}</p>
          </article>
        </section>

        <section className="space-y-6">
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
