import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ImagePlus, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const steps = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Skills' },
  { id: 3, label: 'Profile Details' },
  { id: 4, label: 'Review' }
];

const suggestedSkills = ['Cooking', 'Teaching', 'Design', 'Marketing', 'Coding', 'Writing'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    gender: '',
    age: '',
    city: '',
    about: '',
    experience: '',
    topSkills: []
  });

  useEffect(() => {
    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError || !data?.user) {
        navigate('/signin');
        return;
      }

      setUserId(data.user.id);

      const meta = data.user.user_metadata || {};
      setFormData((prev) => ({
        ...prev,
        username: meta.username || meta.full_name || ''
      }));

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, gender, age, city, about, experience, top_skills, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profileError && profileData) {
        setFormData((prev) => ({
          ...prev,
          username: profileData.username || prev.username,
          gender: profileData.gender || '',
          age: profileData.age ? String(profileData.age) : '',
          city: profileData.city || '',
          about: profileData.about || '',
          experience: profileData.experience || '',
          topSkills: Array.isArray(profileData.top_skills) ? profileData.top_skills : []
        }));

        if (profileData.avatar_url) {
          setAvatarPreview(profileData.avatar_url);
        }
      }
    };

    loadUser();
  }, [navigate]);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === steps.length;

  const stepTitle = useMemo(() => steps.find((s) => s.id === currentStep)?.label || '', [currentStep]);

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleSkill = (skill) => {
    setFormData((prev) => {
      const exists = prev.topSkills.includes(skill);
      return {
        ...prev,
        topSkills: exists
          ? prev.topSkills.filter((item) => item !== skill)
          : [...prev.topSkills, skill]
      };
    });
  };

  const addCustomSkill = () => {
    const skill = newSkill.trim();
    if (!skill) {
      return;
    }

    const alreadyAdded = formData.topSkills.some((item) => item.toLowerCase() === skill.toLowerCase());
    if (!alreadyAdded) {
      updateField('topSkills', [...formData.topSkills, skill]);
    }

    setNewSkill('');
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be 2MB or less.');
      return;
    }

    setError('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.username || !formData.gender || !formData.age) {
        setError('Please complete username, gender, and age.');
        return false;
      }

      const ageNumber = Number(formData.age);
      if (Number.isNaN(ageNumber) || ageNumber < 13 || ageNumber > 100) {
        setError('Please enter a valid age between 13 and 100.');
        return false;
      }
    }

    if (currentStep === 2 && formData.topSkills.length === 0) {
      setError('Add at least one important skill.');
      return false;
    }

    if (currentStep === 3) {
      if (!formData.city || !formData.about || !formData.experience) {
        setError('Please complete city, about yourself, and experience.');
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      return;
    }

    setIsLoading(true);

    let avatarUrl = avatarPreview || null;

    if (avatarFile && userId) {
      const fileExtension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${userId}/${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        setIsLoading(false);
        setError(uploadError.message || 'Failed to upload profile image.');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData?.publicUrl || avatarUrl;
    }

    const payload = {
      username: formData.username,
      gender: formData.gender,
      age: Number(formData.age),
      city: formData.city,
      about: formData.about,
      experience: formData.experience,
      top_skills: formData.topSkills,
      avatar_url: avatarUrl
    };

    const { error: profileUpsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          ...payload
        },
        { onConflict: 'id' }
      );

    if (profileUpsertError) {
      setIsLoading(false);
      setError(profileUpsertError.message || 'Failed to save profile details. Please try again.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        username: formData.username,
        full_name: formData.username,
        avatar_url: avatarUrl
      }
    });

    setIsLoading(false);

    if (updateError) {
      setError(updateError.message || 'Failed to save profile details. Please try again.');
      return;
    }

    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(170,59,255,0.14),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(170,59,255,0.10),transparent_35%)] bg-background px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Complete Your Profile</h1>
          <p className="text-foreground/70">A few quick steps to personalize your SkillVerse account.</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-background/80 backdrop-blur-sm p-4 md:p-6 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {steps.map((step, index) => {
              const isComplete = step.id < currentStep;
              const isActive = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isComplete
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                        : 'border-border text-foreground/60'
                    }`}
                  >
                    {isComplete ? <CheckCircle2 size={14} /> : <span>{step.id}</span>}
                    <span>{step.label}</span>
                  </div>
                  {index < steps.length - 1 && <span className="text-foreground/40">/</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-background/95 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-semibold mb-1">{stepTitle}</h2>
          <p className="text-sm text-foreground/60">Step {currentStep} of {steps.length}</p>

          {error && (
            <div className="mt-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Profile Picture</label>
                <div className="rounded-xl border border-dashed border-primary/35 bg-primary/5 p-4 md:p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 rounded-2xl border border-border overflow-hidden bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                      <span className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border">
                        <Camera size={12} className="text-primary" />
                      </span>
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" />
                      ) : (
                        <UserRound size={28} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                        <ImagePlus size={16} /> Choose Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-2 text-xs text-foreground/65">PNG, JPG, WEBP up to 2MB.</p>
                      {avatarFile && <p className="mt-1 text-xs text-foreground/65 truncate">{avatarFile.name}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => updateField('username', e.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  placeholder="Enter your age"
                  min={13}
                  max={100}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-3">Most Important Skills</label>

              <div className="flex flex-wrap gap-2 mb-4">
                {suggestedSkills.map((skill) => {
                  const active = formData.topSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-foreground/80 hover:border-primary/40'
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomSkill();
                    }
                  }}
                  placeholder="Add custom skill"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Add
                </button>
              </div>

              {formData.topSkills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {formData.topSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className="text-foreground/50 hover:text-destructive"
                        aria-label={`Remove ${skill}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="mt-6 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g. Pune"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">About Yourself</label>
                <textarea
                  rows={4}
                  value={formData.about}
                  onChange={(e) => updateField('about', e.target.value)}
                  placeholder="Tell people about yourself"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Experience</label>
                <textarea
                  rows={3}
                  value={formData.experience}
                  onChange={(e) => updateField('experience', e.target.value)}
                  placeholder="Share your experience (example: 3 years teaching math online)"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="mt-6 space-y-4">
              {avatarPreview && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-foreground/60 mb-2">Profile Picture</p>
                  <img
                    src={avatarPreview}
                    alt="Profile avatar"
                    className="h-20 w-20 rounded-full object-cover border border-border"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-border p-3"><span className="text-foreground/60">Username:</span> {formData.username}</div>
                <div className="rounded-lg border border-border p-3"><span className="text-foreground/60">Gender:</span> {formData.gender}</div>
                <div className="rounded-lg border border-border p-3"><span className="text-foreground/60">Age:</span> {formData.age}</div>
                <div className="rounded-lg border border-border p-3"><span className="text-foreground/60">City:</span> {formData.city}</div>
              </div>

              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="text-foreground/60 mb-1">Top Skills</p>
                <p>{formData.topSkills.join(', ')}</p>
              </div>

              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="text-foreground/60 mb-1">About Yourself</p>
                <p>{formData.about}</p>
              </div>

              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="text-foreground/60 mb-1">Experience</p>
                <p>{formData.experience}</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={isFirstStep || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground/80 disabled:opacity-50"
            >
              <ArrowLeft size={16} /> Back
            </button>

            {!isLastStep ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? 'Saving...' : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
