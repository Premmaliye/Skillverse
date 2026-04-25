import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Users, Award, Star, TrendingUp, CheckCircle, Globe, MessageCircle, Facebook, Twitter, Linkedin, Instagram, Sparkles } from 'lucide-react';

const features = [
  { icon: Award,       title: 'Showcase Skills',  description: 'Create a compelling profile that highlights your expertise. Upload portfolios, certifications, and work samples to stand out.' },
  { icon: Star,        title: 'Get Rated',         description: 'Build credibility through client ratings and reviews. Your reputation score grows with every successful project.' },
  { icon: TrendingUp,  title: 'Sell Products',     description: 'Monetize your expertise by selling digital products, courses, and templates. Set your own prices and scale your income.' },
  { icon: Users,       title: 'Get Hired',         description: 'Connect directly with clients looking for your exact skill set. Receive project offers and build long-term relationships.' },
];

const steps = [
  { step: '01', title: 'Create Account',  description: 'Sign up in minutes and set up your professional profile with your skills, experience, and expertise.' },
  { step: '02', title: 'Post Your Skills', description: 'Showcase your talents by creating detailed skill listings with descriptions, rates, and portfolio samples.' },
  { step: '03', title: 'Get Ratings',     description: 'Deliver excellent work and receive ratings and reviews from satisfied clients that build your reputation.' },
  { step: '04', title: 'Earn & Get Hired', description: 'Grow your income through projects, sell digital products, and attract high-quality clients for partnerships.' },
];

const stats = [
  { value: '50K+', label: 'Professionals' },
  { value: '120K+', label: 'Projects Done' },
  { value: '4.9★', label: 'Avg Rating' },
  { value: '98%', label: 'Satisfaction' },
];

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(248,250,252,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 12px rgba(99,102,241,0.05)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
              <Zap size={17} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em', color: '#0f172a' }}>
              Skill<span className="gradient-text">Verse</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/signin" style={{ padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', color: '#374151', textDecoration: 'none', border: '1.5px solid #e2e8f0', background: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#6366f1'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; }}
            >Login</Link>
            <Link to="/signup" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 20px', fontSize: '0.875rem' }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center', position: 'relative' }}>
        {/* Grid background */}
        <div className="hero-grid" style={{ position: 'absolute', inset: 0, borderRadius: 24, opacity: 0.7, pointerEvents: 'none' }} />

        <div className="animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
          {/* Pill label */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 99, marginBottom: 28 }}>
            <Sparkles size={13} color="#6366f1" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6366f1', letterSpacing: '0.03em' }}>The #1 skill monetization platform</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.04em', marginBottom: 24, color: '#0f172a' }}>
            Show Your Skill.<br />
            <span className="gradient-text">Build Your Reputation.</span><br />
            Get Hired.
          </h1>

          <p style={{ fontSize: '1.15rem', color: '#6b7280', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.65, fontWeight: 400 }}>
            SkillVerse is where talented individuals showcase their expertise, build trust through ratings, monetize their skills, and connect with clients worldwide.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn-primary" style={{ textDecoration: 'none', padding: '13px 30px', fontSize: '1rem' }}>
              Start for Free <ArrowRight size={18} />
            </Link>
            <Link to="/signin" className="btn-ghost" style={{ textDecoration: 'none', padding: '13px 30px', fontSize: '1rem' }}>
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="animate-fade-in delay-200" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, maxWidth: 680, margin: '56px auto 0', position: 'relative', zIndex: 1 }}>
          {stats.map(({ value, label }) => (
            <div key={label} className="card" style={{ padding: '20px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', letterSpacing: '-0.03em', margin: 0 }}>{value}</p>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Hero Visual ── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px 80px' }}>
        <div className="animate-fade-in delay-300" style={{
          borderRadius: 24, background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%)',
          border: '1px solid rgba(99,102,241,0.18)', padding: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 280, position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative blobs */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div className="animate-float" style={{ display: 'inline-flex', padding: 20, background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(99,102,241,0.18)', marginBottom: 16 }}>
              <Globe size={56} color="#6366f1" strokeWidth={1.5} />
            </div>
            <p style={{ color: '#6b7280', fontSize: '1rem', fontWeight: 500, margin: 0 }}>Connect with skilled professionals worldwide</p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="badge" style={{ marginBottom: 14, display: 'inline-flex' }}>Features</span>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: '0 0 12px' }}>Everything you need to succeed</h2>
          <p style={{ color: '#6b7280', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>Tools designed for skilled professionals in the digital economy</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map(({ icon: Icon, title, description }, i) => (
            <div key={title} className={`card animate-fade-in delay-${(i+1)*100}`} style={{ padding: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Icon size={22} color="#6366f1" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>{title}</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: 'linear-gradient(135deg,#f1f5f9,#f8fafc)', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="badge" style={{ marginBottom: 14, display: 'inline-flex' }}>How It Works</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: '0 0 12px' }}>Launch in 4 simple steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {steps.map(({ step, title, description }, i) => (
              <div key={step} style={{ position: 'relative' }}>
                <div className="card" style={{ padding: 28, height: '100%', background: '#fff' }}>
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'rgba(99,102,241,0.12)', lineHeight: 1, marginBottom: 12, letterSpacing: '-0.04em' }}>{step}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{title}</h3>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                      <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{i + 1}</span>
                    </div>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>{description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ display: 'none' }}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{
          borderRadius: 24, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #6366f1 100%)',
          backgroundSize: '200% auto', animation: 'gradient-shift 5s ease infinite',
          padding: '56px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
          boxShadow: '0 16px 56px rgba(99,102,241,0.35)',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, background: 'rgba(255,255,255,0.06)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -40, width: 260, height: 260, background: 'rgba(255,255,255,0.04)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 14 }}>Ready to Showcase Your Skills?</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
              Join thousands of professionals earning money and building reputations on SkillVerse.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/signup" style={{ padding: '13px 30px', background: '#fff', color: '#6366f1', fontWeight: 700, fontSize: '0.95rem', borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >Get Started for Free</Link>
              <Link to="/signin" style={{ padding: '13px 30px', color: '#fff', fontWeight: 600, fontSize: '0.95rem', borderRadius: 10, textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.35)', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >I Have an Account</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '56px 24px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={14} color="#fff" fill="#fff" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', letterSpacing: '-0.03em' }}>SkillVerse</span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>Empowering skilled professionals to showcase talents, build reputation, and connect globally.</p>
            </div>
            {[
              { title: 'Platform', links: ['How It Works','Browse Skills','Pricing','Success Stories'] },
              { title: 'Support', links: ['Privacy Policy','Terms of Service','Contact Us','FAQ'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 14, letterSpacing: '-0.01em' }}>{title}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {links.map(l => <li key={l}><a href="#" style={{ color: '#6b7280', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                  >{l}</a></li>)}
                </ul>
              </div>
            ))}
            <div>
              <h4 style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 14 }}>Connect</h4>
              <p style={{ color: '#6b7280', fontSize: '0.83rem', marginBottom: 12 }}>hello@skillverse.com</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                  <a key={i} href="#" style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', transition: 'all 0.18s', textDecoration: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.16)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  ><Icon size={15} /></a>
                ))}
              </div>
            </div>
          </div>
          <div className="divider" style={{ marginBottom: 24 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>© 2024 SkillVerse. All rights reserved.</p>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Security','Status','Blog'].map(l => <a key={l} href="#" style={{ color: '#9ca3af', fontSize: '0.8rem', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
                onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
              >{l}</a>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
