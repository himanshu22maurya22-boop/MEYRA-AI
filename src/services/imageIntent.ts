export interface ParsedImageRequest {
  isImageRequest: boolean;
  prompt: string;
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  style: "Photorealistic" | "Anime" | "3D Render" | "Cinematic" | "Digital Art" | "Minimalist";
}

// Phrases/keywords that indicate the query is for code, text writing, or asking an informational question
const NON_IMAGE_INDICATORS = [
  /\b(code|coding|script|program|function|algorithm|class|api|component|app|website|html|css|javascript|typescript|python|java|c\+\+|sql|database|table|query|schema|regex)\b/i,
  /\b(poem|essay|story|article|blog|letter|email|resume|cv|summary|paragraph|text|sentence|speech|dialogue|lyrics|novel|presentation|slide)\b/i,
  /\b(plan|schedule|timetable|strategy|diet|workout|routine|recipe|formula|explanation|definition)\b/i,
  /^(who|what|why|when|where|how|kya|kaun|kisne)\b/i,
  /^(can\s+you|kya\s+tum|do\s+you|are\s+you\s+able\s+to|tum)\s+.*?\b(generate|create|make|draw|bana\s*sakte|bana\s*sakti)\s+(images?|photos?|pictures?|wallpapers?)\s*(\?|$)/i,
  /^(founder|creator|who\s+made|kisne\s+banaya|aditya\s+maurya|himanshu\s+maurya)/i,
];

// Regex patterns to detect image generation intent across English, Hindi, and Hinglish
const IMAGE_INTENT_PATTERNS = [
  // 1. Explicit visual nouns with creation verbs in English
  /\b(generate|create|make\s+me|make|draw|paint|render|visualize|illustrate|design)\b.*?\b(image|photo|picture|wallpaper|artwork|portrait|illustration|painting|drawing|poster|pic|logo|brand|monogram|emblem|badge|symbol|icon)\b/i,
  // 2. Hindi / Hinglish explicit image noun requests
  /\b(photo|image|picture|wallpaper|tasveer|chitra|drawing|portrait|poster|pic|logo|brand|monogram|emblem|badge|symbol|icon)\s*(ki\s+|ka\s+|ke\s+)?(bana\s*do|banao|banaiye|banaye|karo|bana|de\s*do|deh\s*do|bana\s*ke\s*deh?\s*do|bana\s*ke\s*do|bana\s*kar\s*do|design\s*kar\s*do|generate\s*karo)\b/i,
  /\b(ek|koi)\s+.*?\b(photo|image|picture|wallpaper|tasveer|chitra|logo|brand|emblem|monogram|badge|symbol|icon)\b.*?\b(bana\s*do|banao|banaiye|karo|bana|de\s*do|deh\s*do|bana\s*ke\s*deh?\s*do|bana\s*ke\s*do|bana\s*kar\s*do|design\s*kar\s*do|generate\s*karo)\b/i,
  /\b(iska|iski|unka)\s+(image|photo|picture|tasveer|logo)\s+(generate\s*karo|bana\s*do|banao)\b/i,
  // 3. Logo and brand creation phrases in English and Hindi/Hinglish
  /\b(brand|company|firm)\s+(ka\s+)?(naam|name)\b.*?\b(bana\s*ke\s*deh?\s*do|bana\s*ke\s*do|bana\s*kar\s*do|bana\s*do|banao|design\s*kar\s*do|design\s*karo|create|make)\b/i,
  /\b(ek\s+|koi\s+)?logo\s+bana\s*do\s+jiska\s+naam\b/i,
  /\b(logo|brand|emblem|monogram)\b.*?\b(bana\s*do|banao|banaiye|karo|bana|de\s*do|deh\s*do|bana\s*ke\s*deh?\s*do|bana\s*ke\s*do|design\s*karo|design\s*kar\s*do|create|generate)\b/i,
  /\b(create|make|design|generate|draw|craft)\s+(a|an)?\s+.*?\b(logo|brand\s+logo|emblem|monogram|badge|symbol|icon)\b/i,
  // 4. Visual subjects in Hindi/Hinglish (e.g. 'Mere liye ek anime astronaut banao', 'Ek futuristic car bana do')
  /\b(mere\s+liye\s+)?(ek|koi)\s+.*?\b(anime|astronaut|tiger|sher|car|gadi|sunset|mountain|neon|futuristic|cinematic|realistic|3d|robot|warrior|portrait|character|avatar|wallpaper|logo)\b.*?\b(bana\s*do|banao|banaiye|banaye|bana\s*de|bana\s*do|bana\s*ke\s*deh?\s*do|bana\s*ke\s*do)\b/i,
  // 5. Visual adjectives/styles in English creation requests (e.g. 'Create a realistic tiger...', 'Make an anime astronaut...', 'Generate a futuristic neon city...')
  /\b(generate|create|make|draw|paint|render|visualize|illustrate|design)\s+(a|an)?\s+.*?\b(realistic|photorealistic|anime|manga|cinematic|3d|3-d|cgi|neon|cyberpunk|futuristic|surreal|minimalist|modern|abstract|vintage|retro|watercolor|oil\s+painting|pixel\s+art|digital\s+art|glowing|steampunk|fantasy)\b/i,
  // 6. Inherent visual art verbs with scene or object (e.g. 'draw a cute cat', 'paint a sunset', 'visualize a cyberpunk street')
  /\b(draw|paint|sketch|render|visualize|illustrate)\s+(a|an|me\s+a|us\s+a)?\s+[a-z0-9\s]+/i,
  // 7. Explicit wallpaper requests (e.g. '9:16 phone wallpaper of...', 'Generate sunset mountain wallpaper')
  /\b(wallpaper|phone\s+wallpaper|mobile\s+wallpaper|desktop\s+wallpaper)\b/i,
];

