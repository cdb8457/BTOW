import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, type User } from '../stores/authStore';
import LoadingSpinner from '../components/LoadingSpinner';

interface RegisterFormData {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthResponse {
  success: boolean;
  data?: { user: User; accessToken: string; refreshToken: string };
  error?: string;
}

export default function Register() {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const validate = () => {
    if (!formData.username || !formData.displayName || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return false;
    }
    if (!/^[a-zA-Z0-9_]{2,32}$/.test(formData.username)) {
      setError('Username: 2-32 chars, letters/numbers/underscores only');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const { confirmPassword: _c, ...payload } = formData;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as AuthResponse;
      if (data.success && data.data) {
        login(data.data.user, data.data.accessToken, data.data.refreshToken);
        navigate('/');
      } else {
        setError(data.error ?? 'Registration failed');
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
        <h1 className="text-2xl font-bold text-discord-textBright mb-6 text-center">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(
            [
              { id: 'username', label: 'Username', type: 'text', placeholder: 'letters_numbers_underscore' },
              { id: 'displayName', label: 'Display Name', type: 'text', placeholder: 'Your name' },
              { id: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
              { id: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
            ] as const
          ).map(({ id, label, type, placeholder }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-medium text-discord-text mb-1">
                {label}
              </label>
              <input
                id={id}
                name={id}
                type={type}
                value={formData[id]}
                onChange={handleChange}
                className="input-field w-full"
                placeholder={placeholder}
                disabled={isLoading}
              />
            </div>
          ))}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary w-full flex items-center justify-center" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" /> : 'Create Account'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-discord-textMuted">
            Already have an account?{' '}
            <Link to="/login" className="text-discord-accent hover:text-discord-accentHover">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
