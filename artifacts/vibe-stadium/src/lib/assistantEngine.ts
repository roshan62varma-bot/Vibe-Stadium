export function sanitizeAndValidateInput(query: string): { isValid: boolean; sanitized: string; error?: string } {
  const trimmed = query.trim();
  
  // 1. Block XSS Script tags
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(trimmed)) {
    return { isValid: false, sanitized: trimmed, error: "Malicious script tags detected." };
  }

  // 2. Block javascript: protocols
  if (/javascript:/i.test(trimmed)) {
    return { isValid: false, sanitized: trimmed, error: "Javascript protocols are not allowed." };
  }

  // 3. Block inline HTML event handlers (onerror, onload, onclick, etc)
  if (/on\w+\s*=/i.test(trimmed)) {
    return { isValid: false, sanitized: trimmed, error: "HTML inline events are not allowed." };
  }

  // 4. Basic XSS tag sanitization (strip all HTML tags to prevent injections)
  const sanitized = trimmed.replace(/<\/?[^>]+(>|$)/g, "");

  // 5. Check if query is too long
  if (sanitized.length > 500) {
    return { isValid: false, sanitized: sanitized.slice(0, 500), error: "Input exceeds maximum allowed length." };
  }

  return { isValid: true, sanitized };
}

export interface ReasoningResult {
  matches: boolean;
  text: string;
  isEmergency: boolean;
}

export function handleReasoningEngine(
  query: string,
  zones: any[],
  language: string
): ReasoningResult {
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
    const medicalZone = (zones || []).find(z => z.id === 'medical-zone');
    const medDensity = medicalZone ? Math.round(medicalZone.capacityCurrent) : 9;

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
    
    const westDensity = westAmenity ? Math.round(westAmenity.capacityCurrent) : 33;
    const eastDensity = eastAmenity ? Math.round(eastAmenity.capacityCurrent) : 68;

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
    const westDensity = 33;
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
}
