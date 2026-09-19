/**
 * MEYRA AI — Founder & Core Team Intent Handler
 *
 * Permanent rule: Whenever a user asks about the founder, creator, owner,
 * or who made MEYRA AI in Hindi, Hinglish, or English, ALWAYS return the
 * permanent core team asset and complete official information.
 *
 * CRITICAL ENTITY RESOLUTION:
 * Never activate MEYRA's founder/team response when the user asks about
 * another company, organization, product, brand, or unknown entity.
 */

export const MEYRA_CORE_TEAM_IMAGE = "/meyra_core_team.png";

export const MEYRA_CORE_TEAM_RESPONSE = `![MEYRA AI — Core Team](${MEYRA_CORE_TEAM_IMAGE})

### MEYRA AI — Core Team

👑 **Himanshu Maurya**  
**Founder / CEO / CTO**  
Founder — MEYRA AI ke founder aur creator  
CEO — Company ki vision, leadership aur major decisions  
CTO — Technology, AI systems aur product development  

⚡ **Aditya Maurya**  
**Co-Founder / COO**  
Co-Founder — MEYRA AI ke co-founder  
COO — Operations, execution, team coordination aur day-to-day business activities  

💜 **Meethi Yadav**  
**Inspiration Behind MEYRA AI / Brand Advisor**  
Inspiration Behind MEYRA AI — MEYRA naam aur concept ke peeche inspiration  
Brand Advisor — Brand identity aur creative/brand perspective`;

export type TargetEntity = "meyra" | "other" | "unknown";

export interface FounderResolution {
  isFounderInquiry: boolean;
  targetEntity: TargetEntity;
  entityName?: string;
  reason?: string;
}

export interface ChatHistoryMessage {
  role: string;
  content: string;
}

// Known major external companies, organizations, and platforms
const KNOWN_EXTERNAL_ENTITIES = [
  "google",
  "alphabet",
  "microsoft",
  "openai",
  "apple",
  "amazon",
  "tesla",
  "meta",
  "facebook",
  "instagram",
  "whatsapp",
  "twitter",
  "x",
  "netflix",
  "spacex",
  "anthropic",
  "adobe",
  "intel",
  "nvidia",
  "oracle",
  "salesforce",
  "uber",
  "airbnb",
  "spotify",
  "stripe",
  "tcs",
  "infosys",
  "wipro",
  "reliance",
  "tata",
  "zomato",
  "swiggy",
  "paytm",
  "flipkart",
  "samsung",
  "sony",
  "ibm",
  "deepmind",
  "baidu",
  "alibaba",
  "tencent",
  "bytedance",
  "tiktok",
  "youtube",
  "linkedin",
  "pinterest",
  "reddit",
  "snapchat",
  "discord",
  "zoom",
  "slack",
  "palantir",
  "databricks",
  "snowflake",
  "cloudflare",
  "github",
  "gitlab",
  "wordpress",
  "shopify",
  "ebay",
  "paypal",
  "square",
  "block",
  "coinbase",
  "binance",
  "nike",
  "adidas",
  "ford",
  "boeing",
  "neuralink",
  "perplexity",
  "mistral",
  "cohere",
  "hugging face",
];

const GENERIC_EXTERNAL_ENTITY_PATTERNS = [
  /\b(my\s+company|our\s+company|his\s+company|her\s+company|their\s+company|another\s+company|some\s+company|that\s+company|the\s+company|this\s+company|meri\s+company|hamari\s+company|is\s+company|us\s+company|kisi\s+company)\b/i,
  /\[another\s+company\]/i,
  /\[company\]/i,
  /\b(my\s+firm|our\s+firm|my\s+startup|our\s+startup|another\s+startup|that\s+startup)\b/i,
  /\b(my\s+school|our\s+school|my\s+college|our\s+college|my\s+university)\b/i,
];

/**
 * Extracts a candidate entity from text given by preceding context,
 * checking for known companies, explicit mentions, or generic entities.
 */
function extractEntityFromText(text: string): { entityType: TargetEntity; entityName?: string } {
  if (!text || typeof text !== "string") return { entityType: "unknown" };
  const lower = text.toLowerCase();

  // Check if text specifically introduces or refers to MEYRA AI
  const hasMeyra = /\b(meyra\s*ai|meyra|meyraai|meyra's)\b/i.test(text);

  // Check for generic external company references
  for (const pattern of GENERIC_EXTERNAL_ENTITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { entityType: "other", entityName: match[0].trim() };
    }
  }

  // Check for known external entities
  for (const entity of KNOWN_EXTERNAL_ENTITIES) {
    const regex = new RegExp(`\\b${entity}\\b`, "i");
    if (regex.test(lower)) {
      // If both are mentioned, see which one is more recent or prominent
      if (hasMeyra) {
        const meyraIdx = lower.lastIndexOf("meyra");
        const otherIdx = lower.lastIndexOf(entity);
        if (meyraIdx > otherIdx) {
          return { entityType: "meyra", entityName: "MEYRA AI" };
        }
      }
      return { entityType: "other", entityName: entity };
    }
  }

  if (hasMeyra) {
    return { entityType: "meyra", entityName: "MEYRA AI" };
  }

  return { entityType: "unknown" };
}

