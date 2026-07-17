import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetUserProfile, useUpdateUserProfile } from '@workspace/api-client-react';
import { User as UserIcon, Calendar, Trophy, AlertTriangle, ShieldCheck, Mail, ArrowLeft, Edit2, Check, X, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/translations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function ProfilePage() {
  const [match, params] = useRoute('/profile/:userId');
  const [, setLocation] = useLocation();
  const { t, isRtl } = useTranslation();
  const { toast } = useToast();

  const loggedInUser = useStore((state) => state.user);
  const setAuth = useStore((state) => state.setAuth);
  const token = useStore((state) => state.token);

  // Determine whose profile is being viewed
  const userId = match && params?.userId ? params.userId : loggedInUser?.id;
  const isOwner = loggedInUser && userId === loggedInUser.id;

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Fetch user profile from backend
  const { data: profile, isLoading, error, refetch } = useGetUserProfile(userId || '', {
    query: {
      enabled: !!userId,
      retry: false
    } as any
  });

  const updateProfileMutation = useUpdateUserProfile();

  // Populate edit fields when profile loads
  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditBio(profile.bio || '');
      setEditTeam(profile.favoriteTeam || '');
      setAvatarUrl(profile.avatarUrl || '');
      
      // Parse seed from avatar url if possible, e.g. seed=something
      if (profile.avatarUrl && profile.avatarUrl.includes('seed=')) {
        const seedParam = profile.avatarUrl.split('seed=')[1];
        setAvatarSeed(decodeURIComponent(seedParam || ''));
      }
    }
  }, [profile]);

  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatarSeed(randomSeed);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !editName.trim()) return;

    updateProfileMutation.mutate({
      userId,
      data: {
        name: editName,
        bio: editBio,
        favoriteTeam: editTeam,
        avatarUrl: avatarUrl
      }
    }, {
      onSuccess: (updatedUser) => {
        setIsEditing(false);
        // Update local session
        setAuth(token, updatedUser);
        toast({
          title: t('profile.updateSuccess'),
          description: "Your public profile has been updated.",
        });
        refetch();
      },
      onError: (err: any) => {
        toast({
          title: t('profile.updateError'),
          description: err.response?.data?.error || "Could not save changes.",
          variant: "destructive"
        });
      }
    });
  };

  if (!userId) {
    // If not logged in and no profile requested, prompt login
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{t('rewards.loginRequired')}</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          {t('rewards.loginRequiredDesc')}
        </p>
        <Button onClick={() => setLocation('/auth')} className="rounded-xl px-6 bg-primary hover:bg-primary-border text-white">
          {t('nav.login')} / {t('nav.signup')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">User Profile Not Found</h2>
        <p className="text-muted-foreground text-sm mb-6">
          The requested fan account does not exist or could not be loaded.
        </p>
        <Button onClick={() => setLocation('/')} className="rounded-xl bg-secondary text-white">
          Return to Home
        </Button>
      </div>
    );
  }

  // Format joined date
  const joinedDate = profile.createdAt ? new Date(profile.createdAt) : new Date();

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      {/* Header Profile Banner */}
      <div className="bg-card border-b border-border p-6 md:p-10 relative overflow-hidden">
        {/* Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar Area */}
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden bg-muted border-2 border-primary/20 shadow-xl flex items-center justify-center relative bg-background/50">
              {profile.avatarUrl ? (
                <img src={avatarUrl || profile.avatarUrl} alt={profile.name} className="w-full h-full object-contain" />
              ) : (
                <UserIcon className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="absolute -bottom-2 -right-2 h-9 w-9 rounded-xl bg-primary hover:bg-primary-border border border-white/10 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                title="Randomize avatar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User Details / Summary */}
          <div className={`flex-1 text-center md:text-start flex flex-col justify-center mt-2 ${isRtl ? 'md:text-right' : 'md:text-left'}`}>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {profile.name}
              </h1>
              {isOwner && !isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="md:self-center h-8 px-3 rounded-lg bg-secondary hover:bg-muted text-white text-xs border border-white/5 flex items-center gap-1.5 self-center"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{t('profile.editProfile')}</span>
                </Button>
              )}
            </div>

            {profile.favoriteTeam && (
              <p className="text-sm font-semibold text-primary mt-1.5 flex items-center justify-center md:justify-start gap-1.5">
                <Trophy className="w-4 h-4 text-warning" />
                <span>{profile.favoriteTeam}</span>
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center md:justify-start gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('profile.joined')} {format(joinedDate, 'MMMM yyyy')}</span>
            </p>

            {profile.bio && !isEditing && (
              <p className="text-sm text-muted-foreground mt-4 max-w-xl italic bg-muted/20 p-3 rounded-xl border border-white/5">
                "{profile.bio}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {isEditing ? (
          /* Profile Edit Mode Form */
          <Card className="p-6 border border-white/5 bg-card/60 backdrop-blur-md rounded-2xl">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-primary" />
                  {t('profile.editProfile')}
                </h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset states
                      setEditName(profile.name || '');
                      setEditBio(profile.bio || '');
                      setEditTeam(profile.favoriteTeam || '');
                      setAvatarUrl(profile.avatarUrl || '');
                    }}
                    className="h-8 px-3 rounded-lg bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs border border-white/5"
                  >
                    {t('profile.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-border text-white text-xs border border-white/10 flex items-center gap-1.5"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{t('profile.saveChanges')}</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {t('profile.nameLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-background/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {t('profile.favoriteTeamLabel')}
                  </label>
                  <input
                    type="text"
                    value={editTeam}
                    onChange={(e) => setEditTeam(e.target.value)}
                    placeholder={t('profile.favoriteTeamPlaceholder')}
                    className="w-full bg-background/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('profile.bioLabel')}
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder={t('profile.bioPlaceholder')}
                  rows={4}
                  className="w-full bg-background/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all resize-none"
                />
              </div>
            </form>
          </Card>
        ) : (
          /* Normal View Mode Details */
          <>
            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Wallet Credits Card */}
              <Card className="p-6 border border-white/5 bg-card/40 relative overflow-hidden rounded-2xl group hover:border-primary/20 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="w-24 h-24 rotate-12 text-primary" />
                </div>
                <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">
                  {t('profile.creditsEarned')}
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold tracking-tighter text-white">
                    {profile.credits.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-primary">CR</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Earned by helping report bins, arriving early, and following staggered transit exit.
                </p>
              </Card>

              {/* Bins Reported Card */}
              <Card className="p-6 border border-white/5 bg-card/40 relative overflow-hidden rounded-2xl group hover:border-warning/20 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
                  <UserIcon className="w-24 h-24 -rotate-12 text-warning" />
                </div>
                <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">
                  {t('profile.binsReported')}
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold tracking-tighter text-white">
                    {profile.binsReported.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-warning">REPORTS</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Crowd sourced bins flagged as full in stadium concourses to maintain cleanliness.
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
