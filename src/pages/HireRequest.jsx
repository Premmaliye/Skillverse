import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileCheck2, HandCoins } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { apiGet, apiPost } from '../lib/apiClient';

export default function HireRequest() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [profileName, setProfileName] = useState('Creator');
  const [terms, setTerms] = useState({ terms_text: '', terms_version: 1 });
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    purpose: '',
    reason: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          navigate('/signin');
          return;
        }

        if (userData.user.id === profileId) {
          navigate('/profile');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', profileId)
          .maybeSingle();

        setProfileName(profileData?.username || 'Creator');

        const termsResponse = await apiGet(`/api/hiring/terms/${profileId}`);
        setTerms(termsResponse.data);
      } catch (loadError) {
        setError(loadError.message || 'Unable to load hiring details.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate, profileId]);

  const canSubmit = useMemo(() => {
    return acceptedTerms && Object.values(formData).every((value) => String(value || '').trim().length > 0);
  }, [acceptedTerms, formData]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setError('Please accept terms and complete all fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await apiPost('/api/hiring/requests', {
        profileId,
        acceptedTerms,
        termsVersion: terms.terms_version,
        ...formData
      });

      navigate('/notifications');
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit hire request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="h-40 rounded-2xl border border-border bg-primary/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-10 space-y-6">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-foreground/60">Hiring request for</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">{profileName}</h1>
          </div>
          <Link
            to={`/profile?id=${profileId}`}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-foreground/[0.03] transition-colors"
          >
            Back to profile
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileCheck2 size={18} className="text-primary" />
          <h2 className="text-xl font-semibold">Terms & Conditions</h2>
        </div>
        <p className="text-xs text-foreground/60 mb-3">Version {terms.terms_version}</p>
        <div className="rounded-xl border border-border bg-foreground/[0.02] p-4 text-sm whitespace-pre-line leading-relaxed text-foreground/80">
          {terms.terms_text || 'No terms available.'}
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          I have read and accept these terms.
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <HandCoins size={18} className="text-primary" />
          <h2 className="text-xl font-semibold">Hiring Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(event) => updateField('city', event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Purpose of hiring</label>
            <textarea
              rows={3}
              value={formData.purpose}
              onChange={(event) => updateField('purpose', event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Reason for choosing this profile</label>
            <textarea
              rows={3}
              value={formData.reason}
              onChange={(event) => updateField('reason', event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Hire Request'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
