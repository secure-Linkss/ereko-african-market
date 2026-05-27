'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSignup, useLogin } from '@/services/auth';

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  acceptTerms: z.boolean().refine((v) => v === true, 'You must accept the terms'),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale ?? 'en-gb';

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const signupMutation = useSignup();
  const loginMutation = useLogin();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: false },
  });

  async function onSubmit(data: SignupForm) {
    setError(null);
    try {
      await signupMutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      // Auto-login after signup
      await loginMutation.mutateAsync({ email: data.email, password: data.password });
      setDone(true);
      setTimeout(() => router.push(`/${locale}/account`), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to create account. The email may already be registered.');
    }
  }

  if (done) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="text-center space-y-4">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to EREKO!</h2>
          <p className="text-muted-foreground">Your account has been created. Redirecting...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-muted/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={`/${locale}`}>
            <img src="/logo.jpeg" alt="EREKO" className="h-16 w-16 rounded-full border-4 border-primary mx-auto mb-4 object-cover shadow-lg" />
          </Link>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Create your account</h1>
          <p className="text-muted-foreground mt-2">Join EREKO — Africa's finest foods, delivered</p>
        </div>

        <div className="bg-background rounded-2xl border border-border shadow-sm p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">First name</label>
                <Input placeholder="Amara" {...form.register('firstName')} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Last name</label>
                <Input placeholder="Okonkwo" {...form.register('lastName')} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email address</label>
              <Input type="email" placeholder="you@example.com" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  {...form.register('password')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Must be 8+ characters with an uppercase letter and a number</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  {...form.register('acceptTerms')}
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  I agree to EREKO's{' '}
                  <Link href={`/${locale}/terms`} className="text-primary hover:underline font-medium">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href={`/${locale}/privacy`} className="text-primary hover:underline font-medium">Privacy Policy</Link>
                </span>
              </label>
              {form.formState.errors.acceptTerms && (
                <p className="text-xs text-destructive">{form.formState.errors.acceptTerms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={signupMutation.isPending || loginMutation.isPending}
            >
              {signupMutation.isPending || loginMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
              ) : (
                <>Create account <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href={`/${locale}/login`} className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