/**
 * Resolves a founder/creator/leadership inquiry by determining:
 * 1. Is this query asking about founders/creators/CEOs/teams?
 * 2. What entity is being asked about (meyra | other | unknown)?
 */
export function resolveFounderInquiry(
  rawQuery: string,
  history?: ChatHistoryMessage[]
): FounderResolution {
  if (!rawQuery || typeof rawQuery !== "string") {
    return { isFounderInquiry: false, targetEntity: "unknown" };
  }

  const queryTrimmed = rawQuery.trim();
  const lower = queryTrimmed.toLowerCase();

  // 1. Check if this is an inquiry about founder, creator, leadership, or origins
  const isFounderQueryPattern =
    /\b(founder|founders|founded|co-founder|cofounder|creator|creators|created|who\s+made|who\s+built|who\s+started|who\s+invented|who\s+owns|who\s+runs|core\s*team|ceo|cto|coo)\b/i.test(
      queryTrimmed
    ) ||
    /\b(kisne\s+(banaya|bnaaya|bnaya|create|start|shuru|launch|design|develop|code))\b/i.test(
      queryTrimmed
    ) ||
    /\b(founder|creator|owner|malik|maker|core\s*team|co-founder|ceo|cto)\s+(kaun|kon|koun|konsa|naam|name|hai|h|hein)\b/i.test(
      queryTrimmed
    ) ||
    /\b(kaun|kon|koun)\s+(hai|h)\s*.*?\b(founder|creator|owner|malik|maker)\b/i.test(
      queryTrimmed
    ) ||
    /(फाउंडर|संस्थापक|क्रिएटर|किसने\s*बनाया|मालिक)/.test(queryTrimmed);

  if (!isFounderQueryPattern) {
    return { isFounderInquiry: false, targetEntity: "unknown" };
  }

  // 2. Direct 2nd-person questions referring specifically to the assistant (MEYRA AI)
  // E.g.: "Who made you?", "Who created you?", "Who is your founder?", "Tumhe kisne banaya?"
  const directSecondPersonPatterns = [
    /\bwho\s+(created|made|built|founded|developed|designed|coded|programmed|started|invented|runs|owns)\s+(you|u|this\s+ai|this\s+app|this\s+bot)\b/i,
    /\bwho\s+is\s+(your|ur)\s+(founder|founders|creator|creators|owner|maker|developer|author|ceo|team|core\s*team)\b/i,
    /\bwho\s+are\s+(your|ur)\s+(creators|founders|makers|developers|team)\b/i,
    /\bwho\s+is\s+behind\s+(you|u|this\s+ai|this\s+app)\b/i,
    /\b(tumhe|tujhe|aapko)\s+kisne\s+(banaya|create|develop|bnaaya|bnaya|shuru|start)/i,
    /\bkisne\s+(tumhe|tujhe|aapko)\s+(banaya|create|bnaaya|bnaya)/i,
    /\b(tumhara|tera|aapka|apka)\s+(founder|creator|owner|malik|team|maker|developer|ceo)/i,
    /\b(kaun|kon|koun)\s+(hai|h)\s*(tumhara|tera|aapka|apka)\s*(founder|creator|owner|malik|maker)/i,
    /\b(is\s+ai\s+ko|is\s+app\s+ko)\s+kisne\s+(banaya|create)/i,
    /(तुम्हें\s*किसने|आपका\s*फाउंडर|तुम्हारा\s*फाउंडर|तुम्हारी\s*टीम)/,
  ];

  // Check if this is a direct 2nd-person query that does NOT name an external entity
  const matchesDirectSecondPerson = directSecondPersonPatterns.some((pattern) =>
    pattern.test(queryTrimmed)
  );

  // 3. Extract syntactically targeted entity from the query
  // "founder of <Entity>"
  const founderOfMatch = queryTrimmed.match(
    /\b(?:founder|founders|creator|creators|owner|owners|ceo|cto|co-founder)\s+(?:of|for)\s+([a-zA-Z0-9_.\-\s[\]]+?)(?:[.?!,;:]|$)/i
  );
  // "who founded <Entity>"
  const whoFoundedMatch = queryTrimmed.match(
    /\bwho\s+(?:founded|created|started|made|built|invented|runs|owns|designed|coded)\s+([a-zA-Z0-9_.\-\s[\]]+?)(?:[.?!,;:]|$)/i
  );
  // "<Entity> ka founder"
  const kaFounderMatch = queryTrimmed.match(
    /([a-zA-Z0-9_.\-\s[\]]+?)\s+(?:ka|ke|ki)\s+(?:founder|founders|creator|creators|owner|malik|team|ceo|cto)\b/i
  );
  // "<Entity> kisne banaya"
  const kisneBanayaMatch = queryTrimmed.match(
    /([a-zA-Z0-9_.\-\s[\]]+?)\s+(?:ko\s+)?kisne\s+(?:banaya|bnaaya|bnaya|create|start|shuru|launch|develop)\b/i
  );
  // "tell me the founder of <Entity>"
  const tellMeFounderMatch = queryTrimmed.match(
    /\btell\s+me\s+(?:the\s+)?(?:founder|founders|creator|ceo)\s+(?:of\s+)?([a-zA-Z0-9_.\-\s[\]]+?)(?:[.?!,;:]|$)/i
  );

  const candidateEntityRaw =
    founderOfMatch?.[1] ||
    whoFoundedMatch?.[1] ||
    kaFounderMatch?.[1] ||
    kisneBanayaMatch?.[1] ||
    tellMeFounderMatch?.[1];

  if (candidateEntityRaw) {
    const candidateClean = candidateEntityRaw
      .replace(/^(the|a|an|about|for|of|my|our)\s+/i, "")
      .replace(/\s+(ka|ke|ki|hai|h|hein|tha|ho|in|at|on)$/i, "")
      .trim()
      .toLowerCase();

    // Check if syntactically targeted entity is MEYRA AI
    const isMeyraTarget =
      candidateClean === "meyra" ||
      candidateClean === "meyra ai" ||
      candidateClean === "meyraai" ||
      candidateClean === "meyra-ai" ||
      candidateClean === "this ai" ||
      candidateClean === "this app" ||
      candidateClean === "this bot" ||
      candidateClean === "you" ||
      candidateClean === "u" ||
      candidateClean === "tum" ||
      candidateClean === "tumhe" ||
      candidateClean === "tujhe" ||
      candidateClean === "aap" ||
      candidateClean === "aapko" ||
      candidateClean === "tumhara" ||
      candidateClean === "tera" ||
      candidateClean === "aapka" ||
      candidateClean === "apka";

    if (isMeyraTarget) {
      return { isFounderInquiry: true, targetEntity: "meyra", entityName: "MEYRA AI" };
    }

    // Check if it's a pronoun like "it" or "its"
    const isPronounTarget =
      candidateClean === "it" ||
      candidateClean === "its" ||
      candidateClean === "this" ||
      candidateClean === "that" ||
      candidateClean === "iska" ||
      candidateClean === "iski" ||
      candidateClean === "unka" ||
      candidateClean === "inka";

    if (!isPronounTarget && candidateClean.length > 1) {
      // It's an explicit other entity (e.g. "Google", "Microsoft", "OpenAI", "my company", "[another company]")
      return {
        isFounderInquiry: true,
        targetEntity: "other",
        entityName: candidateEntityRaw.trim(),
        reason: `Explicitly asked about '${candidateEntityRaw.trim()}'`,
      };
    }
  }

  // 4. Check if the current query mentions another company/entity in any preceding clause
  // E.g. "Tell me about Google. Who is its founder?"
  // E.g. "Now tell me about MEYRA AI. Who is its founder?"
  const explicitEntityInQuery = extractEntityFromText(queryTrimmed);
  if (explicitEntityInQuery.entityType !== "unknown") {
    return {
      isFounderInquiry: true,
      targetEntity: explicitEntityInQuery.entityType,
      entityName: explicitEntityInQuery.entityName,
      reason: `Found entity '${explicitEntityInQuery.entityName}' directly in message`,
    };
  }

  // If matched direct 2nd-person without any other company mentioned
  if (matchesDirectSecondPerson) {
    return { isFounderInquiry: true, targetEntity: "meyra", entityName: "MEYRA AI" };
  }

  // 5. Context Handling (Multi-turn conversations)
  // If the query uses pronouns ("its", "it", "that", "this") or is elliptical ("Who is the founder?", "Founder kaun hai?"),
  // inspect prior messages in history to find the referenced entity.
  if (history && Array.isArray(history) && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (!msg || !msg.content) continue;

      const historyEntity = extractEntityFromText(msg.content);
      if (historyEntity.entityType !== "unknown") {
        return {
          isFounderInquiry: true,
          targetEntity: historyEntity.entityType,
          entityName: historyEntity.entityName,
          reason: `Resolved from conversation context: '${historyEntity.entityName}'`,
        };
      }
    }
  }

  // 6. Explicit mention of MEYRA anywhere in the query
  if (/\b(meyra\s*ai|meyra|meyraai)\b/i.test(queryTrimmed)) {
    return { isFounderInquiry: true, targetEntity: "meyra", entityName: "MEYRA AI" };
  }

  // 7. No entity identified in message or context (e.g. standalone "founder", "who is the founder?")
  // RULE 3: Never activate MEYRA's founder/team response merely because the message contains keywords.
  return { isFounderInquiry: true, targetEntity: "unknown" };
}

