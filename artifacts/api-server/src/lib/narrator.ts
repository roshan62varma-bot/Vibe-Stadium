// Mock AI narrator — template-based narration parameterized by live state.
// Supports multi-language translation (English, Spanish, French, Portuguese, Arabic).

import type { RouteResult } from "./pathfinding.js";
import type { Zone } from "./stadiumData.js";

type Tone = "neutral" | "reassuring" | "urgent";
type UrgencyLevel = "normal" | "elevated" | "emergency";

interface NarrateInput {
  type: "route" | "zone" | "emergency" | "assistant";
  query: string;
  zoneId?: string | null;
  routeContext?: string | null;
  language?: string;
  tone?: Tone;
}

interface NarrateResult {
  text: string;
  urgencyLevel: UrgencyLevel;
  suggestedZoneId: string | null;
  actionLabel: string | null;
}

const EMERGENCY_KEYWORDS = [
  "help", "emergency", "hurt", "injured", "sick", "medical", "ambulance",
  "fire", "danger", "trapped", "lost child", "attack", "heart",
  "aide", "urgence", "blessé", "malade", "médecin", "danger", // French
  "ayuda", "emergencia", "herido", "enfermo", "médico", "peligro", // Spanish
  "ajuda", "emergência", "ferido", "doente", "médico", "perigo", // Portuguese
  "مساعدة", "طوارئ", "جريح", "مريض", "طبي", "خطر" // Arabic
];

const INTROS: Record<string, string[]> = {
  en: ["No worries —", "You're good —", "Here's the plan:", "Got you covered —", "Quick heads-up:"],
  es: ["No hay de qué preocuparse —", "Todo bien —", "Aquí está el plan:", "Te tenemos cubierto —", "Un aviso rápido:"],
  fr: ["Pas de souci —", "Tout est bon —", "Voici le plan :", "Nous avons ce qu'il faut —", "Bref avertissement :"],
  pt: ["Não se preocupe —", "Tudo bem —", "Aqui está o plano:", "Temos o que você precisa —", "Um aviso rápido:"],
  ar: ["لا تقلق —", "أنت بخير —", "إليك الخطة:", "لقد أمّنا طلبك —", "تنبيه سريع:"]
};

const HEADS_UP: Record<string, string> = {
  en: "⚠️ Heads-up —",
  es: "⚠️ Atención —",
  fr: "⚠️ Attention —",
  pt: "⚠️ Atenção —",
  ar: "⚠️ تنبيه —"
};

const ALERTS: Record<string, string> = {
  en: "🚨 Alert:",
  es: "🚨 Alerta:",
  fr: "🚨 Alerte :",
  pt: "🚨 Alerta:",
  ar: "🚨 إنذار:"
};

const ZONE_TYPE_LABELS: Record<string, Record<string, string>> = {
  en: { gate: "gate entrance", concourse: "main concourse", seating: "seating area", amenity: "food & merch area", medical: "medical station", transit: "transit hub" },
  es: { gate: "entrada de puerta", concourse: "concurrencia principal", seating: "área de asientos", amenity: "área de comida y mercancía", medical: "estación médica", transit: "centro de tránsito" },
  fr: { gate: "entrée de porte", concourse: "hall principal", seating: "zone de sièges", amenity: "zone de nourriture et de merchandising", medical: "poste médical", transit: "pôle de transport" },
  pt: { gate: "entrada do portão", concourse: "saguão principal", seating: "área de assento", amenity: "área de comida e produtos", medical: "posto médico", transit: "centro de trânsito" },
  ar: { gate: "مدخل البوابة", concourse: "البهو الرئيسي", seating: "منطقة المقاعد", amenity: "منطقة الطعام والهدايا", medical: "المركز الطبي", transit: "مركز النقل" }
};

