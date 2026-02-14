import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, type User } from '../stores/authStore';
import LoadingSpinner from '../components/LoadingSpinner';

interface LoginFormData {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data?: { user: User; accessToken: string; refreshToken: string };
  error?: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = (await res.json()) as AuthResponse;
      if (data.success && data.data) {
        login(data.data.user, data.data.accessToken, data.data.refreshToken);
        navigate('/');
      } else {
        setError(data.error ?? 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-center min-h-screen bg-discord-bg">
      <div className="bg-discord-bgSecondary p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-discord-textBright mb-6 text-center">
          Welcome Back
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-discord-text mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-discord-text mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary w-full flex items-center justify-center" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" /> : 'Login'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-discord-textMuted">
            No account?{' '}
            <Link to="/register" className="text-discord-accent hover:text-discord-accentHover">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