/**
 * Detects if a user message is inquiring specifically about the founder,
 * creator, owner, team, or origin of MEYRA AI in English, Hindi, or Hinglish.
 *
 * MUST return true ONLY if the inquiry refers specifically to MEYRA AI.
 * MUST return false for any other company, organization, or generic query.
 */
export function detectFounderIntent(
  rawQuery: string,
  history?: ChatHistoryMessage[]
): boolean {
  const resolution = resolveFounderInquiry(rawQuery, history);
  return resolution.isFounderInquiry && resolution.targetEntity === "meyra";
}

/**
 * Detects whether a query asks for current, recent, live, or time-sensitive information.
 * Supports English and Hindi (both Devanagari and Romanized scripts).
 */
export function isTimeSensitiveQuery(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase().trim();

  // Devanagari keywords for real-time / current queries
  const devanagariTimePatterns = [
    /आज/,
    /अभी/,
    /ताज़ा|ताजा/,
    /खबर|खबरें|समाचार/,
    /मौसम/,
    /भाव|दाम|कीमत|रेट/,
    /हाल\s*ही/,
    /अपडेट/,
    /लाइव/,
  ];

  if (devanagariTimePatterns.some((p) => p.test(text))) {
    return true;
  }

  // English & Romanized Hindi patterns
  const timePatterns = [
    /\b(latest|current|currently|today|today's|tonight|yesterday|recent|recently|live|breaking|up-to-date|real-time|right now)\b/i,
    /\b(who is the current|what is the current|what is today's|what happened today|latest news|breaking news|current events)\b/i,
    /\b(aaj|aaj\s*ka|aaj\s*ki|taza|taaza|haal\s*hi\s*me|haal\s*hi\s*mein|abhi|ab\s*kaun|taaza\s*khabar|khabar|khabrein|samachar)\b/i,
    /\b(current\s*president|current\s*prime\s*minister|current\s*ceo|current\s*champion|current\s*score|live\s*score)\b/i,
    /\b(weather|forecast|mausam|taapman)\b/i,
    /\b(stock\s*price|gold\s*rate|gold\s*price|silver\s*price|silver\s*rate|crypto\s*price|petrol\s*price|diesel\s*price|current\s*price|current\s*prices|sone\s*ka\s*bhav|chandi\s*ka\s*bhav)\b/i,
    /\b(latest\s*release|latest\s*version|recent\s*updates|recent\s*news|live\s*status|current\s*status)\b/i,
  ];

  return timePatterns.some((p) => p.test(lower));
}

/**
 * Sanitizes external entity responses from upstream models so that
 * unsolicited MEYRA AI team disclaimers or assets are never attached
 * to external company answers.
 */
export function sanitizeExternalEntityResponse(text: string): string {
  if (!text) return "";
  let cleaned = text
    .replace(/\*?\*?Note regarding MEYRA AI:[\s\S]*$/i, "")
    .replace(/\*?\*?Note:\s*As MEYRA AI[\s\S]*$/i, "")
    .replace(/!\[MEYRA AI — Core Team\]\([^)]+\)/g, "")
    .replace(/###\s*MEYRA AI — Core Team[\s\S]*?(?:Brand Advisor[^\n]*|$)/gi, "")
    .replace(/(?:👑\s*)?\*?\*?Himanshu Maurya\*?\*?[\s\S]*?(?:Founder\s*\/\s*CEO\s*\/\s*CTO)[\s\S]*?(?:Meethi Yadav[\s\S]*?Brand Advisor[^\n]*|$)/gi, "")
    .trim();

  // If cleaning stripped everything (e.g. model output only the MEYRA team on generic "founder"),
  // return a clear conceptual answer instead of empty string!
  if (!cleaned || cleaned.length < 10) {
    return "A **founder** is an entrepreneur or creator who establishes a company, organization, or project. Founders identify a market need or idea, develop the initial product or vision, assemble the early team, and take on the initial risks to build and grow the venture.";
  }
  return cleaned;
}



