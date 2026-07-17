import React, { useState, useEffect } from 'react';
import { useGetZones, useOverrideZoneCapacity, useGetAlerts } from '@workspace/api-client-react';
import { Activity, ShieldAlert, Sliders, LineChart as LineChartIcon, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { Zone, CrowdAlert } from '@workspace/api-client-react';

const MOCK_ALERTS: CrowdAlert[] = [
  { id: '1', zoneId: 'conc-se', zoneName: 'SE Concourse', message: 'Density approaching critical capacity', severity: 'critical', predictedPct: 92, predictedInMinutes: 5, createdAt: new Date().toISOString() },
  { id: '2', zoneId: 'gate-s', zoneName: 'South Gate', message: 'Queue time exceeding 15 minutes', severity: 'warning', predictedPct: 85, predictedInMinutes: 10, createdAt: new Date(Date.now() - 300000).toISOString() },
];

function ZoneControl({ zone }: { zone: Zone }) {
  const [localVal, setLocalVal] = useState(zone.capacityCurrent);
  const overrideMutation = useOverrideZoneCapacity();
  
  useEffect(() => {
    setLocalVal(zone.capacityCurrent);
  }, [zone.capacityCurrent]);

  const handleCommit = (val: number[]) => {
    overrideMutation.mutate({
      zoneId: zone.id,
      data: { capacityCurrent: val[0] }
    });
  };

  const getCapacityColor = (pct: number) => {
    if (pct >= 80) return 'text-destructive bg-destructive/20 border-destructive/30';
    if (pct >= 60) return 'text-warning bg-warning/20 border-warning/30';
    return 'text-primary bg-primary/20 border-primary/30';
  };

  return (
    <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-border">
      <div className="w-32 truncate shrink-0">
        <div className="font-semibold text-sm">{zone.name}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{zone.type}</div>
      </div>
      
      <div className="flex-1 flex items-center gap-4">
        <Slider 
          value={[localVal]} 
          max={100} 
          step={1}
          onValueChange={(val) => setLocalVal(val[0])}
          onValueCommit={handleCommit}
          className="flex-1"
        />
        <div className={cn("w-14 text-center py-1 rounded-md text-xs font-bold border", getCapacityColor(localVal))}>
          {Math.round(localVal)}%
        </div>
      </div>
    </div>
  );
}

export default function OpsPage() {
  const { data: zones } = useGetZones();
  const { data: alerts } = useGetAlerts();

  const activeAlerts = alerts || MOCK_ALERTS;

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="p-6 md:p-8 border-b border-border bg-card">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded bg-destructive/20 flex items-center justify-center border border-destructive/50 text-destructive">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white leading-none">Ops Console</h1>
            <span className="text-xs text-destructive font-bold uppercase tracking-widest">Restricted Access</span>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Active Alerts */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" /> Active System Alerts
          </h2>
          <div className="grid gap-3">
            {activeAlerts.map(alert => (
              <div 
                key={alert.id}
                className={cn(
                  "p-4 rounded-xl border flex gap-4 items-start",
                  alert.severity === 'critical' ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"
                )}
              >
                <div className={cn(
                  "mt-0.5 p-1.5 rounded-lg shrink-0",
                  alert.severity === 'critical' ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                )}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground">{alert.zoneName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border">
                      Pred: {alert.predictedPct}% in {alert.predictedInMinutes}m
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            ))}
            {activeAlerts.length === 0 && (
              <div className="p-6 text-center text-muted-foreground border border-border rounded-xl border-dashed">
                No active alerts. Systems nominal.
              </div>
            )}
          </div>
        </section>

        {/* Capacity Overrides */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" /> Zone Capacity Controls
          </h2>
          <Card className="border-border bg-card overflow-hidden">
            <div className="p-4 bg-muted/10 border-b border-border flex justify-between items-center text-sm text-muted-foreground">
              <span>Manual overrides for simulation/testing</span>
              <Settings className="w-4 h-4" />
            </div>
            <div className="p-2 divide-y divide-border">
              {zones?.map(zone => (
                <ZoneControl key={zone.id} zone={zone} />
              ))}
              {!zones && (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4 animate-spin" /> Loading telemetry...
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
