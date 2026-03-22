import { BrowserRouter } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 w-full relative">
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
