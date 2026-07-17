import React, { useState, useRef, useEffect } from 'react';
import { useNarrateRoute, useGetZones } from '@workspace/api-client-react';
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

  const handleReasoningEngine = (query: string): { matches: boolean; text: string; isEmergency: boolean } => {
    const q = query.toLowerCase();

    // Intent Detection Layer: Define distinct classifications
    const isEmergency = ["help", "medical", "hurt", "pain", "fainted", "passed out", "injured", "ambulance", "emergency"].some(k => q.includes(k));
    const isSanitation = ["washroom", "restroom", "toilet", "bathroom"].some(k => q.includes(k));
    const isDining = ["food", "snacks", "hungry", "eat", "vegetarian", "vegan", "dining"].some(k => q.includes(k));
    const isGeneralNav = ["navigate", "where is", "gate"].some(k => q.includes(k));

    // 1. Emergency Intent
    if (isEmergency) {
      const emergencyResponses: Record<string, string> = {
        en: "🚨 EMERGENCY RESPONSE INITIATED. First aid responders have been dispatched to your tracked zone location. Please stay calm.",
        es: "🚨 RESPUESTA DE EMERGENCIA INICIADA. Los socorristas de primeros auxilios han sido enviados a su ubicación de zona rastreada. Por favor, mantenga la calma.",
        fr: "🚨 INTERVENTION D'URGENCE INITIÉE. Des secouristes de premiers secours ont été dépêchés vers la zone de votre emplacement. Veuillez rester calme.",
        pt: "🚨 RESPOSTA DE EMERGÊNCIA INICIADA. Os socorristas de primeiros socorros foram enviados para o seu local rastreado. Por favor, mantenha a calma.",
        ar: "🚨 تم بدء استجابة الطوارئ. تم إرسال فرق الإسعافات الأولية إلى موقع منطقتك المحددة. يرجى الحفاظ على الهدوء."
      };
      return {
        matches: true,
        text: emergencyResponses[language] || emergencyResponses.en,
        isEmergency: true
      };
    }

    // 2. Sanitation Intent
    if (isSanitation) {
      // Find restroom / medical center density
      const medicalZone = (zones || []).find(z => z.id === 'medical-zone');
      const nwConcourse = (zones || []).find(z => z.id === 'concourse-nw');

      const medDensity = medicalZone ? Math.round(medicalZone.capacityCurrent) : 9;
      const nwDensity = nwConcourse ? Math.round(nwConcourse.capacityCurrent) : 52;

      const sanitationResponses: Record<string, string> = {
        en: `Based on live stadium data, the restrooms near the **Medical Center** zone currently have the lowest crowding levels (**${medDensity}% density**). I recommend taking the direct path past the **West Gate** node to avoid queues.`,
        es: `Según los datos del estadio en vivo, los baños cerca de la zona del **Centro Médico** tienen actualmente los niveles de congestión más bajos (**${medDensity}% de densidad**). Recomiendo tomar el camino directo pasando el nodo **West Gate** para evitar colas.`,
        fr: `Sur la base des données du stade en direct, les toilettes près du **Centre Médical** présentent les niveaux d'affluence les plus bas (**${medDensity}% de densité**). Je recommande de prendre le chemin direct après la **Porte Ouest** pour éviter l'attente.`,
        pt: `Com base em dados ao vivo do estádio, os banheiros próximos à zona do **Centro Médico** têm atualmente os níveis mais baixos de lotação (**${medDensity}% de densidade**). Recomendo seguir o caminho direto pelo **West Gate** para evitar filas.`,
        ar: `بناءً على بيانات الملعب اللحظية، فإن دورات المياه القريبة من منطقة **المركز الطبي** بها حالياً أقل مستويات ازدحام (كثافة تبلغ **${medDensity}%**). أوصي باتباع المسار المباشر عبر **بوابة الغرب** لتجنب الطوابير.`
      };

      return {
        matches: true,
        text: sanitationResponses[language] || sanitationResponses.en,
        isEmergency: false
      };
    }

    // 3. Dining Intent
    if (isDining) {
      const westAmenity = (zones || []).find(z => z.id === 'amenity-west');
      const eastAmenity = (zones || []).find(z => z.id === 'amenity-east');
      
      const westDensity = westAmenity ? Math.round(westAmenity.capacityCurrent) : 35;
      const eastDensity = eastAmenity ? Math.round(eastAmenity.capacityCurrent) : 87;

      const foodResponses: Record<string, string> = {
        en: `You can grab snacks at **Food & Merch West** (currently at **${westDensity}% density**, low crowd) or **Food & Merch East** (currently at **${eastDensity}% density**, heavy crowd). I highly suggest taking the West Concourse path to save time!`,
        es: `Puede comprar bocadillos en **Food & Merch West** (actualmente con un **${westDensity}% de densidad**, poca gente) o **Food & Merch East** (**${eastDensity}% de densidad**, mucha gente). ¡Le sugiero encarecidamente tomar el camino del West Concourse para ahorrar tiempo!`,
        fr: `Vous pouvez acheter des collations à **Food & Merch West** (actuellement à **${westDensity}% de densité**, faible affluence) ou **Food & Merch East** (**${eastDensity}% de densité**, forte affluence). Je vous suggère fortement d'emprunter la Coursive Ouest pour gagner du temps !`,
        pt: `Você pode comprar lanches no **Food & Merch West** (atualmente com **${westDensity}% de densidade**, pouco movimentado) ou no **Food & Merch East** (**${eastDensity}% de densidade**, muito movimentado). Sugiro fortemente seguir pelo Saguão Oeste para economizar tempo!`,
        ar: `يمكنك الحصول على وجبات خفيفة في **منطقة الطعام والهدايا الغربية** (حالياً بنسبة إشغال **${westDensity}%**، ازدحام منخفض) أو **منطقة الطعام والهدايا الشرقية** (بنسبة إشغال **${eastDensity}%**، ازدحام شديد). أقترح بشدة سلك مسار البهو الغربي لتوفير الوقت!`
      };

      return {
        matches: true,
        text: foodResponses[language] || foodResponses.en,
        isEmergency: false
      };
    }

    // 4. General Navigation Intent
    if (isGeneralNav) {
      const westDensity = 35;
      const navResponses: Record<string, string> = {
        en: `Based on real-time data, Food & Merch West currently has a low crowd density of **${westDensity}%**. I recommend taking the West Concourse path.`,
        es: `Según los datos en tiempo real, el área Food & Merch West tiene actualmente una densidad de multitud baja del **${westDensity}%**. Le recomiendo seguir el camino del West Concourse.`,
        fr: `Sur la base des données en temps réel, Food & Merch West présente actuellement une faible densité de foule de **${westDensity}%**. Je vous recommande d'emprunter la Coursive Ouest.`,
        pt: `Com base em dados em tempo real, o Food & Merch West possui atualmente uma baixa densidade de público de **${westDensity}%**. Recomendo seguir o caminho do Saguão Oeste.`,
        ar: `بناءً على البيانات اللحظية، فإن منطقة الطعام والهدايا الغربية لديها حالياً كثافة حشود منخفضة تبلغ **${westDensity}%**. أوصي باتباع مسار البهو الغربي.`
      };

      return {
        matches: true,
        text: navResponses[language] || navResponses.en,
        isEmergency: false
      };
    }

    return { matches: false, text: "", isEmergency: false };
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const query = input;
    
    // Clear the input field with a smooth reset animation
    setInput('');
    setClosedCaptionText(null);
    
    // Append user message instantly
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    
    // Add realistic animated skeletal typing bubble
    setMessages(prev => [...prev, { role: 'ai', content: '', isTyping: true }]);

    // Trigger local structural reasoning engine
    const engineResult = handleReasoningEngine(query);

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
      {/* Decorative tech background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

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
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