export function detectImageIntent(userInput: string): ParsedImageRequest | null {
  const trimmed = userInput.trim();
  if (!trimmed) return null;

  const hasExplicitImageNoun = /\b(image|photo|picture|wallpaper|tasveer|chitra|drawing|portrait|artwork|illustration|painting|poster|pic|logo|brand|monogram|emblem|badge|symbol|icon)\b/i.test(trimmed);

  // Check exclusions unless user explicitly asked for an image/photo/picture
  for (const ex of NON_IMAGE_INDICATORS) {
    if (ex.test(trimmed) && !hasExplicitImageNoun) {
      return null;
    }
  }

  // Conversational questions like "Can you generate images?" or "Tum images bana sakte ho?" should be answered textually
  if (/^(can\s+you|kya\s+tum|do\s+you|are\s+you\s+able\s+to|tum)\s+.*?\b(generate|create|make|draw|bana\s*sakte|bana\s*sakti)\s+(images?|photos?|pictures?|wallpapers?)\s*(\?|$)/i.test(trimmed)) {
    return null;
  }

  const matchesIntent = IMAGE_INTENT_PATTERNS.some((pattern) => pattern.test(trimmed));
  if (!matchesIntent) {
    return null;
  }

  // 1. Detect Aspect Ratio
  let aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" = "1:1";
  const lower = trimmed.toLowerCase();

  if (
    lower.includes("16:9") ||
    lower.includes("landscape") ||
    lower.includes("horizontal") ||
    lower.includes("widescreen") ||
    lower.includes("desktop wallpaper") ||
    lower.includes("pc wallpaper")
  ) {
    aspectRatio = "16:9";
  } else if (
    lower.includes("9:16") ||
    lower.includes("phone wallpaper") ||
    lower.includes("mobile wallpaper") ||
    lower.includes("portrait") ||
    lower.includes("vertical") ||
    lower.includes("story") ||
    lower.includes("reel")
  ) {
    aspectRatio = "9:16";
  } else if (lower.includes("4:3")) {
    aspectRatio = "4:3";
  } else if (lower.includes("3:4")) {
    aspectRatio = "3:4";
  } else if (lower.includes("square") || lower.includes("1:1") || lower.includes("avatar") || lower.includes("dp")) {
    aspectRatio = "1:1";
  }

  // 2. Detect Style
  let style: "Photorealistic" | "Anime" | "3D Render" | "Cinematic" | "Digital Art" | "Minimalist" = "Photorealistic";
  if (lower.includes("logo") || lower.includes("brand") || lower.includes("emblem") || lower.includes("monogram") || lower.includes("minimalist") || lower.includes("clean vector") || lower.includes("flat")) {
    style = "Minimalist";
  } else if (lower.includes("anime") || lower.includes("manga") || lower.includes("ghibli")) {
    style = "Anime";
  } else if (
    lower.includes("cinematic") ||
    lower.includes("movie") ||
    lower.includes("film still") ||
    lower.includes("dramatic") ||
    lower.includes("neon") ||
    lower.includes("cyberpunk")
  ) {
    style = "Cinematic";
  } else if (lower.includes("3d") || lower.includes("3-d") || lower.includes("render") || lower.includes("cgi") || lower.includes("octane")) {
    style = "3D Render";
  } else if (lower.includes("digital art") || lower.includes("concept art") || lower.includes("fantasy art") || lower.includes("illustration")) {
    style = "Digital Art";
  } else if (lower.includes("realistic") || lower.includes("photorealistic") || lower.includes("photo") || lower.includes("real") || lower.includes("8k") || lower.includes("dslr")) {
    style = "Photorealistic";
  }

  // 3. Extract core image prompt by removing trigger prefixes/suffixes
  let cleanPrompt = trimmed;

  // Handle specific brand/logo requests
  if (/brand\s+(ka\s+)?(naam|name)\s+(.+?)\s+(bana\s*(ke\s*)?(deh?\s*do|do|de)|karo)/i.test(trimmed)) {
    const match = trimmed.match(/brand\s+(ka\s+)?(naam|name)\s+(.+?)\s+(bana\s*(ke\s*)?(deh?\s*do|do|de)|karo)/i);
    if (match && match[3]) {
      const brandText = match[3].replace(/aur/gi, "and").trim();
      cleanPrompt = `Modern logo with the text ${brandText}`;
    }
  } else if (/(ek\s+|koi\s+)?logo\s+bana\s*do\s+jiska\s+naam\s+(.+?)(\s+ho)?$/i.test(trimmed)) {
    const match = trimmed.match(/(ek\s+|koi\s+)?logo\s+bana\s*do\s+jiska\s+naam\s+(.+?)(\s+ho)?$/i);
    if (match && match[2]) {
      const brandText = match[2].replace(/\s+ho$/, "").replace(/aur/gi, "and").trim();
      cleanPrompt = `Modern logo with the text ${brandText}`;
    }
  } else {
    cleanPrompt = trimmed
      .replace(/[.!?]+$/, "")
      // English trigger prefixes
      .replace(
        /^(please\s+)?(can\s+you\s+)?(generate|create|make\s+me|make|draw|paint|render|visualize|illustrate)\s+(an?\s+)?(image|photo|picture|wallpaper|artwork|portrait|illustration)?\s*(of|with|showing|depicting)?\s*/i,
        ""
      )
      // Hindi/Hinglish trigger prefixes
      .replace(/^(mere\s+liye\s+)?(ek\s+|koi\s+)?/i, "")
      // Hindi/Hinglish trigger suffixes
      .replace(
        /\s+(ki\s+|ka\s+)?(photo|image|picture|wallpaper|tasveer)\s+(bana\s*do|banao|banaiye|banaye|karo|bana|de\s*do|deh\s*do|bana\s*ke\s*deh?\s*do|bana\s*ke\s*do|generate\s*karo|create\s*karo)$/i,
        ""
      )
      .replace(/\s+(bana\s*do|banao|banaiye|banaye|bana\s*de|bana|bana\s*ke\s*deh?\s*do|bana\s*ke\s*do)$/i, "")
      // Remove inline aspect ratio phrasing from prompt
      .replace(/\b(in\s+)?(16:9|9:16|4:3|3:4|1:1)\s*(aspect\s+ratio|ratio|wallpaper)?\b/gi, "")
      .trim();
  }

  // If cleaning stripped away everything (e.g. user literally just typed "Photo bana do" or "generate image")
  if (!cleanPrompt || cleanPrompt.length < 3) {
    cleanPrompt = trimmed;
  }

  // Ensure first character is capitalized
  cleanPrompt = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1);

  return {
    isImageRequest: true,
    prompt: cleanPrompt,
    aspectRatio,
    style,
  };
}
