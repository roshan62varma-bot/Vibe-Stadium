import React, { useMemo } from 'react';
import { useGetTransit, useGetExitPlan } from '@workspace/api-client-react';
import { Bus, Car, Train, Footprints, Clock, AlertCircle, Loader2, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { TransitInfo, ExitSlot } from '@workspace/api-client-react';

const MOCK_TRANSIT: TransitInfo = {
  lastUpdatedAt: new Date().toISOString(),
  options: [
    { id: '1', type: 'rideshare', label: 'Rideshare Pickup (South)', waitMinutes: 15, surgeMultiplier: 1.5, nearestZoneId: 'transit-1', stepFree: true },
    { id: '2', type: 'bus', label: 'Shuttle to Downtown', waitMinutes: 5, surgeMultiplier: null, nearestZoneId: 'gate-n', stepFree: true },
    { id: '3', type: 'rail', label: 'Metro Line (Central Station)', waitMinutes: 12, surgeMultiplier: null, nearestZoneId: 'gate-e', stepFree: false },
    { id: '4', type: 'walk', label: 'City Center (Walking)', waitMinutes: 25, surgeMultiplier: null, nearestZoneId: 'gate-w', stepFree: true },
  ]
};

const MOCK_EXIT: ExitSlot[] = [
  { block: 'Block A (Rows 1–20)', recommendedExitAt: new Date(Date.now() + 5 * 60000).toISOString(), gateId: 'gate-n', gateName: 'North Gate', estimatedCrowdPct: 45 },
  { block: 'Block B (Rows 21–40)', recommendedExitAt: new Date(Date.now() + 12 * 60000).toISOString(), gateId: 'gate-w', gateName: 'West Gate', estimatedCrowdPct: 60 },
  { block: 'Block C (Rows 41–60)', recommendedExitAt: new Date(Date.now() + 20 * 60000).toISOString(), gateId: 'gate-s', gateName: 'South Gate', estimatedCrowdPct: 30 },
];

export default function TransitPage() {
  const { data: apiTransit, isLoading: isLoadingTransit, refetch } = useGetTransit();
  const { data: apiExit, isLoading: isLoadingExit } = useGetExitPlan();

  const transit = apiTransit || MOCK_TRANSIT;
  const exitPlan = apiExit || MOCK_EXIT;

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'rideshare': return <Car className="w-6 h-6" />;
      case 'bus': return <Bus className="w-6 h-6" />;
      case 'rail': return <Train className="w-6 h-6" />;
      case 'walk': return <Footprints className="w-6 h-6" />;
      default: return <Clock className="w-6 h-6" />;
    }
  };

  const getWaitColor = (mins: number) => {
    if (mins >= 20) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (mins >= 10) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  // Find the current active/upcoming exit index to build the live stepper timeline
  const upcomingIdx = useMemo(() => {
    return exitPlan.findIndex(slot => {
      const d = new Date(slot.recommendedExitAt);
      return isNaN(d.getTime()) ? false : d.getTime() > Date.now();
    });
  }, [exitPlan]);

  const formatExitTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        // Fallback for short mock string time like "21:45"
        return {
          countdown: `Depart at ${isoString}`,
          timeLabel: isoString,
          isPast: false,
          isCurrent: false
        };
      }
      
      const diffMs = date.getTime() - Date.now();
      const diffMins = Math.ceil(diffMs / 60000);
      const timeLabel = format(date, 'hh:mm a');
      
      if (diffMins > 0) {
        return {
          countdown: `Leaves in ${diffMins} min${diffMins > 1 ? 's' : ''}`,
          timeLabel: `Depart at ${timeLabel}`,
          isPast: false,
          isCurrent: true
        };
      } else if (diffMins > -15) {
        return {
          countdown: 'Depart now',
          timeLabel: `Depart at ${timeLabel}`,
          isPast: true,
          isCurrent: false
        };
      } else {
        return {
          countdown: 'Completed',
          timeLabel: `Departed at ${timeLabel}`,
          isPast: true,
          isCurrent: false
        };
      }
    } catch (e) {
      return { countdown: isoString, timeLabel: isoString, isPast: false, isCurrent: false };
    }
  };

  return (
    <div className="flex-1 bg-[#090D16] text-white overflow-y-auto pb-36">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-[#0D1424]/40 relative overflow-hidden text-start">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="flex justify-between items-end relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">Transit Hub</h1>
            <p className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Live transit options & staggered departure schedules
            </p>
          </div>
          <button 
            onClick={() => refetch()}
            className="text-[10px] font-bold px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors uppercase tracking-widest text-muted-foreground hover:text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
        {/* Transit Options */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transit.options.map((opt: any) => (
              <Card key={opt.id} className="p-5 border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group text-start">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 group-hover:border-emerald-500/40 transition-colors">
                      {getTypeIcon(opt.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{opt.label}</h3>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium">
                        Near {opt.nearestZoneId.split('-')[1]?.toUpperCase() || opt.nearestZoneId}
                        {opt.stepFree && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold" title="Step-free accessible">
                            ♿ Step-Free
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className={cn("px-3 py-1.5 rounded-lg border font-bold flex items-center gap-2 text-xs", getWaitColor(opt.waitMinutes))}>
                    <Clock className="w-4 h-4" />
                    {opt.waitMinutes} min wait
                  </div>

                  {opt.surgeMultiplier && opt.surgeMultiplier > 1 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-red-400 px-2.5 py-1.5 rounded-lg bg-red-500/10 uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {opt.surgeMultiplier}x Surge
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Recommended Exit Plan */}
        <section className="text-start">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-emerald-400">
            <Footprints className="w-5 h-5" /> Recommended Exit Plan
          </h2>
          <Card className="border-white/5 bg-white/[0.02] overflow-hidden rounded-2xl shadow-xl">
            <div className="p-4 bg-white/[0.01] border-b border-white/5 text-xs font-semibold text-muted-foreground">
              To minimize bottleneck congestion, please follow the staggered departure times for your seating block.
            </div>
            
            <div className="p-4 md:p-6 space-y-2">
              {exitPlan.map((slot, idx) => {
                const formatted = formatExitTime(slot.recommendedExitAt);
                
                // Determine timeline state
                // 1. If all in the past
                const isPast = upcomingIdx === -1 || idx < upcomingIdx;
                const isCurrent = idx === upcomingIdx;
                const isFuture = upcomingIdx !== -1 && idx > upcomingIdx;

                return (
                  <div key={idx} className="flex gap-4 items-stretch group">
                    {/* Stepper Timeline Graphics */}
                    <div className="flex flex-col items-center shrink-0 w-8">
                      {/* Timeline Dot */}
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border font-mono font-bold text-xs relative z-10 shrink-0 transition-all",
                        isPast ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                        isCurrent ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse" :
                        "bg-white/5 border-white/10 text-muted-foreground"
                      )}>
                        {isPast ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      
                      {/* Timeline Connective Line */}
                      {idx < exitPlan.length - 1 && (
                        <div className={cn(
                          "w-[2px] flex-grow my-1 min-h-[40px] transition-all",
                          isPast ? "bg-emerald-500/30" : "bg-white/5"
                        )} />
                      )}
                    </div>

                    {/* Timeline Row Content Card */}
                    <div className="flex-grow pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 group-last:border-b-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg text-white">{slot.block}</span>
                          
                          {/* Live Countdown Timer Badge */}
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                            isPast ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            isCurrent ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.2)]" :
                            "bg-white/5 text-muted-foreground border-white/10"
                          )}>
                            {formatted.countdown}
                          </span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                          {formatted.timeLabel} • Gate: <span className="text-gray-200 font-bold">{slot.gateName}</span>
                        </div>
                      </div>
                      
                      {/* Crowd capacity bar */}
                      <div className="flex items-center gap-3 w-full sm:w-auto self-start sm:self-center">
                        <div className="text-[10px] font-black text-muted-foreground w-20 sm:text-right uppercase tracking-wider">
                          Est. Crowd
                        </div>
                        <div className="flex-1 sm:w-32 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 shrink-0">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${slot.estimatedCrowdPct}%`,
                              backgroundColor: slot.estimatedCrowdPct > 70 ? 'var(--destructive)' : slot.estimatedCrowdPct > 40 ? 'var(--warning)' : 'var(--primary)'
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-muted-foreground min-w-[30px] text-right">
                          {slot.estimatedCrowdPct}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
