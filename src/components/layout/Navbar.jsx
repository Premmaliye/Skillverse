import { Link, useLocation } from 'react-router-dom';
import { Home, User, ShoppingBag, MessageSquare, LogOut } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  
  // Hide navbar on landing, signin, signup pages
  const hiddenPaths = ['/', '/signin', '/signup'];
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }
  
  const navItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Market', path: '/marketplace', icon: ShoppingBag },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/home" className="font-bold text-2xl text-primary tracking-tight">
          SkillVerse
        </Link>
        
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
