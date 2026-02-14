import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import InvitePage from './pages/InvitePage';
import LoadingSpinner from './components/LoadingSpinner';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { InstallBanner } from './components/pwa/InstallBanner';
import { UpdatePrompt } from './components/pwa/UpdatePrompt';
import { useBreakpoint } from './hooks/useBreakpoint';

function App() {
  const { isAuthenticated, isLoading } = useAuthStore();
  // Initialize layout store with current breakpoint on mount
  useBreakpoint();

  if (isLoading) {
    return (
      <div className="flex-center h-screen bg-discord-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Dashboard />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Dashboard />} />
        <Route path="/invite/:code" element={<InvitePage />} />
        <Route path="/*" element={isAuthenticated ? <Dashboard /> : <Login />} />
      </Routes>

      {/* PWA overlays — outside router so always rendered */}
      <OfflineBanner />
      <InstallBanner />
      <UpdatePrompt />
    </>
  );
}

export default App;
