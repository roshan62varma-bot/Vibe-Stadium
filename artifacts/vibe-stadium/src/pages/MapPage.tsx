import React, { useMemo, useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGetZones, useGetRoute } from '@workspace/api-client-react';
import { useStore } from '@/store';
import { Card } from '@/components/ui/card';
import { AIBanner } from '@/components/AIBanner';
import { 
  ArrowLeft, ArrowRight, Play, Square, Compass, Eye, ShieldAlert, 
  MapPin, Check, ChevronRight, X, AlertTriangle, AlertOctagon,
  Zap, HelpCircle, Navigation, Info, ArrowUp, Sliders, Cpu, HeartPulse, CheckCircle
} from 'lucide-react';
import { useOverrideZoneCapacity } from '@workspace/api-client-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMockSimulation } from '@/hooks/use-simulation';
import { useTranslation } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Zone } from '@workspace/api-client-react';

const MOCK_ZONES: Partial<Zone>[] = [
  { id: 'gate-north', name: 'North Gate', type: 'gate', coordinates: [400, 60], capacityCurrent: 45 },
  { id: 'gate-south', name: 'South Gate', type: 'gate', coordinates: [400, 560], capacityCurrent: 85 },
  { id: 'gate-east', name: 'East Gate', type: 'gate', coordinates: [720, 310], capacityCurrent: 88 },
  { id: 'gate-west', name: 'West Gate', type: 'gate', coordinates: [80, 310], capacityCurrent: 20 },
  { id: 'concourse-ne', name: 'NE Concourse', type: 'concourse', coordinates: [580, 160], capacityCurrent: 83 },
  { id: 'concourse-se', name: 'SE Concourse', type: 'concourse', coordinates: [580, 460], capacityCurrent: 90 },
  { id: 'concourse-nw', name: 'NW Concourse', type: 'concourse', coordinates: [220, 160], capacityCurrent: 40 },
  { id: 'concourse-sw', name: 'SW Concourse', type: 'concourse', coordinates: [220, 460], capacityCurrent: 55 },
  { id: 'seating-north', name: 'North Stand', type: 'seating', coordinates: [400, 200], capacityCurrent: 91 },
  { id: 'seating-south', name: 'South Stand', type: 'seating', coordinates: [400, 420], capacityCurrent: 78 },
  { id: 'medical-zone', name: 'Medical Center', type: 'medical', coordinates: [220, 310], capacityCurrent: 9 },
  { id: 'transit-hub', name: 'Transit Hub', type: 'transit', coordinates: [650, 500], capacityCurrent: 30 },
  { id: 'amenity-east', name: 'Food & Merch East', type: 'amenity', coordinates: [640, 200], capacityCurrent: 68 },
  { id: 'amenity-west', name: 'Food & Merch West', type: 'amenity', coordinates: [160, 420], capacityCurrent: 33 },
];

const getZoneTypeDetails = (type: string) => {
  switch (type) {
    case 'gate':
      return { color: '#38BDF8', label: '🚪' };
    case 'seating':
      return { color: '#F97316', label: '💺' };
    case 'amenity':
      return { color: '#EC4899', label: '🍔' };
    case 'medical':
      return { color: '#EF4444', label: '🏥' };
    case 'transit':
      return { color: '#6366F1', label: '🚌' };
    default: // concourse
      return { color: '#10B981', label: '🚶' };
  }
};

