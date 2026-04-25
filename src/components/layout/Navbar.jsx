import { createElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Home, Search, User, ShoppingBag, MessageSquare, LogOut, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchQuery = new URLSearchParams(location.search).get('q') || '';

  const hiddenPaths = ['/', '/signin', '/signup', '/onboarding'];
  if (hiddenPaths.includes(location.pathname)) return null;

  const navItems = [
    { name: 'Home',      path: '/home',          icon: Home, badge: '10' },
    { name: 'Market',    path: '/marketplace',   icon: ShoppingBag },
    { name: 'Messages',  path: '/messages',      icon: MessageSquare, badge: '2' },
    { name: 'Alerts',    path: '/notifications', icon: Bell },
    { name: 'Profile',   path: '/profile',       icon: User },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') || '').trim();
    navigate(q ? `/home?q=${encodeURIComponent(q)}` : '/home');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <>
      <nav className="left-nav-desktop">
        <Link to="/home" className="left-nav-brand">
          <div className="left-nav-brand-icon">
            <Zap size={17} color="#fff" fill="#fff" />
          </div>
          <span>
            Skill<span className="gradient-text">Verse</span>
          </span>
        </Link>

        <form key={location.search} onSubmit={handleSearchSubmit} className="left-nav-search-form">
          <label className="left-nav-search-label">
            <Search size={15} className="left-nav-search-icon" />
            <input type="search" name="q" placeholder="Search..." defaultValue={searchQuery} className="left-nav-search-input" />
          </label>
        </form>

        <div className="left-nav-links">
          {navItems.map(({ name, path, icon, badge }) => {
            const active = location.pathname === path;
            return (
              <Link key={name} to={path} className={`left-nav-link ${active ? 'is-active' : ''}`}>
                <span className="left-nav-link-main">
                  {createElement(icon, { size: 19, strokeWidth: active ? 2.5 : 2 })}
                  <span>{name}</span>
                </span>
                {badge ? <span className="left-nav-link-badge">{badge}</span> : null}
              </Link>
            );
          })}
        </div>

        <button onClick={handleLogout} title="Sign out" className="left-nav-logout" type="button">
          <LogOut size={18} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </nav>

      <nav className="top-nav-mobile">
        <Link to="/home" className="top-nav-brand">
          <div className="top-nav-brand-icon">
            <Zap size={17} color="#fff" fill="#fff" />
          </div>
          <span>
            Skill<span className="gradient-text">Verse</span>
          </span>
        </Link>
        <button onClick={handleLogout} title="Sign out" className="top-nav-logout" type="button">
          <LogOut size={18} strokeWidth={2} />
        </button>
      </nav>

      <nav className="mobile-bottom-nav">
        {navItems.map(({ name, path, icon }) => {
          const active = location.pathname === path;
          return (
            <Link key={name} to={path} className={`mobile-bottom-item ${active ? 'is-active' : ''}`}>
              {createElement(icon, { size: 20, strokeWidth: active ? 2.5 : 2 })}
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
