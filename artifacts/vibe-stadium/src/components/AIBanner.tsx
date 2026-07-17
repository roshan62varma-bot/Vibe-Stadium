import React, { useState, useEffect } from 'react';
import { useNarrateRoute } from '@workspace/api-client-react';
import { AlertCircle, CheckCircle2, Info, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AIBannerProps {
  query?: string;
  routeContext?: string;
  zoneId?: string;
  type: 'route' | 'zone' | 'emergency';
}

export function AIBanner({ query, routeContext, zoneId, type }: AIBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const narrate = useNarrateRoute();
  
  useEffect(() => {
    if (query || routeContext || type === 'emergency') {
      setIsVisible(true);
      narrate.mutate({
        data: {
          type,
          query: query || '',
          routeContext,
          zoneId,
          tone: type === 'emergency' ? 'urgent' : 'reassuring'
        }
      });
    }
  }, [query, routeContext, zoneId, type]);

  if (!isVisible || !narrate.data) return null;

  const result = narrate.data;
  
  const getColors = (urgency: string) => {
    switch(urgency) {
      case 'emergency': return 'border-destructive/50 bg-destructive/10 text-destructive-foreground';
      case 'elevated': return 'border-warning/50 bg-warning/10 text-warning-foreground';
      default: return 'border-primary/50 bg-primary/10 text-primary-foreground';
    }
  };

  const getIcon = (urgency: string) => {
    switch(urgency) {
      case 'emergency': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'elevated': return <Info className="h-5 w-5 text-warning" />;
      default: return <CheckCircle2 className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-4 left-4 right-4 z-50 pointer-events-none"
      >
        <div className={cn(
          "max-w-xl mx-auto rounded-xl border p-4 shadow-lg backdrop-blur-md pointer-events-auto flex items-start gap-4",
          getColors(result.urgencyLevel)
        )}>
          <div className="flex-shrink-0 mt-0.5 relative">
            {getIcon(result.urgencyLevel)}
            <span className="absolute inset-0 rounded-full animate-ping opacity-50 bg-current"></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3 w-3 opacity-70" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                AI Assistant
              </span>
            </div>
            <p className="text-sm md:text-base font-medium leading-snug">
              {result.text}
            </p>
            {result.actionLabel && (
              <button className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                {result.actionLabel}
              </button>
            )}
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4 opacity-70" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
