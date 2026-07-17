import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useLoginUser, useRegisterUser } from '@workspace/api-client-react';
import { Mail, Lock, User, ShieldCheck, Sparkles, ArrowRight, Loader2, Trophy } from 'lucide-react';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/translations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { t, isRtl } = useTranslation();
  const setAuth = useStore((state) => state.setAuth);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('demo@vibestadium.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [loading, setLoading] = useState(false);

  const loginMutation = useLoginUser();
  const signupMutation = useRegisterUser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    loginMutation.mutate({
      data: { email, password }
    }, {
      onSuccess: (data) => {
        setAuth(data.token, data.user);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.name}!`,
        });
        setLocation('/');
      },
      onError: (err: any) => {
        setLoading(false);
        toast({
          title: t('auth.loginError'),
          description: err.response?.data?.error || "Check your credentials and try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;

    setLoading(true);
    signupMutation.mutate({
      data: { name, email, password, favoriteTeam: favoriteTeam || undefined }
    }, {
      onSuccess: (data) => {
        setAuth(data.token, data.user);
        toast({
          title: "Registration Successful",
          description: `Welcome to VibeStadium, ${data.user.name}!`,
        });
        setLocation('/');
      },
      onError: (err: any) => {
        setLoading(false);
        toast({
          title: t('auth.signupError'),
          description: err.response?.data?.error || "Could not register. Try a different email.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="flex-1 bg-background flex flex-col items-center justify-center p-4 relative overflow-y-auto min-h-[calc(100dvh-60px)] lg:min-h-[100dvh]">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-warning/5 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md z-10 transition-all duration-300">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-4">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">VibeStadium</h1>
          <p className="text-sm text-muted-foreground mt-2">
            The next-generation stadium co-pilot companion
          </p>
        </div>

        {/* Auth Box Container */}
        <Card className="backdrop-blur-md bg-card/40 border border-white/5 shadow-2xl p-6 rounded-2xl">
          {/* Tab Switcher */}
          <div className="flex bg-muted/30 p-1 rounded-xl mb-6 border border-white/5">
            <button
              onClick={() => { setActiveTab('login'); setEmail('demo@vibestadium.com'); setPassword('password123'); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('nav.login')}
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setEmail(''); setPassword(''); setName(''); setFavoriteTeam(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'signup'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('nav.signup')}
            </button>
          </div>

          {activeTab === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="fan@stadium.com"
                    className={`w-full bg-background/50 border border-white/10 rounded-xl py-2.5 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-background/50 border border-white/10 rounded-xl py-2.5 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all`}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full mt-2 rounded-xl py-5 shadow-lg bg-primary hover:bg-primary-border text-white font-medium flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>{t('auth.loginBtn')}</span>
                    <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                  </>
                )}
              </Button>

              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">✨ Judges / Demo Account</span>
                <p className="text-[11.5px] text-gray-300">
                  Pre-filled: <strong className="text-white">demo@vibestadium.com</strong> / <strong className="text-white">password123</strong>
                </p>
              </div>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('auth.name')}
                </label>
                <div className="relative">
                  <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className={`w-full bg-background/50 border border-white/10 rounded-xl py-2.5 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="fan@stadium.com"
                    className={`w-full bg-background/50 border border-white/10 rounded-xl py-2.5 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-background/50 border border-white/10 rounded-xl py-2.5 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span>{t('auth.favoriteTeam')}</span>
                  <span className="text-[10px] text-muted-foreground">({t('auth.alreadyHaveAccount').split(' ')[0]})</span>
                </label>
                <div className="relative">
                  <Sparkles className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    value={favoriteTeam}
                    onChange={(e) => setFavoriteTeam(e.target.value)}
                    placeholder="e.g. Arsenal, Real Madrid"
                    className={`w-full bg-background/50 border border-white/10 rounded-xl py-2.5 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all`}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full mt-2 rounded-xl py-5 shadow-lg bg-primary hover:bg-primary-border text-white font-medium flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>{t('auth.signupBtn')}</span>
                    <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>

        {/* Bottom Switch Trigger (Direct Link style) */}
        <div className="text-center mt-6">
          <button
            onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            {activeTab === 'login' ? t('auth.noAccount') : t('auth.alreadyHaveAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}