const DENSITY_LABELS: Record<string, Record<string, string>> = {
  en: { critical: "critically congested", heavy: "heavily congested", moderate: "moderately busy", clear: "clear" },
  es: { critical: "críticamente congestionado", heavy: "muy congestionado", moderate: "moderadamente ocupado", clear: "despejado" },
  fr: { critical: "fortement congestionné", heavy: "très encombré", moderate: "modérément occupé", clear: "fluide" },
  pt: { critical: "criticamente congestionado", heavy: "muito congestionado", moderate: "moderadamente ocupado", clear: "livre" },
  ar: { critical: "مزدحم للغاية", heavy: "مزدحم جداً", moderate: "نشط نسبياً", clear: "خالٍ" }
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seed * arr.length) % arr.length]!;
}

function detectUrgency(query: string): UrgencyLevel {
  const lower = query.toLowerCase();
  if (EMERGENCY_KEYWORDS.some((k) => lower.includes(k))) return "emergency";
  if (lower.includes("busy") || lower.includes("crowded") || lower.includes("overflow") ||
      lower.includes("plein") || lower.includes("occupé") || lower.includes("lleno") || lower.includes("مزدحم")) {
    return "elevated";
  }
  return "normal";
}

export function narrateZone(zone: Zone, lang = "en"): NarrateResult {
  const seed = zone.capacityCurrent / 100;
  const urgency: UrgencyLevel =
    zone.capacityCurrent >= 90 ? "emergency" :
    zone.capacityCurrent >= 80 ? "elevated" : "normal";

  let intro = "";
  if (urgency === "normal") {
    intro = pick(INTROS[lang] || INTROS.en, seed);
  } else if (urgency === "elevated") {
    intro = HEADS_UP[lang] || HEADS_UP.en;
  } else {
    intro = ALERTS[lang] || ALERTS.en;
  }

  const typeLabels = ZONE_TYPE_LABELS[lang] || ZONE_TYPE_LABELS.en;
  const typeLabel = typeLabels[zone.type] ?? zone.type;

  const densities = DENSITY_LABELS[lang] || DENSITY_LABELS.en;
  const density =
    zone.capacityCurrent >= 90 ? densities.critical :
    zone.capacityCurrent >= 80 ? densities.heavy :
    zone.capacityCurrent >= 60 ? densities.moderate : densities.clear;

  let text = "";
  if (lang === "ar") {
    text = `${intro} منطقة ${zone.name} (${typeLabel}) حالياً ${density} بنسبة إشغال ${Math.round(zone.capacityCurrent)}%.`;
    if (zone.trendingDirection === "rising" && zone.predictedPct) {
      text += ` الاتجاه صاعد - من المتوقع أن تصل إلى ${Math.round(zone.predictedPct)}% خلال ~6 دقائق.`;
    } else if (zone.trendingDirection === "falling") {
      text += " الازدحام آخذ في الانخفاض.";
    }
    if (!zone.accessibility.stepFree) {
      text += " تنبيه: هذه المنطقة بها سلالم وليست خالية من العوائق.";
    }
  } else if (lang === "es") {
    text = `${intro} ${zone.name} (${typeLabel}) está actualmente ${density} al ${Math.round(zone.capacityCurrent)}% de capacidad.`;
    if (zone.trendingDirection === "rising" && zone.predictedPct) {
      text += ` Tendencia al alza — proyectado a alcanzar ${Math.round(zone.predictedPct)}% en ~6 minutos.`;
    } else if (zone.trendingDirection === "falling") {
      text += " La congestión está disminuyendo.";
    }
    if (!zone.accessibility.stepFree) {
      text += " Nota: esta zona tiene escaleras — no es libre de escalones.";
    }
  } else if (lang === "fr") {
    text = `${intro} ${zone.name} (${typeLabel}) est actuellement ${density} à ${Math.round(zone.capacityCurrent)}% de capacité.`;
    if (zone.trendingDirection === "rising" && zone.predictedPct) {
      text += ` Tendance à la hausse — devrait atteindre ${Math.round(zone.predictedPct)}% dans ~6 minutes.`;
    } else if (zone.trendingDirection === "falling") {
      text += " La congestion s'atténue.";
    }
    if (!zone.accessibility.stepFree) {
      text += " Note : cette zone a des escaliers — pas d'accès sans marches.";
    }
  } else if (lang === "pt") {
    text = `${intro} ${zone.name} (${typeLabel}) está atualmente ${density} com ${Math.round(zone.capacityCurrent)}% de capacidade.`;
    if (zone.trendingDirection === "rising" && zone.predictedPct) {
      text += ` Tendência de alta — projetado para atingir ${Math.round(zone.predictedPct)}% em ~6 minutos.`;
    } else if (zone.trendingDirection === "falling") {
      text += " O congestionamento está diminuindo.";
    }
    if (!zone.accessibility.stepFree) {
      text += " Nota: esta zona tem escadas — não é livre de degraus.";
    }
  } else {
    text = `${intro} ${zone.name} (${typeLabel}) is currently ${density} at ${Math.round(zone.capacityCurrent)}% capacity.`;
    if (zone.trendingDirection === "rising" && zone.predictedPct) {
      text += ` Trending upward — projected to hit ${Math.round(zone.predictedPct)}% in ~6 minutes.`;
    } else if (zone.trendingDirection === "falling") {
      text += " Congestion is easing.";
    }
    if (!zone.accessibility.stepFree) {
      text += " Note: this zone has stairs — not step-free.";
    }
  }

  const actionLabels: Record<string, string> = {
    en: "Find alternate route",
    es: "Buscar ruta alternativa",
    fr: "Trouver un itinéraire alternatif",
    pt: "Buscar rota alternativa",
    ar: "البحث عن مسار بديل"
  };

  return {
    text,
    urgencyLevel: urgency,
    suggestedZoneId: urgency !== "normal" ? "gate-west" : null,
    actionLabel: urgency !== "normal" ? (actionLabels[lang] || actionLabels.en) : null,
  };
}

