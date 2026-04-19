import { Routes, Route } from 'react-router-dom';
import Landing from '../pages/Landing';
import SignIn from '../pages/SignIn';
import SignUp from '../pages/SignUp';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import PublicProfile from '../pages/PublicProfile';
import Marketplace from '../pages/Marketplace';
import Messages from '../pages/Messages';
import Onboarding from '../pages/Onboarding';
import HireRequest from '../pages/HireRequest';
import NotificationsDashboard from '../pages/NotificationsDashboard';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/home" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:profileId" element={<PublicProfile />} />
      <Route path="/hire/:profileId" element={<HireRequest />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/notifications" element={<NotificationsDashboard />} />
    </Routes>
  );
}
