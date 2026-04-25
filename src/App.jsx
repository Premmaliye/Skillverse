import { BrowserRouter } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AppRoutes from './routes/AppRoutes';

function AppLayout() {
  const location = useLocation();
  const hiddenPaths = ['/', '/signin', '/signup', '/onboarding'];
  const showDesktopSidebar = !hiddenPaths.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className={`flex-1 w-full relative app-main ${showDesktopSidebar ? 'with-left-nav' : ''}`}>
        <AppRoutes />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App