export function narrateRoute(route: RouteResult, zones: Zone[], lang = "en"): NarrateResult {
  const zoneMap = new Map(zones.map((z) => [z.id, z]));
  const bottlenecks = route.steps.filter((s) => {
    const z = zoneMap.get(s.zoneId);
    return z && z.capacityCurrent >= 80;
  });

  const urgency: UrgencyLevel = bottlenecks.length > 1 ? "elevated" : "normal";
  let text = "";

  if (lang === "ar") {
    text = `مسارك ${route.stepFreeOnly ? "الخالي من الدرج " : ""}إلى وجهتك يبلغ ${Math.round(route.totalDistanceMeters)}م — حوالي ${Math.round(route.estimatedMinutes)} دقيقة.`;
    if (route.steps.length === 0) {
      text = "لقد وصلت بالفعل إلى وجهتك.";
    } else {
      const first = route.steps[0];
      text += ` توجه نحو ${first?.zoneName ?? "المنطقة التالية"}.`;
    }
    if (bottlenecks.length > 0) {
      text += ` انتبه — ${bottlenecks.map((s) => s.zoneName).join(" و ")} مزدحمة حالياً.`;
    }
    if (route.steps.some((s) => s.isElevator)) {
      text += " يوجد مصعد متاح في هذا المسار.";
    }
  } else if (lang === "es") {
    text = `Tu ruta ${route.stepFreeOnly ? "libre de escalones " : ""}a tu destino es de ${Math.round(route.totalDistanceMeters)}m — aproximadamente ${Math.round(route.estimatedMinutes)} minuto${route.estimatedMinutes !== 1 ? "s" : ""}.`;
    if (route.steps.length === 0) {
      text = "Ya estás en tu destino.";
    } else {
      const first = route.steps[0];
      text += ` Dirígete hacia ${first?.zoneName ?? "la siguiente zona"}.`;
    }
    if (bottlenecks.length > 0) {
      text += ` Cuidado — ${bottlenecks.map((s) => s.zoneName).join(" y ")} ${bottlenecks.length === 1 ? "está ocupada" : "están ocupadas"} en este momento.`;
    }
    if (route.steps.some((s) => s.isElevator)) {
      text += " Se incluye un ascensor en esta ruta.";
    }
  } else if (lang === "fr") {
    text = `Votre itinéraire ${route.stepFreeOnly ? "sans marches " : ""}vers votre destination est de ${Math.round(route.totalDistanceMeters)}m — environ ${Math.round(route.estimatedMinutes)} minute${route.estimatedMinutes !== 1 ? "s" : ""}.`;
    if (route.steps.length === 0) {
      text = "Vous êtes déjà à destination.";
    } else {
      const first = route.steps[0];
      text += ` Dirigez-vous vers ${first?.zoneName ?? "la zone suivante"}.`;
    }
    if (bottlenecks.length > 0) {
      text += ` Attention — ${bottlenecks.map((s) => s.zoneName).join(" et ")} ${bottlenecks.length === 1 ? "est encombrée" : "sont encombrées"} en ce moment.`;
    }
    if (route.steps.some((s) => s.isElevator)) {
      text += " Un ascenseur est inclus sur cet itinéraire.";
    }
  } else if (lang === "pt") {
    text = `Sua rota ${route.stepFreeOnly ? "livre de degraus " : ""}até o destino é de ${Math.round(route.totalDistanceMeters)}m — cerca de ${Math.round(route.estimatedMinutes)} minuto${route.estimatedMinutes !== 1 ? "s" : ""}.`;
    if (route.steps.length === 0) {
      text = "Você já está no seu destino.";
    } else {
      const first = route.steps[0];
      text += ` Vá em direção a ${first?.zoneName ?? "próxima zona"}.`;
    }
    if (bottlenecks.length > 0) {
      text += ` Atenção — ${bottlenecks.map((s) => s.zoneName).join(" e ")} ${bottlenecks.length === 1 ? "está movimentada" : "estão movimentadas"} no momento.`;
    }
    if (route.steps.some((s) => s.isElevator)) {
      text += " Um elevador está incluído nesta rota.";
    }
  } else {
    text = `Your ${route.stepFreeOnly ? "step-free " : ""}route to your destination is ${Math.round(route.totalDistanceMeters)}m — about ${Math.round(route.estimatedMinutes)} minute${route.estimatedMinutes !== 1 ? "s" : ""}.`;
    if (route.steps.length === 0) {
      text = "You're already at your destination.";
    } else {
      const first = route.steps[0];
      text += ` Head toward ${first?.zoneName ?? "the next zone"}.`;
    }
    if (bottlenecks.length > 0) {
      text += ` Watch out — ${bottlenecks.map((s) => s.zoneName).join(" and ")} ${bottlenecks.length === 1 ? "is" : "are"} busy right now.`;
    }
    if (route.steps.some((s) => s.isElevator)) {
      text += " An elevator is included on this route.";
    }
  }

  return {
    text,
    urgencyLevel: urgency,
    suggestedZoneId: null,
    actionLabel: null,
  };
}

