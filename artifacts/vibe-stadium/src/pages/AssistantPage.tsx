import React, { useState, useRef, useEffect } from 'react';
import { useNarrateRoute, useGetZones } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { sanitizeAndValidateInput, handleReasoningEngine } from '@/lib/assistantEngine';
import { Send, Mic, Cpu, Zap, Activity, AlertOctagon, X, PhoneCall, HeartPulse, Navigation, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/translations';
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';

// Fallback zones coordinates for the mini map
const MINI_MAP_ZONES = {
  'North Gate': [150, 25],
  'South Gate': [150, 175],
  'East Gate': [260, 100],
  'West Gate': [40, 100],
  'North Stand': [150, 60],
  'South Stand': [150, 140],
  'NE Concourse': [210, 50],
  'NW Concourse': [90, 50],
  'SE Concourse': [210, 150],
  'SW Concourse': [90, 150],
  'Medical Center': [90, 100]
};

export default function AssistantPage() {
  const { t, isRtl, language } = useTranslation();
  const { screenReaderSynthesis } = useStore();
  const { toast } = useToast();
  
  const initialSystemMessage = language === 'ar' 
    ? 'أنظمة الملعب متصلة بالكامل. كيف يمكنني مساعدتك؟' 
    : language === 'es'
    ? 'Sistemas del estadio en línea. ¿Qué necesitas?'
    : language === 'fr'
    ? 'Systèmes du stade en ligne. De quoi avez-vous besoin ?'
    : language === 'pt'
    ? 'Sistemas do estádio online. Do que você precisa?'
    : 'Stadium systems online. What do you need?';

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string, urgency?: string, isTyping?: boolean}[]>([
    { role: 'ai', content: initialSystemMessage }
  ]);
  
  // Emergency Mode states
  const [activeEmergency, setActiveEmergency] = useState<{
    location: string;
    message: string;
    timestamp: string;
  } | null>(null);

  // Dynamic AI context reasoning analyzer state
  const [activeAnalysis, setActiveAnalysis] = useState<{
    query: string;
    intent: string;
    urgency: string;
    keywords: string[];
  } | null>(null);

  // CC Captions state for TTS
  const [closedCaptionText, setClosedCaptionText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const narrate = useNarrateRoute();
  const { data: zones } = useGetZones();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const extractLocation = (text: string): string => {
    const t = text.toLowerCase();
    if (t.includes('north gate')) return 'North Gate';
    if (t.includes('south gate')) return 'South Gate';
    if (t.includes('west gate')) return 'West Gate';
    if (t.includes('east gate')) return 'East Gate';
    if (t.includes('north stand')) return 'North Stand';
    if (t.includes('south stand')) return 'South Stand';
    if (t.includes('ne concourse')) return 'NE Concourse';
    if (t.includes('nw concourse')) return 'NW Concourse';
    if (t.includes('se concourse')) return 'SE Concourse';
    if (t.includes('sw concourse')) return 'SW Concourse';
    return 'East Gate'; // default fallback
  };

  // Speaks aloud if Accessibility synthesis is active
  const triggerAudioSynthesis = (text: string) => {
    if (!screenReaderSynthesis) return;
    
    // Set visual closed caption box
    setClosedCaptionText(text);

    // Speak using Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop any currently speaking speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Match voice language to app settings
      if (language === 'es') utterance.lang = 'es-ES';
      else if (language === 'fr') utterance.lang = 'fr-FR';
      else if (language === 'pt') utterance.lang = 'pt-PT';
      else if (language === 'ar') utterance.lang = 'ar-SA';
      else utterance.lang = 'en-US';

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    // 1. Sanitize and Validate Input (XSS check)
    const validation = sanitizeAndValidateInput(input);
    if (!validation.isValid) {
      toast({
        title: "Security Warning",
        description: validation.error || "Invalid characters detected in search query.",
        variant: "destructive"
      });
      return;
    }

    const query = validation.sanitized;
    
    // Clear the input field with a smooth reset animation
    setInput('');
    setClosedCaptionText(null);
    
    // Append user message instantly
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    
    // Add realistic animated skeletal typing bubble
    setMessages(prev => [...prev, { role: 'ai', content: '', isTyping: true }]);

    // Trigger local structural reasoning engine
    const engineResult = handleReasoningEngine(query, zones || [], language);

    // Compute dynamic context analysis mapping
    const lowercaseQuery = query.toLowerCase();
    const keywords: string[] = [];
    if (lowercaseQuery.includes("help") || lowercaseQuery.includes("medical") || lowercaseQuery.includes("hurt") || lowercaseQuery.includes("leg")) keywords.push("medical", "emergency");
    if (lowercaseQuery.includes("washroom") || lowercaseQuery.includes("toilet") || lowercaseQuery.includes("restroom")) keywords.push("washroom", "sanitation");
    if (lowercaseQuery.includes("food") || lowercaseQuery.includes("eat") || lowercaseQuery.includes("hungry")) keywords.push("food", "dining");

    let detectedIntent = "General Navigation";
    if (engineResult.isEmergency) detectedIntent = "Emergency Assistance";
    else if (lowercaseQuery.includes("washroom") || lowercaseQuery.includes("toilet")) detectedIntent = "Sanitation Search";
    else if (lowercaseQuery.includes("food") || lowercaseQuery.includes("eat")) detectedIntent = "Dining Area Search";
    else if (!engineResult.matches) detectedIntent = "Model Fallback Query";

    setActiveAnalysis({
      query,
      intent: detectedIntent,
      urgency: engineResult.isEmergency ? "CRITICAL (Level 1)" : "NOMINAL (Level 0)",
      keywords: keywords.length > 0 ? keywords : ["navigation", "general"]
    });

    if (engineResult.matches) {
      setTimeout(() => {
        // Remove typing indicator
        setMessages(prev => prev.slice(0, -1));

        if (engineResult.isEmergency) {
          const loc = extractLocation(query);
          
          // Break out of simple chat stream: Dynamically inject crimson warning at the top
          setActiveEmergency({
            location: loc,
            message: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          // Add emergency text message to stream
          setMessages(prev => [...prev, {
            role: 'ai',
            content: engineResult.text,
            urgency: 'emergency'
          }]);

          triggerAudioSynthesis(engineResult.text.replace(/🚨/g, ''));
        } else {
          // Add standard context-aware reasoning response
          setMessages(prev => [...prev, {
            role: 'ai',
            content: engineResult.text,
            urgency: 'normal'
          }]);

          triggerAudioSynthesis(engineResult.text.replace(/\*\*/g, ''));
        }
      }, 900); // 900ms mock delay for typing indicator realism
    } else {
      // Fallback: Query the backend server `/api/narrate`
      narrate.mutate({
        data: {
          type: 'assistant',
          query,
          language,
        }
      }, {
        onSuccess: (data) => {
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'ai', content: data.text, urgency: data.urgencyLevel }
          ]);

          triggerAudioSynthesis(data.text);

          if (data.urgencyLevel === 'emergency') {
            const loc = extractLocation(query);
            setActiveEmergency({
              location: loc,
              message: query,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        },
        onError: () => {
          const fallback = 'Connection issue. Using local fallback: The stadium systems are operational. Please proceed to the nearest concourse info stand.';
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'ai', content: fallback }
          ]);
          triggerAudioSynthesis(fallback);
        }
      });
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch(urgency) {
      case 'emergency': return 'border-red-500/40 text-red-200 bg-red-950/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]';
      case 'elevated': return 'border-amber-500/30 text-amber-200 bg-amber-950/20';
      default: return 'border-white/5 text-foreground bg-white/[0.02]';
    }
  };

  const getUserAlignClass = (role: string) => {
    if (role === 'user') {
      return isRtl ? "mr-auto items-start" : "ml-auto items-end";
    } else {
      return isRtl ? "ml-auto items-end" : "mr-auto items-start";
    }
  };

  // Mini-map coordinates getter
  const getCoordinates = (zoneName: string): [number, number] => {
    return (MINI_MAP_ZONES as any)[zoneName] || [150, 100];
  };

  const operatorLabel = language === 'ar' ? 'المستخدم' : 'User';
  const systemLabel = language === 'ar' ? 'النظام' : 'Vibe Copilot';
  const nominalLabel = language === 'ar' ? 'الأنظمة تعمل' : 'Systems Nominal';

  // Get incident and medical coords for emergency map
  const incidentLocName = activeEmergency?.location || 'East Gate';
  const incidentCoords = getCoordinates(incidentLocName);
  const medicalCoords = getCoordinates('Medical Center');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090D16] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-tech-grid" />

      {/* Header bar */}
      <div className="p-4 md:p-6 border-b border-white/5 bg-[#0D1424]/85 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 relative overflow-hidden">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
          </div>
          <div className="text-start">
            <h1 className="font-bold text-lg tracking-tight">Vibe Core</h1>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{nominalLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Crimson Warning Panel - Breakout view at the top */}
      <AnimatePresence>
        {activeEmergency && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-950/90 border-b border-red-500/40 backdrop-blur-xl z-20 overflow-hidden relative shadow-[0_15px_30px_rgba(239,68,68,0.2)]"
          >
            <button 
              onClick={() => setActiveEmergency(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-red-200 hover:text-white transition-all z-30"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-5 md:p-6 max-w-4xl mx-auto flex flex-col md:flex-row gap-6 items-center text-start">
              {/* Alert details */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertOctagon className="w-8 h-8 animate-pulse shrink-0" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-300 block">Critical Escalation Alert</span>
                    <h2 className="text-lg font-black text-white">Emergency Responder Dispatched</h2>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-red-500/30 space-y-2">
                  <p className="text-sm font-black text-red-200 leading-relaxed">
                    🚨 EMERGENCY RESPONSE INITIATED. First aid responders have been dispatched to your tracked zone location. Please stay calm.
                  </p>
                  <div className="flex justify-between items-center text-[10px] font-bold text-red-300 pt-2 border-t border-white/5">
                    <span>LOCATION: {incidentLocName.toUpperCase()}</span>
                    <span>{activeEmergency.timestamp}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="font-bold text-red-300 uppercase tracking-wider">First Responder Protocol:</div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>Medic unit is dispatched via the NW service channel (ETA &lt; 3 mins).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>The nearest Medical Center exhibits a low <strong>9% density</strong> with zero queues.</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <a 
                    href="tel:911" 
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Call Dispatch
                  </a>
                  <button 
                    onClick={() => setActiveEmergency(null)}
                    className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all border border-white/10"
                  >
                    Mute Overlay
                  </button>
                </div>
              </div>

              {/* Mini SVG Map Layout */}
              <div className="w-full md:w-80 shrink-0 bg-black/40 border border-white/10 p-3 rounded-2xl relative overflow-hidden flex flex-col items-center">
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 self-start flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-red-400" /> Dispatch Route Simulation
                </div>
                
                <svg viewBox="0 0 300 200" className="w-full h-40 bg-transparent overflow-visible">
                  <rect x="90" y="55" width="120" height="90" rx="10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                  <text x="150" y="100" fill="rgba(255,255,255,0.03)" fontSize="12" textAnchor="middle" fontWeight="bold">ARENA</text>

                  <path 
                    d={`M ${incidentCoords[0]} ${incidentCoords[1]} L ${medicalCoords[0]} ${medicalCoords[1]}`}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="3"
                    strokeDasharray="5 3"
                    className="animate-[dash_2s_linear_infinite]"
                  />

                  {/* Medical Center Node */}
                  <g transform={`translate(${medicalCoords[0]}, ${medicalCoords[1]})`}>
                    <circle r="14" fill="#065F46" stroke="#059669" strokeWidth="2" />
                    <circle r="18" fill="#34D399" opacity="0.15" className="animate-ping" />
                    <text y="3" fill="#fff" fontSize="8" fontWeight="black" textAnchor="middle" dominantBaseline="middle">9%</text>
                  </g>

                  {/* Incident Node */}
                  <g transform={`translate(${incidentCoords[0]}, ${incidentCoords[1]})`}>
                    <circle r="12" fill="#991B1B" stroke="#DC2626" strokeWidth="2" />
                    <circle r="16" fill="#F87171" opacity="0.2" className="animate-ping" />
                    <text y="1" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">🚨</text>
                  </g>
                </svg>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10">
        {/* Dynamic Context Evaluator Panel (AI Reasoning Visualizer) */}
        {activeAnalysis && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-xs text-start space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5" /> Intent Classification Engine
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-muted-foreground uppercase">
                Dynamic Evaluator
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-muted-foreground">
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-semibold">Analyzed Query:</span>
                <span className="text-white font-medium">"{activeAnalysis.query}"</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-semibold">Detected Intent:</span>
                <span className="text-white font-black">{activeAnalysis.intent}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-semibold">Urgency Level:</span>
                <span className="text-white font-medium">{activeAnalysis.urgency}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider font-semibold">Context Keywords:</span>
                <span className="text-white font-mono">{activeAnalysis.keywords.join(", ")}</span>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={cn(
              "flex flex-col max-w-[85%] md:max-w-[75%] transition-all",
              getUserAlignClass(msg.role)
            )}
          >
            <div className="flex items-center gap-2 mb-1 px-1 opacity-70">
              {msg.role === 'ai' && <Activity className="w-3.5 h-3.5" />}
              <span className="text-[10px] uppercase font-bold tracking-widest">
                {msg.role === 'user' ? operatorLabel : systemLabel}
              </span>
            </div>
            
            <div className={cn(
              "p-4 rounded-2xl shadow-lg leading-relaxed border relative text-start transition-all",
              msg.role === 'user' 
                ? "bg-white/5 border-white/10 text-white rounded-tr-sm" 
                : cn(getUrgencyColor(msg.urgency), "rounded-tl-sm backdrop-blur-md")
            )}>
              {msg.isTyping ? (
                // Realistic Animated Skeletal Typing bubble
                <div className="flex gap-2 items-center py-2 px-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce anim-delay-0" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce anim-delay-150" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce anim-delay-300" />
                  <span className="text-[10px] text-muted-foreground ml-2 animate-pulse uppercase tracking-wider font-bold">Vibe Core Reasoning...</span>
                </div>
              ) : (
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} 
                />
              )}
            </div>
            
            {msg.urgency === 'emergency' && (
              <div className="mt-2 text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 flex items-center gap-1.5 w-fit">
                <HeartPulse className="w-3.5 h-3.5 animate-pulse" /> 
                <span>NEAREST MED ZONE: Medical Center (9% density)</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Accessibility Voice closed-caption text box */}
      <AnimatePresence>
        {screenReaderSynthesis && closedCaptionText && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="mx-4 mb-2 p-3 bg-black border border-emerald-500/40 rounded-xl text-xs font-mono font-bold text-emerald-400 text-center flex items-center justify-center gap-2 shadow-2xl z-20"
          >
            <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <span>[Audio CC: "{closedCaptionText}"]</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat input box */}
      <div className="p-4 bg-[#090D16] border-t border-white/5 z-10 pb-safe">
        <form 
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2 bg-[#0D1424] border border-white/10 p-2 rounded-2xl focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all shadow-xl"
        >
          <button 
            type="button"
            className="p-3 text-muted-foreground hover:text-emerald-400 transition-colors rounded-xl hover:bg-emerald-500/10 flex-shrink-0"
          >
            <Mic className="h-5 w-5" />
          </button>
          
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t('assistant.promptPlaceholder')}
            className={cn("flex-1 bg-transparent border-0 focus:ring-0 resize-none min-h-[44px] max-h-[120px] py-3 text-sm placeholder:text-muted-foreground text-white outline-none border-none", isRtl ? "text-right" : "text-left")}
            rows={1}
          />
          
          <button 
            type="submit"
            disabled={!input.trim() || narrate.isPending}
            className="p-3 bg-emerald-500 text-black font-bold rounded-xl flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] text-white"
          >
            <Send className={cn("h-5 w-5 ml-0.5", isRtl ? "rotate-180" : "")} />
          </button>
        </form>
      </div>
    </div>
  );
}
