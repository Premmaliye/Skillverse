import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ImagePlus, UserRound, Zap, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const steps = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Your Skills' },
  { id: 3, label: 'About You' },
  { id: 4, label: 'Review' },
];

const suggestedSkills = ['Cooking', 'Teaching', 'Design', 'Marketing', 'Coding', 'Writing', 'Photography', 'Music'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [userId, setUserId]         = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const [newSkill, setNewSkill]     = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [formData, setFormData] = useState({ username: '', gender: '', age: '', city: '', about: '', experience: '', topSkills: [] });

  useEffect(() => {
    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data?.user) { navigate('/signin'); return; }
      setUserId(data.user.id);
      const meta = data.user.user_metadata || {};
      setFormData(p => ({ ...p, username: meta.username || meta.full_name || '' }));
      const { data: pd } = await supabase.from('profiles').select('username,gender,age,city,about,experience,top_skills,avatar_url').eq('id', data.user.id).maybeSingle();
      if (pd) {
        setFormData(p => ({ ...p, username: pd.username || p.username, gender: pd.gender || '', age: pd.age ? String(pd.age) : '', city: pd.city || '', about: pd.about || '', experience: pd.experience || '', topSkills: Array.isArray(pd.top_skills) ? pd.top_skills : [] }));
        if (pd.avatar_url) setAvatarPreview(pd.avatar_url);
      }
    };
    loadUser();
  }, [navigate]);

  const isFirstStep = currentStep === 1;
  const isLastStep  = currentStep === steps.length;
  const stepTitle   = useMemo(() => steps.find(s => s.id === currentStep)?.label || '', [currentStep]);

  const updateField = (field, value) => setFormData(p => ({ ...p, [field]: value }));
  const toggleSkill = (skill) => setFormData(p => ({ ...p, topSkills: p.topSkills.includes(skill) ? p.topSkills.filter(s => s !== skill) : [...p.topSkills, skill] }));

  const addCustomSkill = () => {
    const skill = newSkill.trim();
    if (!skill) return;
    if (!formData.topSkills.some(s => s.toLowerCase() === skill.toLowerCase())) updateField('topSkills', [...formData.topSkills, skill]);
    setNewSkill('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload a valid image.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB.'); return; }
    setError(''); setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file));
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.username || !formData.gender || !formData.age) { setError('Please complete username, gender, and age.'); return false; }
      const n = Number(formData.age);
      if (isNaN(n) || n < 13 || n > 100) { setError('Enter a valid age between 13 and 100.'); return false; }
    }
    if (currentStep === 2 && formData.topSkills.length === 0) { setError('Add at least one skill.'); return false; }
    if (currentStep === 3 && (!formData.city || !formData.about || !formData.experience)) { setError('Please complete city, about, and experience.'); return false; }
    setError(''); return true;
  };

  const handleNext = () => { if (!validateStep()) return; setCurrentStep(p => Math.min(p + 1, steps.length)); };
  const handleBack = () => { setError(''); setCurrentStep(p => Math.max(p - 1, 1)); };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsLoading(true);
    let avatarUrl = avatarPreview || null;
    if (avatarFile && userId) {
      const ext  = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('profile-images').upload(path, avatarFile, { cacheControl: '3600', upsert: true });
      if (uploadErr) { setIsLoading(false); setError(uploadErr.message || 'Failed to upload image.'); return; }
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path);
      avatarUrl = pub?.publicUrl || avatarUrl;
    }
    const { error: upsertErr } = await supabase.from('profiles').upsert({ id: userId, username: formData.username, gender: formData.gender, age: Number(formData.age), city: formData.city, about: formData.about, experience: formData.experience, top_skills: formData.topSkills, avatar_url: avatarUrl }, { onConflict: 'id' });
    if (upsertErr) { setIsLoading(false); setError(upsertErr.message || 'Failed to save profile.'); return; }
    await supabase.auth.updateUser({ data: { username: formData.username, full_name: formData.username, avatar_url: avatarUrl } });
    setIsLoading(false);
    navigate('/home');
  };

  const inputStyle = { width: '100%', padding: '11px 14px', background: '#fff', border: '1.5px solid #e4e0f0', borderRadius: 10, color: '#0f0a1a', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: 7 };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f3ff 0%,#fafafa 60%)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={15} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f0a1a', letterSpacing: '-0.03em' }}>SkillVerse</span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '1.9rem', color: '#0f0a1a', letterSpacing: '-0.04em', margin: '0 0 8px' }}>Complete Your Profile</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>A few quick steps to personalize your SkillVerse account</p>
        </div>

        {/* Step Progress */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20, borderRadius: 14 }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {steps.map((step, i) => {
              const done   = step.id < currentStep;
              const active = step.id === currentStep;
              return (
                <div key={step.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* connector */}
                  {i > 0 && <div style={{ position: 'absolute', left: 0, top: 14, right: '50%', height: 2, background: done ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : '#e4e0f0', zIndex: 0, transition: 'background 0.3s' }} />}
                  {i < steps.length - 1 && <div style={{ position: 'absolute', left: '50%', top: 14, right: 0, height: 2, background: active || done ? 'linear-gradient(90deg,#7c3aed,transparent)' : '#e4e0f0', zIndex: 0, transition: 'background 0.3s' }} />}
                  {/* circle */}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : active ? '#7c3aed' : '#fff', border: `2px solid ${done || active ? '#7c3aed' : '#e4e0f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, transition: 'all 0.3s', boxShadow: active ? '0 0 0 4px rgba(124,58,237,0.12)' : 'none' }}>
                    {done ? <CheckCircle2 size={14} color="#fff" /> : <span style={{ fontSize: '0.75rem', fontWeight: 700, color: active ? '#fff' : '#9ca3af' }}>{step.id}</span>}
                  </div>
                  <span style={{ marginTop: 6, fontSize: '0.7rem', fontWeight: active ? 700 : 500, color: active ? '#7c3aed' : done ? '#059669' : '#9ca3af', whiteSpace: 'nowrap' }}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Card */}
        <div className="card animate-fade-in" style={{ padding: '32px 28px', borderRadius: 20 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f0a1a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{stepTitle}</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}>Step {currentStep} of {steps.length}</p>
          </div>

          {error && <div className="alert-error animate-fade-in" style={{ marginBottom: 20 }}>{error}</div>}

          {/* ── Step 1 ── */}
          {currentStep === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {/* Avatar */}
              <div style={{ gridColumn: '1/-1' }}>
                <span style={labelStyle}>Profile Picture</span>
                <div style={{ background: '#f7f5fd', border: '2px dashed rgba(124,58,237,0.3)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 16, background: 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.08))', border: '2px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    {avatarPreview ? <img src={avatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserRound size={28} color="#a855f7" />}
                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, background: '#7c3aed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={10} color="#fff" />
                    </div>
                  </div>
                  <div>
                    <label className="btn-soft" style={{ display: 'inline-flex', cursor: 'pointer', marginBottom: 6 }}>
                      <ImagePlus size={14} /> Choose Image
                      <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    </label>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>PNG, JPG, WEBP · max 2MB</p>
                    {avatarFile && <p style={{ color: '#7c3aed', fontSize: '0.75rem', margin: '4px 0 0' }}>{avatarFile.name}</p>}
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Username</label>
                <input type="text" value={formData.username} onChange={e => updateField('username', e.target.value)} placeholder="Your display name" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
                  onBlur={e  => { e.target.style.borderColor = '#e4e0f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={labelStyle}>Gender</label>
                <select value={formData.gender} onChange={e => updateField('gender', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
                  onBlur={e  => { e.target.style.borderColor = '#e4e0f0'; e.target.style.boxShadow = 'none'; }}
                >
                  <option value="">Select gender</option>
                  {['Female','Male','Non-binary','Prefer not to say'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Age</label>
                <input type="number" value={formData.age} onChange={e => updateField('age', e.target.value)} placeholder="e.g. 24" min={13} max={100} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
                  onBlur={e  => { e.target.style.borderColor = '#e4e0f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {currentStep === 2 && (
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 18 }}>Select or add your key skills. These appear on your public profile.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {suggestedSkills.map(skill => {
                  const active = formData.topSkills.includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => toggleSkill(skill)} style={{ padding: '7px 16px', borderRadius: 99, border: `1.5px solid ${active ? '#7c3aed' : '#e4e0f0'}`, background: active ? 'rgba(124,58,237,0.1)' : '#fff', color: active ? '#7c3aed' : '#4b5563', fontWeight: active ? 600 : 500, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit' }}>
                      {skill}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }} placeholder="Add custom skill" style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
                  onBlur={e  => { e.target.style.borderColor = '#e4e0f0'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={addCustomSkill} className="btn-soft" style={{ flexShrink: 0 }}>Add</button>
              </div>
              {formData.topSkills.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {formData.topSkills.map(skill => (
                    <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.22)', borderRadius: 99, color: '#7c3aed', fontSize: '0.83rem', fontWeight: 500 }}>
                      {skill}
                      <button type="button" onClick={() => toggleSkill(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(124,58,237,0.6)', display: 'flex', padding: 0, lineHeight: 1 }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3 ── */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>City</label>
                <input type="text" value={formData.city} onChange={e => updateField('city', e.target.value)} placeholder="e.g. Mumbai" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
                  onBlur={e  => { e.target.style.borderColor = '#e4e0f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>About Yourself</label>
                <textarea rows={4} value={formData.about} onChange={e => updateField('about', e.target.value)} placeholder="Tell people about yourself…" style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
                  onBlur={e  => { e.target.style.borderColor = '#e4e0f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Experience</label>
                <textarea rows={3} value={formData.experience} onChange={e => updateField('experience', e.target.value)} placeholder="e.g. 3 years teaching math online" style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; }}
                  onBlur={e  => { e.target.style.borderColor = '#e4e0f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          )}

          {/* ── Step 4 Review ── */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {avatarPreview && (
                <div className="card-flat" style={{ padding: 14 }}>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profile Picture</p>
                  <img src={avatarPreview} alt="Avatar" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '2px solid #e4e0f0' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Username', formData.username], ['Gender', formData.gender], ['Age', formData.age], ['City', formData.city]].map(([k, v]) => (
                  <div key={k} className="card-flat" style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
                    <p style={{ fontWeight: 600, color: '#0f0a1a', margin: 0, fontSize: '0.9rem' }}>{v || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="card-flat" style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {formData.topSkills.map(s => <span key={s} className="badge">{s}</span>)}
                </div>
              </div>
              <div className="card-flat" style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>About</p>
                <p style={{ color: '#374151', fontSize: '0.875rem', margin: 0, lineHeight: 1.55 }}>{formData.about}</p>
              </div>
              <div className="card-flat" style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experience</p>
                <p style={{ color: '#374151', fontSize: '0.875rem', margin: 0, lineHeight: 1.55 }}>{formData.experience}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid #e4e0f0' }}>
            <button type="button" onClick={handleBack} disabled={isFirstStep || isLoading} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={16} /> Back
            </button>
            {!isLastStep ? (
              <button type="button" onClick={handleNext} disabled={isLoading} className="btn-primary">
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isLoading} className="btn-primary" style={{ minWidth: 140 }}>
                {isLoading ? 'Saving…' : '🎉 Finish Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
