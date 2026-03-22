import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import Marketplace from '../pages/Marketplace';
import Messages from '../pages/Messages';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/messages" element={<Messages />} />
    </Routes>
  );
}