export function narrateAssistant(input: NarrateInput, zones: Zone[]): NarrateResult {
  const lang = input.language || "en";
  const urgency = detectUrgency(input.query);
  const nearestMedical = zones.find((z) => z.type === "medical");
  const seed = input.query.length / 100;
  const intro = pick(INTROS[lang] || INTROS.en, seed);

  // Emergency Narrations
  if (urgency === "emergency") {
    const emergencyTexts: Record<string, string> = {
      en: `Emergency mode activated. The nearest medical station is ${nearestMedical?.name ?? "the Medical Center"}. Stadium staff have been flagged. Stay calm — help is on the way.`,
      es: `Modo de emergencia activado. La estación médica más cercana es ${nearestMedical?.name ?? "el Centro Médico"}. El personal del estadio ha sido alertado. Mantén la calma — la ayuda está en camino.`,
      fr: `Mode d'urgence activé. Le poste médical le plus proche est ${nearestMedical?.name ?? "le centre médical"}. Le personnel du stade a été alerté. Restez calme — les secours arrivent.`,
      pt: `Modo de emergência ativado. O posto médico mais próximo é ${nearestMedical?.name ?? "o Centro Médico"}. A equipe do estádio foi notificada. Mantenha a calma — a ajuda está a caminho.`,
      ar: `تم تفعيل وضع الطوارئ. أقرب مركز طبي هو ${nearestMedical?.name ?? "المركز الطبي"}. تم تنبيه طاقم الملعب. يرجى الهدوء — المساعدة في الطريق إليك.`
    };
    const showMapLabels: Record<string, string> = {
      en: "Show on map", es: "Mostrar en mapa", fr: "Afficher sur la carte", pt: "Mostrar no mapa", ar: "عرض على الخريطة"
    };

    return {
      text: emergencyTexts[lang] || emergencyTexts.en,
      urgencyLevel: "emergency",
      suggestedZoneId: nearestMedical?.id ?? null,
      actionLabel: showMapLabels[lang] || showMapLabels.en,
    };
  }

  const query = input.query.toLowerCase();
  let text = "";

  // Helper matching
  const hasKeywords = (kws: string[]) => kws.some(k => query.includes(k));

  if (lang === "ar") {
    if (hasKeywords(["حمام", "دورة مياه", "مرحاض", "toilet", "restroom"])) {
      text = `${intro} تقع أقرب دورات المياه في مناطق البهو — البهو الشمالي الشرقي يضم مرافق مجهزة خالية من الدرج.`;
    } else if (hasKeywords(["طعام", "أكل", "شرب", "جائع", "عطشان", "شراب", "food", "eat"])) {
      const amenityZone = zones.find((z) => z.type === "amenity" && z.capacityCurrent < 70);
      text = `${intro} ${amenityZone ? `${amenityZone.name} تعمل حالياً بنسبة إشغال ${Math.round(amenityZone.capacityCurrent)}% — وهي الخيار الأهدأ حالياً لتناول الطعام.` : "تتوفر مناطق الطعام والهدايا في كلا البهوين الشرقي والغربي."}`;
    } else if (hasKeywords(["خروج", "مغادرة", "بوابة", "exit", "leave"])) {
      const quietGate = zones
        .filter((z) => z.type === "gate")
        .sort((a, b) => a.capacityCurrent - b.capacityCurrent)[0];
      text = `${intro} ${quietGate ? `${quietGate.name} هي بوابة الخروج الأقل ازدحاماً حالياً بنسبة إشغال ${Math.round(quietGate.capacityCurrent)}%.` : "توجه إلى البوابة الغربية للخروج الأسرع حالياً."}`;
    } else if (hasKeywords(["مقعد", "موقع", "كرسي", "درجة", "seat", "section"])) {
      text = `${intro} يمكن الوصول إلى مقعدك من خلال البهو الشمالي الشرقي أو البهو الشمالي الغربي. يرجى مراجعة تذكرتك لمعرفة الصف المحدد.`;
    } else if (hasKeywords(["طبي", "إسعاف", "عيادة", "medical", "first aid"])) {
      text = `${intro} يقع المركز الطبي في المنطقة الغربية من الملعب، ويمكن الوصول إليه من البهو الشمالي الغربي. يعمل حالياً بسعة منخفضة — لا يوجد وقت انتظار متوقع.`;
    } else {
      const busyZones = zones.filter((z) => z.capacityCurrent > 80);
      if (busyZones.length > 0) {
        text = `${intro} منطقة ${busyZones[0]?.name} مزدحمة بشكل خاص الآن. أنصحك باستخدام الطرق الغربية أو الجنوبية لتجنب الازدحام. ما هو سؤالك بالتحديد؟`;
      } else {
        text = `${intro} الملعب يعمل بسلاسة تامة الآن. جميع المناطق الرئيسية تقع ضمن السعة العادية. كيف يمكنني مساعدتك؟`;
      }
    }
  } else if (lang === "es") {
    if (hasKeywords(["baño", "aseo", "sanitario", "toilet", "restroom"])) {
      text = `${intro} Los baños más cercanos están en las secciones del vestíbulo — el vestíbulo noreste cuenta con instalaciones con acceso sin escalones.`;
    } else if (hasKeywords(["comida", "comer", "beber", "cerveza", "food", "eat"])) {
      const amenityZone = zones.find((z) => z.type === "amenity" && z.capacityCurrent < 70);
      text = `${intro} ${amenityZone ? `${amenityZone.name} está actualmente al ${Math.round(amenityZone.capacityCurrent)}% — la opción de comida más tranquila ahora mismo.` : "Las áreas de comida y mercancías están en los vestíbulos este y oeste."}`;
    } else if (hasKeywords(["salida", "salir", "puerta", "exit", "leave"])) {
      const quietGate = zones
        .filter((z) => z.type === "gate")
        .sort((a, b) => a.capacityCurrent - b.capacityCurrent)[0];
      text = `${intro} ${quietGate ? `${quietGate.name} es la salida menos congestionada al ${Math.round(quietGate.capacityCurrent)}% de capacidad.` : "Dirígete a la Puerta Oeste para la salida más rápida en este momento."}`;
    } else if (hasKeywords(["asiento", "sección", "fila", "seat", "section"])) {
      text = `${intro} Tu sección de asientos es accesible tanto desde el vestíbulo noreste como desde el noroeste. Revisa tu boleto para la fila específica.`;
    } else if (hasKeywords(["médico", "primeros auxilios", "enfermería", "medical", "first aid"])) {
      text = `${intro} El Centro Médico está en el área oeste del estadio, accesible desde el vestíbulo noroeste. Actualmente opera a baja capacidad — no se espera tiempo de espera.`;
    } else {
      const busyZones = zones.filter((z) => z.capacityCurrent > 80);
      if (busyZones.length > 0) {
        text = `${intro} ${busyZones[0]?.name} está particularmente congestionada en este momento. Recomiendo usar las rutas del oeste o del sur para evitar áreas concurridas. ¿En qué te puedo ayudar específicamente?`;
      } else {
        text = `${intro} El estadio está funcionando sin problemas en este momento. Todas las zonas principales están dentro de su capacidad normal. ¿Qué necesitas?`;
      }
    }
  } else if (lang === "fr") {
    if (hasKeywords(["toilette", "wc", "lavabo", "toilet", "restroom"])) {
      text = `${intro} Les toilettes les plus proches se trouvent dans les coursives — la coursive Nord-Est dispose d'installations accessibles sans marches.`;
    } else if (hasKeywords(["nourriture", "manger", "boire", "bière", "faim", "food", "eat"])) {
      const amenityZone = zones.find((z) => z.type === "amenity" && z.capacityCurrent < 70);
      text = `${intro} ${amenityZone ? `${amenityZone.name} est actuellement à ${Math.round(amenityZone.capacityCurrent)}% — l'option de restauration la plus calme actuellement.` : "Des zones de restauration et de vente de souvenirs sont situées dans les coursives Est et Ouest."}`;
    } else if (hasKeywords(["sortie", "sortir", "porte", "exit", "leave"])) {
      const quietGate = zones
        .filter((z) => z.type === "gate")
        .sort((a, b) => a.capacityCurrent - b.capacityCurrent)[0];
      text = `${intro} ${quietGate ? `${quietGate.name} est la sortie la moins encombrée avec ${Math.round(quietGate.capacityCurrent)}% de capacité.` : "Dirigez-vous vers la Porte Ouest pour la sortie la plus rapide actuellement."}`;
    } else if (hasKeywords(["siège", "place", "section", "rang", "seat", "section"])) {
      text = `${intro} Votre section de sièges est accessible depuis les coursives Nord-Est et Nord-Ouest. Vérifiez votre billet pour la rangée spécifique.`;
    } else if (hasKeywords(["médical", "premiers secours", "infirmerie", "medical", "first aid"])) {
      text = `${intro} Le centre médical se trouve dans la zone Ouest du stade, accessible depuis la coursive Nord-Ouest. Il fonctionne actuellement à faible capacité — aucun temps d'attente prévu.`;
    } else {
      const busyZones = zones.filter((z) => z.capacityCurrent > 80);
      if (busyZones.length > 0) {
        text = `${intro} ${busyZones[0]?.name} est particulièrement encombrée en ce moment. Je vous conseille d'emprunter les itinéraires Ouest ou Sud pour éviter les zones denses. Comment puis-je vous aider précisément ?`;
      } else {
        text = `${intro} Le stade fonctionne normalement en ce moment. Toutes les zones principales sont dans leur capacité normale. De quoi avez-vous besoin ?`;
      }
    }
  } else if (lang === "pt") {
    if (hasKeywords(["banheiro", "sanitário", "lavabo", "toilet", "restroom"])) {
      text = `${intro} Os banheiros mais próximos estão nos saguões — o saguão Nordeste tem instalações acessíveis e sem degraus.`;
    } else if (hasKeywords(["comida", "comer", "beber", "cerveja", "fome", "food", "eat"])) {
      const amenityZone = zones.find((z) => z.type === "amenity" && z.capacityCurrent < 70);
      text = `${intro} ${amenityZone ? `${amenityZone.name} está atualmente com ${Math.round(amenityZone.capacityCurrent)}% — a opção de comida mais calma agora.` : "As áreas de comida e produtos estão nos saguões Leste e Oeste."}`;
    } else if (hasKeywords(["saída", "sair", "portão", "exit", "leave"])) {
      const quietGate = zones
        .filter((z) => z.type === "gate")
        .sort((a, b) => a.capacityCurrent - b.capacityCurrent)[0];
      text = `${intro} ${quietGate ? `${quietGate.name} é a saída menos congestionada com ${Math.round(quietGate.capacityCurrent)}% de capacidade.` : "Siga para o Portão Oeste para a saída mais rápida agora."}`;
    } else if (hasKeywords(["assento", "lugar", "seção", "fileira", "seat", "section"])) {
      text = `${intro} Sua seção de assentos é acessível tanto pelo saguão Nordeste quanto pelo Noroeste. Verifique seu ingresso para a fileira específica.`;
    } else if (hasKeywords(["médico", "primeiros socorros", "posto médico", "medical", "first aid"])) {
      text = `${intro} O Centro Médico fica na área oeste do estádio, acessível pelo saguão Noroeste. Está operando com baixa capacidade — sem filas esperadas.`;
    } else {
      const busyZones = zones.filter((z) => z.capacityCurrent > 80);
      if (busyZones.length > 0) {
        text = `${intro} ${busyZones[0]?.name} está bastante movimentada agora. Recomendo usar as rotas Oeste ou Sul para evitar a aglomeração. Em que posso te ajudar especificamente?`;
      } else {
        text = `${intro} O estádio está funcionando normalmente no momento. Todas as principais áreas estão sob capacidade adequada. O que você precisa?`;
      }
    }
  } else {
    // English (Default)
    if (query.includes("toilet") || query.includes("bathroom") || query.includes("restroom")) {
      text = `${intro} The nearest restrooms are in the concourse sections — NE Concourse has facilities with step-free access.`;
    } else if (query.includes("food") || query.includes("eat") || query.includes("drink") || query.includes("beer")) {
      const amenityZone = zones.find((z) => z.type === "amenity" && z.capacityCurrent < 70);
      text = `${intro} ${amenityZone ? `${amenityZone.name} is currently at ${Math.round(amenityZone.capacityCurrent)}% — the quietest food option right now.` : "Food & merch areas are in both the East and West concourses."}`;
    } else if (query.includes("exit") || query.includes("leave") || query.includes("out")) {
      const quietGate = zones
        .filter((z) => z.type === "gate")
        .sort((a, b) => a.capacityCurrent - b.capacityCurrent)[0];
      text = `${intro} ${quietGate ? `${quietGate.name} is the least congested exit at ${Math.round(quietGate.capacityCurrent)}% capacity.` : "Head to West Gate for the quickest exit right now."}`;
    } else if (query.includes("seat") || query.includes("section")) {
      text = `${intro} Your seating section is accessible from both the NE and NW Concourses. Check your ticket for the specific row.`;
    } else if (query.includes("medical") || query.includes("first aid")) {
      text = `${intro} The Medical Center is in the West area of the stadium, accessible from NW Concourse. It's currently operating at low capacity — no wait expected.`;
    } else {
      const busyZones = zones.filter((z) => z.capacityCurrent > 80);
      if (busyZones.length > 0) {
        text = `${intro} ${busyZones[0]?.name} is particularly congested right now. I'd recommend using West or South routes to avoid the busy areas. What specifically can I help you with?`;
      } else {
        text = `${intro} The stadium is running smoothly right now. All major zones are within normal capacity. What do you need?`;
      }
    }
  }

  return {
    text,
    urgencyLevel: urgency,
    suggestedZoneId: null,
    actionLabel: null,
  };
}

