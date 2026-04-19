import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Home, Search, User, ShoppingBag, MessageSquare, LogOut } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchQuery = new URLSearchParams(location.search).get('q') || '';

  // Hide navbar on landing, signin, signup pages
  const hiddenPaths = ['/', '/signin', '/signup', '/onboarding'];
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }
  
  const navItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Market', path: '/marketplace', icon: ShoppingBag },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Alerts', path: '/notifications', icon: Bell },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const query = String(formData.get('q') || '').trim();
    navigate(query ? `/home?q=${encodeURIComponent(query)}` : '/home');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/home" className="font-bold text-2xl text-primary tracking-tight">
          SkillVerse
        </Link>

        <form key={location.search} onSubmit={handleSearchSubmit} className="w-full lg:max-w-md">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
            <input
              type="search"
              placeholder="Search people, city, skills"
              name="q"
              defaultValue={searchQuery}
              className="w-full rounded-full border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </form>
        
        <div className="flex gap-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name}
                to={item.path} 
                className={`flex items-center gap-2 transition-colors duration-200 ${
                  isActive ? 'text-primary font-medium' : 'text-foreground/70 hover:text-primary'
                }`}
              >
                <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  );
}
