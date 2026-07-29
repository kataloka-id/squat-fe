import React, { useRef, useState } from 'react';
import { Logo } from './Logo';
import { Input } from './Input';
import { Button } from './Button';
import { AuthService } from '@/src/api/auth.service.ts';
import { useNavigate } from 'react-router-dom';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isSubmitting = useRef(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim();

    if (isSubmitting.current) return;

    if (!normalizedEmail || !password) {
      setErrorMessage('Email dan password wajib diisi.');
      return;
    }

    try {
      isSubmitting.current = true;
      setIsLoading(true);
      setErrorMessage('');

      const response = await AuthService.postAuthLogin({
        email: normalizedEmail,
        password,
      });

      if (!response.success) {
        throw new Error('Login tidak dapat diproses. Silakan coba lagi.');
      }

      navigate('/workspace', { replace: true });
    } catch (error: unknown) {
      const status =
        typeof error === 'object' && error !== null && 'status' in error
          ? Number(error.status)
          : undefined;

      if (status === 400 || status === 401) {
        setErrorMessage('Email atau password tidak valid.');
      } else if (status === 429) {
        setErrorMessage('Terlalu banyak percobaan login. Silakan coba lagi nanti.');
      } else if (error instanceof Error && error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Login gagal. Silakan coba lagi.');
      }
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

    /*

setIsLoading(true);

    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      alert('Login attempt captured. (Frontend Demo Only)');
    }, 1500);
  };

     */

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  return (
    <div className="relative mx-auto flex w-full max-w-[320px] flex-col justify-center py-4 sm:max-w-[400px] md:py-0">
      {/* Brand / Logo 
          - mb-12 (48px) for mobile
          - lg:mb-16 (64px) for desktop - Proportional spacing, not too far, not too close
      */}
      <div
        className="mb-12 animate-fade-in-up opacity-0 lg:mb-16"
        style={{ animationDelay: '0ms' }}
      >
        <Logo />
      </div>

      <div className="flex flex-col">
        {/* Header Section */}
        <div
          className="mb-8 animate-fade-in-up opacity-0 lg:mb-10"
          style={{ animationDelay: '100ms' }}
        >
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-gray-900 lg:text-3xl">
            Portal Access
          </h1>
          <p className="text-sm font-medium leading-relaxed text-gray-500">
            Welcome back. Please enter your credentials to access the workspace.
          </p>
        </div>

        {/* Form Section */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="animate-fade-in-up space-y-6 opacity-0 lg:space-y-7"
          style={{ animationDelay: '200ms' }}
        >
          <div className="space-y-5">
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="user@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage('');
              }}
              required
              autoComplete="email"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                  <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                </svg>
              }
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage('');
              }}
              required
              autoComplete="current-password"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
          </div>

          {errorMessage && (
            <p
              className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="pt-2 lg:pt-4">
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!isFormValid}
              aria-busy={isLoading}
            >
              Sign In
            </Button>
          </div>
        </form>
      </div>

      {/* Footer Section 
          - mt-10 for mobile
          - lg:mt-20 for desktop
      */}
      <div
        className="mt-10 animate-fade-in-up opacity-0 lg:mt-20"
        style={{ animationDelay: '300ms' }}
      >
        <div className="border-t border-gray-100 pt-6">
          <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-gray-400 md:text-left">
            &copy; 2026 SQUAT HUB | kataloka.id
          </p>
        </div>
      </div>
    </div>
  );
};