export function narrate(input: NarrateInput, zones: Zone[]): NarrateResult {
  const lang = input.language || "en";
  switch (input.type) {
    case "zone": {
      const zone = zones.find((z) => z.id === input.zoneId);
      if (zone) return narrateZone(zone, lang);
      const zoneNotFoundTexts: Record<string, string> = {
        en: "Zone not found.", es: "Zona no encontrada.", fr: "Zone introuvable.", pt: "Zona não encontrada.", ar: "المنطقة غير موجودة."
      };
      return { text: zoneNotFoundTexts[lang] || zoneNotFoundTexts.en, urgencyLevel: "normal", suggestedZoneId: null, actionLabel: null };
    }
    case "emergency": {
      const nearestMedical = zones.find((z) => z.type === "medical");
      const emergencyTexts: Record<string, string> = {
        en: `Emergency assistance activated. The nearest medical station is ${nearestMedical?.name ?? "Medical Center"}. Stadium staff have been alerted. Please stay where you are.`,
        es: `Asistencia de emergencia activada. La estación médica más cercana es ${nearestMedical?.name ?? "Centro Médico"}. El personal del estadio ha sido alertado. Por favor quédate donde estás.`,
        fr: `Assistance d'urgence activée. Le poste médical le plus proche est ${nearestMedical?.name ?? "le centre médical"}. Le personnel du stade a été alerté. S'il vous plaît, restez où vous êtes.`,
        pt: `Assistência de emergência ativada. O posto médico mais próximo é ${nearestMedical?.name ?? "o Centro Médico"}. A equipe do estádio foi alertada. Por favor, permaneça onde está.`,
        ar: `تم تفعيل المساعدة الطارئة. أقرب عيادة طبية هي ${nearestMedical?.name ?? "المركز الطبي"}. تم إخطار موظفي الملعب. يرجى البقاء في مكانك.`
      };
      const navMedicalLabels: Record<string, string> = {
        en: "Navigate to Medical Center",
        es: "Navegar al Centro Médico",
        fr: "Aller au centre médical",
        pt: "Navegar para o Centro Médico",
        ar: "التوجيه إلى المركز الطبي"
      };

      return {
        text: emergencyTexts[lang] || emergencyTexts.en,
        urgencyLevel: "emergency",
        suggestedZoneId: nearestMedical?.id ?? null,
        actionLabel: navMedicalLabels[lang] || navMedicalLabels.en,
      };
    }
    case "route": {
      if (input.routeContext) {
        try {
          const route = JSON.parse(input.routeContext) as RouteResult;
          return narrateRoute(route, zones, lang);
        } catch {
          // fall through
        }
      }
      const routeNotFoundTexts: Record<string, string> = {
        en: "Route narration unavailable.", es: "Narración de ruta no disponible.", fr: "Narration d'itinéraire indisponible.", pt: "Narração de rota indisponível.", ar: "شرح المسار غير متوفر حالياً."
      };
      return { text: routeNotFoundTexts[lang] || routeNotFoundTexts.en, urgencyLevel: "normal", suggestedZoneId: null, actionLabel: null };
    }
    case "assistant":
    default:
      return narrateAssistant(input, zones);
  }
}
