'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin, useForgotPassword } from '@/services/auth';
import { useAuthStore } from '@/store/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type LoginForm = z.infer<typeof loginSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale ?? 'en-gb';

  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'forgot-sent'>('login');
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLogin();
  const forgotMutation = useForgotPassword();
  const isMfaPending = useAuthStore((s) => s.isMfaPending);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const forgotForm = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  async function onLogin(data: LoginForm) {
    setError(null);
    try {
      await loginMutation.mutateAsync({ email: data.email, password: data.password });
      if (!isMfaPending) {
        router.push(`/${locale}/account`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Login failed. Please check your credentials.');
    }
  }

  async function onForgot(data: ForgotForm) {
    setError(null);
    try {
      await forgotMutation.mutateAsync(data.email);
      setMode('forgot-sent');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to send reset email.');
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-muted/20">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`}>
            <img src="/logo.jpeg" alt="EREKO" className="h-16 w-16 rounded-full border-4 border-primary mx-auto mb-4 object-cover shadow-lg" />
          </Link>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset password' : 'Check your email'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === 'login'
              ? 'Sign in to your EREKO account'
              : mode === 'forgot'
              ? 'Enter your email to receive a reset link'
              : `We've sent a link to ${forgotForm.getValues('email')}`}
          </p>
        </div>

        <div className="bg-background rounded-2xl border border-border shadow-sm p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...loginForm.register('email')}
                  className={loginForm.formState.errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...loginForm.register('password')}
                    className={`pr-10 ${loginForm.formState.errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  {...forgotForm.register('email')}
                />
                {forgotForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{forgotForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={forgotMutation.isPending}>
                {forgotMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <>Send reset link <Mail className="ml-2 h-4 w-4" /></>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* Forgot Sent State */}
          {mode === 'forgot-sent' && (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                If an account exists with that email, you'll receive a reset link shortly. Check your spam folder too.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setMode('login')}>
                Back to sign in
              </Button>
            </div>
          )}

          {mode === 'login' && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href={`/${locale}/signup`} className="text-primary font-semibold hover:underline">
                Create account
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
