import { useEffect } from 'react';
import { useStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { getGetZonesQueryKey } from '@workspace/api-client-react';
import type { Zone } from '@workspace/api-client-react';

// Mocks the real-time websocket feel by slightly altering capacities
export function useMockSimulation() {
  const incrementMockTime = useStore(state => state.incrementMockTime);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const timer = setInterval(() => {
      incrementMockTime();
      
      // Randomly jitter zone capacities to feel alive
      const queryKey = getGetZonesQueryKey();
      const zones = queryClient.getQueryData<Zone[]>(queryKey);
      
      if (zones) {
        const newZones = zones.map(zone => {
          // Change by -3% to +3%
          const jitter = (Math.random() * 6) - 3;
          let newCap = zone.capacityCurrent + jitter;
          newCap = Math.max(0, Math.min(100, newCap));
          
          return {
            ...zone,
            capacityCurrent: newCap,
            trendingDirection: jitter > 1 ? 'rising' : jitter < -1 ? 'falling' : 'stable'
          } as Zone;
        });
        
        queryClient.setQueryData(queryKey, newZones);
      }
      
    }, 8000);
    
    return () => clearInterval(timer);
  }, [incrementMockTime, queryClient]);
}
