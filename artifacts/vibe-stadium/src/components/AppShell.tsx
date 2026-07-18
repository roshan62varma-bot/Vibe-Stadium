import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Map, MessageSquare, Ticket, Bus, Activity, LogOut, User as UserIcon, LogIn, Globe, ChevronDown, Sliders, Eye, Volume2, Type, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';
import { useTranslation, Language, getTypographyTokens } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { t, language, isRtl } = useTranslation();
  
  const setLanguage = useStore((state) => state.setLanguage);
  const loggedInUser = useStore((state) => state.user);
  const setAuth = useStore((state) => state.setAuth);
  const { toast } = useToast();

  const [showOps, setShowOps] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Accessibility Control Drawer states
  const { 
    textMagnified, setTextMagnified, 
    colorContrastBoosted, setColorContrastBoosted, 
    screenReaderSynthesis, setScreenReaderSynthesis 
  } = useStore();
  const [isAccessDrawerOpen, setIsAccessDrawerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        setShowOps(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync accessibility classes on load/change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (textMagnified) {
        document.documentElement.classList.add('accessibility-magnified');
      } else {
        document.documentElement.classList.remove('accessibility-magnified');
      }
      
      if (colorContrastBoosted) {
        document.documentElement.classList.add('accessibility-contrast');
      } else {
        document.documentElement.classList.remove('accessibility-contrast');
      }
    }
  }, [textMagnified, colorContrastBoosted]);

  const typography = getTypographyTokens(language);

  // Sync HTML page layout direction dynamically (RTL for Arabic, LTR for others)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [isRtl, language]);

  const handleLogout = () => {
    setAuth(null, null);
    toast({
      title: "Logged Out",
      description: "You have been logged out of your session.",
    });
    setLocation('/auth');
  };

  const navItems = [
    { href: '/', label: t('nav.map'), icon: Map },
    { href: '/assistant', label: t('nav.assistant'), icon: MessageSquare },
    { href: '/rewards', label: t('nav.rewards'), icon: Ticket },
    { href: '/transit', label: t('nav.transit'), icon: Bus },
  ];

  if (showOps || location === '/ops') {
    navItems.push({ href: '/ops', label: 'Ops Console', icon: Activity });
  }

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]!;

  return (
    <div 
      dir={typography.direction} 
      className={cn("flex h-[100dvh] w-full bg-background text-foreground overflow-hidden", `lang-${language}`)}
    >
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col w-64 bg-card shrink-0",
        isRtl ? "border-l border-border" : "border-r border-border"
      )}>
        {/* Brand Header */}
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <Map className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">VibeStadium</span>
          </Link>
        </div>
        
        {/* Navigation Section */}
        <nav className="flex-1 px-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-card-foreground/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "")} />
                <span>{item.label}</span>
                {item.href === '/ops' && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 uppercase",
                    isRtl ? "mr-auto" : "ml-auto"
                  )}>
                    Staff
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer (Profile & Language Switcher) */}
        <div className="p-4 border-t border-border bg-card-border/5 space-y-3">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-background/50 hover:bg-background border border-white/5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span>{currentLangObj.flag} {currentLangObj.label}</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", langDropdownOpen ? "rotate-180" : "")} />
            </button>
            
            {langDropdownOpen && (
              <div className={cn(
                "absolute bottom-12 left-0 right-0 z-50 bg-card border border-border shadow-xl rounded-xl p-1.5 space-y-0.5",
                isRtl && "text-right"
              )}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as Language);
                      setLangDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2.5",
                      isRtl ? "text-right flex-row-reverse" : "text-left",
                      language === lang.code 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Section */}
          {loggedInUser ? (
            <div className="flex items-center justify-between gap-3 p-2 bg-background/30 rounded-xl border border-white/5">
              <Link href={`/profile/${loggedInUser.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                <div className="w-9 h-9 rounded-lg overflow-hidden border border-primary/20 bg-muted flex items-center justify-center shrink-0">
                  {loggedInUser.avatarUrl ? (
                    <img src={loggedInUser.avatarUrl} alt={loggedInUser.name} className="w-full h-full object-contain" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 text-start flex-1">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
                    {loggedInUser.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    {t('nav.profile')}
                  </p>
                </div>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              onClick={() => setLocation('/auth')}
              className="w-full rounded-xl bg-primary hover:bg-primary-border text-white text-sm font-medium py-5 flex items-center justify-center gap-2 shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('nav.login')} / {t('nav.signup')}</span>
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              <Map className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-white">VibeStadium</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Mobile Language Switcher Icon */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="p-2 rounded-xl bg-muted/40 border border-white/5 text-muted-foreground hover:text-foreground"
                title="Switch Language"
              >
                <Globe className="w-4 h-4" />
              </button>
              
              {langDropdownOpen && (
                <div className={cn(
                  "absolute top-10 z-50 bg-card border border-border shadow-xl rounded-xl p-1.5 space-y-0.5 w-36",
                  isRtl ? "left-0 text-right" : "right-0 text-left"
                )}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as Language);
                        setLangDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2",
                        isRtl ? "text-right flex-row-reverse" : "text-left",
                        language === lang.code 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:bg-background"
                      )}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Auth/Profile Icon */}
            {loggedInUser ? (
              <Link 
                href={`/profile/${loggedInUser.id}`}
                className="w-8 h-8 rounded-lg overflow-hidden border border-primary/20 bg-muted flex items-center justify-center"
              >
                {loggedInUser.avatarUrl ? (
                  <img src={loggedInUser.avatarUrl} alt={loggedInUser.name} className="w-full h-full object-contain" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </Link>
            ) : (
              <button
                onClick={() => setLocation('/auth')}
                className="p-2 rounded-xl bg-primary/25 border border-primary/40 text-primary hover:text-white"
                title="Login / Signup"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}

            {location === '/ops' && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/20 text-destructive border border-destructive/30 uppercase">
                Staff
              </span>
            )}
          </div>
        </header>

        {/* Page children contents wrapper */}
        <div className="flex-1 overflow-auto flex flex-col relative">
          {children}
        </div>

        {/* Accessibility Control Drawer Toggle Button & Panel */}
        <div className={cn(
          "fixed z-50 flex flex-col items-end gap-2",
          isRtl ? "left-4 bottom-20 lg:left-6 lg:bottom-6" : "right-4 bottom-20 lg:right-6 lg:bottom-6"
        )}>
          {/* Drawer Expand Panel */}
          <AnimatePresence>
            {isAccessDrawerOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card border border-border shadow-2xl p-4 rounded-2xl w-64 space-y-4 mb-2 text-start backdrop-blur-xl bg-card/95"
              >
                <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Sliders className="w-3.5 h-3.5" /> Accessibility Center
                </h4>
                
                <div className="space-y-3 text-xs">
                  {/* Magnify Toggle */}
                  <button 
                    onClick={() => setTextMagnified(!textMagnified)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-background/50 hover:bg-background border border-white/5 transition-all text-white font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-emerald-400" />
                      <span>Text Magnification (+20%)</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      textMagnified ? "bg-primary border-primary text-black" : "border-white/20"
                    )}>
                      {textMagnified && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  {/* Contrast Booster Toggle */}
                  <button 
                    onClick={() => setColorContrastBoosted(!colorContrastBoosted)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-background/50 hover:bg-background border border-white/5 transition-all text-white font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Contrast Booster (WCAG AAA)</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      colorContrastBoosted ? "bg-primary border-primary text-black" : "border-white/20"
                    )}>
                      {colorContrastBoosted && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  {/* Speech Toggle */}
                  <button 
                    onClick={() => setScreenReaderSynthesis(!screenReaderSynthesis)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-background/50 hover:bg-background border border-white/5 transition-all text-white font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span>Screen-Reader Speech</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      screenReaderSynthesis ? "bg-primary border-primary text-black" : "border-white/20"
                    )}>
                      {screenReaderSynthesis && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating trigger button */}
          <button
            onClick={() => setIsAccessDrawerOpen(!isAccessDrawerOpen)}
            className="h-12 w-12 rounded-full bg-primary hover:bg-primary-border text-black font-bold flex items-center justify-center shadow-lg shadow-emerald-950/40 relative overflow-hidden group transition-all"
            title="Expand accessibility options drawer"
          >
            <Sliders className="w-5 h-5 text-black group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden flex items-center justify-around border-t border-border bg-card pb-safe shrink-0">
          {navItems.slice(0, 4).map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 flex-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

function toast(arg: { title: string; description: string }) {
  console.log(arg.title, arg.description);
}