export default function MapPage() {
  useMockSimulation();
  const { t, isRtl, language } = useTranslation();
  const { toast } = useToast();
  const { stepFreeOnly, user: loggedInUser } = useStore();
  
  // Custom greeting based on time of day
  const greetingText = useMemo(() => {
    const hours = new Date().getHours();
    let timeGreeting = 'Welcome';
    if (hours < 12) timeGreeting = 'Good morning';
    else if (hours < 17) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';
    
    if (loggedInUser?.name) {
      return `${timeGreeting}, ${loggedInUser.name}! 👋`;
    }
    return `${timeGreeting} to VibeStadium! 👋`;
  }, [loggedInUser]);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [routingMode, setRoutingMode] = useState<{from: string, to: string | null} | null>(null);
  
  // Navigation Prototype States
  const [isNavigating, setIsNavigating] = useState(false);
  const [travelerProgress, setTravelerProgress] = useState(0); // 0 to 1
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Judge Simulation Panel states
  const [simulateBottleneck, setSimulateBottleneck] = useState(false);
  const [simulateEmergency, setSimulateEmergency] = useState(false);
  const overrideMutation = useOverrideZoneCapacity();

  const handleBottleneckToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSimulateBottleneck(checked);
    overrideMutation.mutate({
      zoneId: 'concourse-nw',
      data: { capacityCurrent: checked ? 85 : 40 }
    }, {
      onError: (err) => {
        console.warn("Override mutation failed (local offline fallback mode):", err);
      }
    });
    toast({
      title: checked ? "Bottleneck Injected" : "Bottleneck Cleared",
      description: checked 
        ? "Concourse NW congestion set to 85%. Pathfinding routes will detour."
        : "Concourse NW congestion restored to nominal level.",
    });
  };

  const handleEmergencyToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSimulateEmergency(checked);
    overrideMutation.mutate({
      zoneId: 'gate-e',
      data: { capacityCurrent: checked ? 90 : 35 }
    }, {
      onError: (err) => {
        console.warn("Override mutation failed (local offline fallback mode):", err);
      }
    });
    toast({
      title: checked ? "Emergency Mode Injected" : "Emergency Cleared",
      description: checked 
        ? "East Gate set to 90% congestion. Emergency detour activated."
        : "Emergency state cleared.",
    });
  };

  const { data: apiZones } = useGetZones();
  
  const zones = useMemo(() => {
    if (!apiZones || apiZones.length === 0) {
      return MOCK_ZONES as Zone[];
    }
    return apiZones.map(z => {
      const mock = MOCK_ZONES.find(m => m.id === z.id);
      return {
        ...z,
        capacityCurrent: z.id === 'medical-zone' ? 9 : z.capacityCurrent,
        coordinates: z.coordinates?.length === 2 ? z.coordinates : (mock?.coordinates || [50, 50])
      } as Zone;
    });
  }, [apiZones]);

  const { data: route, isLoading: isLoadingRoute } = useGetRoute(
    { from: routingMode?.from || '', to: routingMode?.to || '', stepFreeOnly },
    { query: { enabled: !!routingMode?.from && !!routingMode?.to } as any }
  );

  const fromZone = zones.find(z => z.id === routingMode?.from);
  const toZone = zones.find(z => z.id === routingMode?.to);

  // Compute all step-by-step nodes along the route path
  const routeNodes = useMemo(() => {
    if (!route || !fromZone) return [];
    return [fromZone, ...route.steps.map(s => zones.find(z => z.id === s.zoneId)).filter(Boolean)] as Zone[];
  }, [route, fromZone, zones]);

  // Traveler Movement Loop along Route Nodes
  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (isNavigating && routeNodes.length > 1) {
      animationTimer = setInterval(() => {
        setTravelerProgress(prev => {
          if (prev >= 1) {
            // Move to next node step
            setCurrentStepIndex(curr => {
              if (curr >= routeNodes.length - 2) {
                // Loop back to start node
                return 0;
              }
              return curr + 1;
            });
            return 0;
          }
          return prev + 0.04; // Movement speed factor
        });
      }, 100);
    }
    return () => {
      clearInterval(animationTimer);
    };
  }, [isNavigating, routeNodes]);

  // Start navigation mode
  const startNavigation = () => {
    if (!route) return;
    setIsNavigating(true);
    setTravelerProgress(0);
    setCurrentStepIndex(0);
    setSelectedZoneId(null);
    toast({
      title: "Navigation Started",
      description: "Live path coordinate guidance is active.",
      className: "bg-primary text-black border-primary"
    });
  };

  // Exit navigation mode
  const stopNavigation = () => {
    setIsNavigating(false);
    setRoutingMode(null);
    setTravelerProgress(0);
    setCurrentStepIndex(0);
  };

  // Compute traveler coordinates & angle heading (fixed pointing direction forward)
  const travelerInfo = useMemo(() => {
    if (routeNodes.length < 2 || currentStepIndex >= routeNodes.length - 1) {
      return { cx: 0, cy: 0, angle: 0 };
    }
    const current = routeNodes[currentStepIndex];
    const next = routeNodes[currentStepIndex + 1];
    
    const cx = current.coordinates[0] + (next.coordinates[0] - current.coordinates[0]) * travelerProgress;
    const cy = current.coordinates[1] + (next.coordinates[1] - current.coordinates[1]) * travelerProgress;

    const dx = next.coordinates[0] - current.coordinates[0];
    const dy = next.coordinates[1] - current.coordinates[1];
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // Fixed +90 deg offset to point chevron forward

    return { cx, cy, angle };
  }, [routeNodes, currentStepIndex, travelerProgress]);

  // Compute a list of directional chevron indicators along each route edge
  const routeChevrons = useMemo(() => {
    const chevrons: { x: number, y: number, angle: number }[] = [];
    if (routeNodes.length < 2) return chevrons;

    routeNodes.slice(0, -1).forEach((z, i) => {
      const next = routeNodes[i + 1];
      if (!z || !next) return;

      const [x1, y1] = z.coordinates;
      const [x2, y2] = next.coordinates;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      const spacing = 35; // Place an arrow every 35 pixels
      const count = Math.floor(len / spacing);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // Point chevron forward

      for (let k = 1; k < count; k++) {
        const ratio = k / count;
        chevrons.push({
          x: x1 + dx * ratio,
          y: y1 + dy * ratio,
          angle
        });
      }
    });

    return chevrons;
  }, [routeNodes]);

  const handleZoneClick = (zone: Zone) => {
    if (isNavigating) return;
    
    if (routingMode && routingMode.to === null && zone.id !== routingMode.from) {
      setRoutingMode({ from: routingMode.from, to: zone.id });
      setSelectedZoneId(null);
    } else {
      setSelectedZoneId(zone.id);
      setRoutingMode(null);
    }
  };

  const getCapacityColorClass = (pct: number) => {
    if (pct >= 75) return 'text-destructive';
    if (pct >= 60) return 'text-warning';
    return 'text-primary';
  };

  const getCapacityBgColorClass = (pct: number) => {
    if (pct >= 75) return 'bg-destructive';
    if (pct >= 60) return 'bg-warning';
    return 'bg-primary';
  };

  const getCapacityColor = (pct: number) => {
    if (pct >= 75) return '#EF4444';
    if (pct >= 60) return '#F59E0B';
    return '#10B981';
  };

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  const getTrendLabel = (dir: string) => {
    if (language === 'es') {
      return dir === 'rising' ? 'Llenándose' : dir === 'falling' ? 'Despejándose' : 'Estable';
    } else if (language === 'fr') {
      return dir === 'rising' ? 'Se remplit' : dir === 'falling' ? 'Se libère' : 'Stable';
    } else if (language === 'pt') {
      return dir === 'rising' ? 'Enchendo' : dir === 'falling' ? 'Esvaziando' : 'Estável';
    } else if (language === 'ar') {
      return dir === 'rising' ? 'يمتلئ' : dir === 'falling' ? 'يفرغ' : 'مستقر';
    }
    return dir === 'rising' ? 'Filling up' : dir === 'falling' ? 'Clearing' : 'Stable';
  };

  const getZoneTypeTranslation = (type: string) => {
    const mapTypes: Record<string, string> = {
      gate: language === 'ar' ? 'بوابة' : language === 'es' ? 'Puerta' : language === 'fr' ? 'Porte' : language === 'pt' ? 'Portão' : 'Gate',
      concourse: language === 'ar' ? 'بهو' : language === 'es' ? 'Vestíbulo' : language === 'fr' ? 'Coursive' : language === 'pt' ? 'Saguão' : 'Concourse',
      seating: language === 'ar' ? 'مقاعد' : language === 'es' ? 'Asientos' : language === 'fr' ? 'Gradins' : language === 'pt' ? 'Assentos' : 'Seating',
      amenity: language === 'ar' ? 'خدمات' : language === 'es' ? 'Servicios' : language === 'fr' ? 'Services' : language === 'pt' ? 'Serviços' : 'Amenity',
      medical: language === 'ar' ? 'طبي' : language === 'es' ? 'Médico' : language === 'fr' ? 'Médical' : language === 'pt' ? 'Médico' : 'Medical',
      transit: language === 'ar' ? 'مواصلات' : language === 'es' ? 'Tránsito' : language === 'fr' ? 'Transit' : language === 'pt' ? 'Trânsito' : 'Transit',
    };
    return mapTypes[type] || type;
  };

  // Localized time required labels
  const getTimeRequiredLabel = (mins: number) => {
    const templates: Record<string, string> = {
      en: `Time required: ${mins} mins to reach`,
      es: `Tiempo necesario: ${mins} minutos para llegar`,
      fr: `Temps nécessaire : ${mins} min pour arriver`,
      pt: `Tempo necessário: ${mins} minutos para chegar`,
      ar: `الوقت المطلوب: ${mins} دقائق للوصول`
    };
    return templates[language] || templates.en;
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#090D16] text-white">
      {/* Decorative Grid Mesh overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-tech-grid-sm" />

      {/* Floating Judge Control Panel */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
        <div className="bg-card/95 border border-border backdrop-blur-xl rounded-2xl p-4 shadow-2xl space-y-3 text-start max-w-[280px]">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">Judge Simulator</span>
          </div>
          <div className="space-y-2.5">
            <label className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground cursor-pointer gap-4">
              <span>Simulate 85% Bottleneck</span>
              <input 
                type="checkbox" 
                checked={simulateBottleneck}
                onChange={handleBottleneckToggle}
                className="rounded border-white/10 bg-background text-primary focus:ring-primary w-3.5 h-3.5"
              />
            </label>
            <label className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground cursor-pointer gap-4">
              <span>Simulate Exit Emergency</span>
              <input 
                type="checkbox" 
                checked={simulateEmergency}
                onChange={handleEmergencyToggle}
                className="rounded border-white/10 bg-background text-primary focus:ring-primary w-3.5 h-3.5"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Floating Active Navigation Dashboard Overlay (Time required to reach & direction arrows) */}
      <AnimatePresence>
        {isNavigating && route && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-4 right-4 z-30 max-w-md mx-auto"
          >
            <Card className="p-4 border-emerald-500/30 bg-black/85 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 text-start relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 animate-pulse" />
              
              <div className="flex items-center gap-3 pl-2">
                {/* Arrow Direction Marker pointing forward dynamically */}
                <div 
                  className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center transition-all duration-300"
                  style={{ transform: `rotate(${travelerInfo.angle}deg)` }}
                >
                  <ArrowUp className="w-6 h-6 text-emerald-400" />
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 animate-spin" /> Navigator Active
                  </span>
                  
                  {/* Time Required to Reach Label */}
                  <h3 className="font-mono text-sm font-black text-white mt-1">
                    {getTimeRequiredLabel(route.estimatedMinutes)}
                  </h3>
                  
                  <p className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5">
                    Heading: {routeNodes[currentStepIndex + 1]?.name || 'Target'}
                  </p>
                </div>
              </div>

              <Button 
                onClick={stopNavigation}
                size="sm"
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold"
              >
                Exit
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI banner for route context */}
      {route && !isNavigating && (
        <AIBanner 
          type="route"
          routeContext={JSON.stringify(route)}
        />
      )}

      {/* Dynamic Welcome Header */}
      <div className="px-4 md:px-6 pt-6 pb-2 max-w-3xl mx-auto w-full text-start z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-slate-900/20 border border-emerald-500/25 backdrop-blur-md shadow-2xl flex items-center justify-between"
        >
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
              {greetingText}
            </h2>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Stadium Companion Active
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
            <span>Stadium Status</span>
            <span className="text-emerald-400 font-bold text-xs mt-0.5">62% Occupied</span>
          </div>
        </motion.div>
      </div>

      {/* SVG Map Layout Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 min-h-[350px]">
        <ErrorBoundary fallbackTitle="Stadium Interactive Map Offline">
          {/* SVG Viewport */}
          <svg viewBox="0 0 800 620" className="w-full h-auto max-w-3xl aspect-[800/620] drop-shadow-2xl overflow-visible">
          <defs>
            {/* Neon Glow Filters */}
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear Gradients */}
            <linearGradient id="pitch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(16,185,129,0.08)" />
              <stop offset="100%" stopColor="rgba(4,120,87,0.01)" />
            </linearGradient>
            <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          {/* Pitch / Arena Center (Futuristic Markings) */}
          <g opacity="0.65">
            {/* Outer boundary */}
            <rect x="290" y="220" width="220" height="180" rx="15" fill="url(#pitch-grad)" stroke="rgba(16,185,129,0.25)" strokeWidth="2.5" filter="url(#glow-emerald)" />
            {/* Midfield line */}
            <line x1="400" y1="220" x2="400" y2="400" stroke="rgba(16,185,129,0.2)" strokeWidth="2" />
            {/* Midfield circle */}
            <circle cx="400" cy="310" r="30" fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="2" />
            <circle cx="400" cy="310" r="4" fill="rgba(16,185,129,0.3)" />
            {/* Left Penalty Area */}
            <rect x="290" y="270" width="40" height="80" fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
            <path d="M 330 295 A 20 20 0 0 1 330 325" fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
            {/* Right Penalty Area */}
            <rect x="470" y="270" width="40" height="80" fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
            <path d="M 470 295 A 20 20 0 0 0 470 325" fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
          </g>
          <text x="400" y="314" fill="rgba(16,185,129,0.2)" fontSize="18" textAnchor="middle" dominantBaseline="middle" fontWeight="900" letterSpacing="10" pointerEvents="none">
            {language === 'ar' ? 'الملعب' : language === 'es' ? 'CAMPO' : language === 'fr' ? 'TERRAIN' : language === 'pt' ? 'CAMPO' : 'PITCH'}
          </text>

          {/* Connection paths (Glowing cyber lines) */}
          {zones.map(zone =>
            (zone.connections ?? []).map((conn: any) => {
              const target = zones.find(z => z.id === conn.toZoneId);
              if (!target) return null;
              if (zone.id >= target.id) return null;
              return (
                <line
                  key={`${zone.id}-${conn.toZoneId}`}
                  x1={zone.coordinates[0]}
                  y1={zone.coordinates[1]}
                  x2={target.coordinates[0]}
                  y2={target.coordinates[1]}
                  stroke={conn.hasStairs ? '#F59E0B' : '#0EA5E9'}
                  strokeWidth="2.5"
                  opacity={conn.hasStairs ? 0.35 : 0.15}
                  strokeDasharray={conn.hasStairs ? '6 4' : undefined}
                  className={cn(conn.hasStairs ? "animate-[pulse_1.5s_infinite]" : "")}
                  filter={conn.hasStairs ? 'url(#glow-gold)' : 'url(#glow-cyan)'}
                />
              );
            })
          )}

          {/* Render Route highlight path */}
          {route && routeNodes.length > 1 && (
            routeNodes.slice(0, -1).map((z, i) => {
              const next = routeNodes[i + 1];
              if (!z || !next) return null;
              return (
                <motion.line
                  key={`route-${i}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  x1={z.coordinates[0]}
                  y1={z.coordinates[1]}
                  x2={next.coordinates[0]}
                  y2={next.coordinates[1]}
                  stroke="#10B981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  className="animate-path-dash"
                  filter="url(#glow-emerald)"
                />
              );
            })
          )}

          {/* Sequence of Short Direction Arrows Pointing towards where to go */}
          {route && routeChevrons.map((chevron, index) => (
            <g 
              key={`dir-chevron-${index}`} 
              transform={`translate(${chevron.x}, ${chevron.y}) rotate(${chevron.angle})`}
            >
              <path 
                d="M -3 3 L 0 -3 L 3 3 L 0 1 Z" 
                fill={isNavigating ? "#10B981" : "#3B82F6"} 
                className="animate-[pulse_2s_infinite]"
                style={{ animationDelay: `${(index * 150) % 1500}ms` }}
              />
            </g>
          ))}

          {/* Animated Chevron Navigation Traveler pointing forward */}
          {isNavigating && travelerInfo.cx > 0 && (
            <g transform={`translate(${travelerInfo.cx}, ${travelerInfo.cy}) rotate(${travelerInfo.angle})`}>
              {/* Radar pulse radar ring */}
              <circle r="16" fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth="1" className="animate-ping" />
              {/* Inner arrow indicator */}
              <path 
                d="M -7 8 L 0 -10 L 7 8 L 0 3 Z" 
                fill="#10B981" 
                stroke="#fff" 
                strokeWidth="1.5"
                filter="url(#glow-emerald)"
              />
            </g>
          )}

          {/* Render Zone Node Coordinates (Holographic Beacon Rings) */}
          {zones.map(zone => {
            const isSelected = selectedZoneId === zone.id || routingMode?.from === zone.id || routingMode?.to === zone.id;
            const capColor = getCapacityColor(zone.capacityCurrent);
            const typeInfo = getZoneTypeDetails(zone.type);
            const [cx, cy] = zone.coordinates;
            const R = 18;

            return (
              <g
                key={zone.id}
                transform={`translate(${cx}, ${cy})`}
                onClick={() => handleZoneClick(zone)}
                className="cursor-pointer"
                role="button"
                aria-label={`${zone.name}: ${Math.round(zone.capacityCurrent)}% capacity`}
              >
                {/* Visual rotating dashed glow on select */}
                {isSelected && (
                  <motion.circle
                    r={R + 10}
                    fill="none"
                    stroke={capColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    filter={zone.capacityCurrent >= 75 ? "url(#glow-red)" : "url(#glow-cyan)"}
                  />
                )}

                {/* Pulsing bottleneck alert - High-intensity flashing crimson warning */}
                {zone.capacityCurrent >= 75 && (
                  <>
                    <circle
                      r={R + 10}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="3.5"
                      className="animate-ping opacity-90"
                    />
                    <circle
                      r={R + 4}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2"
                      className="animate-[pulse_1s_infinite] opacity-80"
                    />
                  </>
                )}

                {/* Outermost beacon ring */}
                <circle
                  r={R}
                  fill="#090D16"
                  stroke={isSelected ? "#FFFFFF" : capColor}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all hover:scale-115"
                  filter={zone.capacityCurrent >= 75 ? "url(#glow-red)" : isSelected ? "url(#glow-emerald)" : "url(#glow-cyan)"}
                />

                {/* Fill ratio density indicator */}
                <circle
                  r={R - 5}
                  fill={typeInfo.color}
                  opacity={0.3 + (zone.capacityCurrent / 150)}
                />

                {/* Icon center character */}
                <text
                  y="0"
                  fill="#fff"
                  fontSize="8"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="black"
                  className="select-none pointer-events-none"
                >
                  {typeInfo.label}
                </text>

                {/* Percentage Tag below node */}
                <g transform={`translate(0, ${R + 11})`}>
                  <rect
                    x="-16"
                    y="-6"
                    width="32"
                    height="12"
                    rx="4"
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke={capColor}
                    strokeWidth="1"
                    pointerEvents="none"
                  />
                  <text
                    y="1"
                    fill="#fff"
                    fontSize="7"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {Math.round(zone.capacityCurrent)}%
                  </text>
                </g>

                {/* Label text */}
                <text
                  y={-(R + 8)}
                  fill={isSelected ? '#fff' : 'rgba(148,163,184,0.9)'}
                  fontSize="9.5"
                  textAnchor="middle"
                  fontWeight={isSelected ? '900' : '600'}
                  className="select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                >
                  {zone.name}
                </text>
              </g>
            );
          })}
        </svg>
        </ErrorBoundary>
      </div>

      {/* Bottom Sheet Details sheet */}
      <AnimatePresence>
        {(selectedZone || routingMode) && !isNavigating && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-20 p-4"
          >
            <Card className="p-5 border-border shadow-2xl bg-card/95 backdrop-blur-xl rounded-t-3xl rounded-b-none lg:rounded-3xl border-b-0 lg:border-b lg:mb-4 lg:mx-auto lg:max-w-md relative overflow-hidden text-start">
              <button 
                onClick={() => { setSelectedZoneId(null); setRoutingMode(null); }}
                className={cn("absolute top-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors", isRtl ? "left-4" : "right-4")}
              >
                <X className="w-5 h-5" />
              </button>

              {routingMode ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-info animate-pulse" /> {t('map.routeDetails')}
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <div className="w-0.5 h-6 bg-border" />
                      <div className="w-3 h-3 rounded-full bg-info" />
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="bg-background px-4 py-2.5 rounded-xl border border-border">
                        <span className="text-xs text-muted-foreground block mb-0.5">{language === 'ar' ? 'من' : 'From'}</span>
                        <span className="font-semibold">{fromZone?.name || 'Unknown'}</span>
                      </div>
                      <div className="bg-background px-4 py-2.5 rounded-xl border border-info/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                        <span className="text-xs text-info block mb-0.5 flex items-center gap-1">
                          {language === 'ar' ? 'إلى' : 'To'} {routingMode.to === null && `(${t('map.selectZone').split(' ')[0]}...)`}
                        </span>
                        <span className="font-semibold text-white">{toZone?.name || (language === 'ar' ? 'انتظار التحديد...' : 'Waiting for selection...')}</span>
                      </div>
                    </div>
                  </div>

                  {isLoadingRoute && (
                    <div className="h-16 flex items-center justify-center text-muted-foreground animate-pulse gap-2">
                      <Zap className="w-4 h-4 text-info animate-spin" /> {language === 'ar' ? 'جاري حساب المسار...' : 'Computing path...'}
                    </div>
                  )}

                  {route && (
                    <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-bold text-white">{route.estimatedMinutes} {language === 'ar' ? 'دقيقة' : 'min'}</div>
                        <div className="text-sm text-muted-foreground">{route.totalDistanceMeters}m {language === 'ar' ? 'مسافة' : 'distance'}</div>
                      </div>
                      
                      {/* Start navigation trigger */}
                      <button 
                        onClick={startNavigation}
                        className="bg-info hover:bg-info/90 text-white font-bold py-2.5 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center gap-1.5"
                      >
                        <Compass className="w-4 h-4" /> {language === 'ar' ? 'ابدأ الملاحة' : 'Start Navigation'}
                      </button>
                    </div>
                  )}
                </div>
              ) : selectedZone ? (
                // WARNING ANALYSIS VIEW IF DENSITY IS >75%
                selectedZone.capacityCurrent > 75 ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider border border-red-500/20">
                          Critical Bottleneck
                        </span>
                      </div>
                      <h3 className="font-black text-2xl text-white">{selectedZone.name}</h3>
                    </div>

                    {/* Flashing Warning Box */}
                    <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <h4 className="font-bold text-red-200 text-sm">Real-time Warning Analysis</h4>
                          <p className="text-xs text-red-300 mt-1 leading-relaxed">
                            Zone occupancy is currently at <strong className="text-white">{Math.round(selectedZone.capacityCurrent)}%</strong>. Crowd velocity has degraded below 0.3 m/s, causing congestion feedback loops at nearby exits.
                          </p>
                        </div>
                      </div>
                      <div className="h-[1px] bg-red-500/20 w-full" />
                      <div className="text-xs text-gray-300 space-y-1.5">
                        <p className="font-bold text-red-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <HeartPulse className="w-3 h-3 text-emerald-400" /> Suggested Safe Evacuation Route:
                        </p>
                        <p className="leading-relaxed">
                          Bypass this crowd center by rerouting westwards via the <strong>Medical Center (9% density)</strong> to exit quickly at the uncongested <strong>West Gate</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background rounded-xl p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Density Level</div>
                        <span className="text-2xl font-black text-red-500">{Math.round(selectedZone.capacityCurrent)}%</span>
                        <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${selectedZone.capacityCurrent}%` }} />
                        </div>
                      </div>
                      <div className="bg-background rounded-xl p-3 border border-border flex flex-col justify-center">
                        <div className="text-xs text-muted-foreground mb-1">Action Priority</div>
                        <span className="text-sm font-black text-red-400 uppercase tracking-wider">HIGH REROUTE</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button 
                        onClick={() => {
                          setRoutingMode({ from: selectedZone.id, to: 'gate-west' });
                          setSelectedZoneId(null);
                          toast({
                            title: "Rerouting Pattern Configured",
                            description: "Bypassed high congestion zones. Safe route via Medical Center (9% density) loaded.",
                            className: "bg-emerald-600 text-white border-emerald-500"
                          });
                        }}
                        className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg shadow-red-950/40"
                      >
                        Accept Alternate Route
                      </Button>
                      <Button 
                        onClick={() => setRoutingMode({ from: selectedZone.id, to: null })}
                        className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all"
                      >
                        Choose Different Route
                      </Button>
                    </div>
                  </div>
                ) : (
                  // STANDARD ZONE DETAILS VIEW IF DENSITY IS <=75%
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {getZoneTypeTranslation(selectedZone.type)}
                        </span>
                      </div>
                      <h3 className="font-bold text-2xl text-white">{selectedZone.name}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background rounded-xl p-3 border border-border">
                        <div className="text-sm text-muted-foreground mb-1">{t('map.legend').split(' ')[0]}</div>
                        <div className="flex items-baseline gap-2">
                          <span className={cn("text-2xl font-bold", getCapacityColorClass(selectedZone.capacityCurrent))}>
                            {Math.round(selectedZone.capacityCurrent)}%
                          </span>
                        </div>
                        {/* Density bar */}
                        <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", getCapacityBgColorClass(selectedZone.capacityCurrent))} 
                            style={{ 
                              width: `${selectedZone.capacityCurrent}%`
                            }} 
                          />
                        </div>
                      </div>
                      
                      <div className="bg-background rounded-xl p-3 border border-border flex flex-col justify-center">
                        <div className="text-sm text-muted-foreground mb-1">{language === 'ar' ? 'الاتجاه' : 'Trend'}</div>
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          {selectedZone.trendingDirection === 'rising' ? (
                            <><ArrowRight className="w-4 h-4 text-destructive -rotate-45" /> {getTrendLabel('rising')}</>
                          ) : selectedZone.trendingDirection === 'falling' ? (
                            <><ArrowRight className="w-4 h-4 text-primary rotate-45" /> {getTrendLabel('falling')}</>
                          ) : (
                            <><ArrowRight className="w-4 h-4 text-muted-foreground" /> {getTrendLabel('stable')}</>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setRoutingMode({ from: selectedZone.id, to: null })}
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white"
                    >
                      <Navigation className="w-5 h-5 animate-pulse" /> {t('map.startRoute')}
                    </button>
                  </div>
                )
              ) : null}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
