/**
 * MEYRA AI Art Synthesizer
 * Generates prompt-tailored, stylized artistic visual compositions
 * in vector SVG format (data:image/svg+xml;base64) using Gemini and
 * algorithmic visual synthesis.
 */

const CLOUD_RUN_BACKEND = "https://meyra-ai-804674901589.asia-southeast1.run.app";

export interface SynthesizerOptions {
  prompt: string;
  aspectRatio?: string;
  style?: string;
}

interface Dimensions {
  width: number;
  height: number;
}

function getDimensions(aspectRatio?: string): Dimensions {
  switch (aspectRatio) {
    case "16:9":
      return { width: 1280, height: 720 };
    case "4:3":
      return { width: 1024, height: 768 };
    case "9:16":
      return { width: 720, height: 1280 };
    case "1:1":
    default:
      return { width: 1024, height: 1024 };
  }
}

function getStyleDescription(style?: string): string {
  const s = String(style || "default").toLowerCase();
  if (s.includes("photo") || s.includes("8k") || s.includes("realistic")) {
    return "Ultra-detailed photographic style, realistic lighting, shadows, atmospheric depth, 8k resolution look";
  }
  if (s.includes("anime") || s.includes("manga")) {
    return "Japanese anime illustration, vibrant cell shading, dynamic outlines, colorful aesthetic";
  }
  if (s.includes("3d") || s.includes("render")) {
    return "3D rendered style, volumetric ray-tracing, specular glossy highlights, tactile depth, ambient occlusion";
  }
  if (s.includes("cinematic") || s.includes("movie")) {
    return "Cinematic widescreen composition, dramatic rim lighting, filmic color grading, deep atmospheric perspective";
  }
  if (s.includes("minimal")) {
    return "Minimalist vector art, clean elegant silhouettes, disciplined harmonious color palette, negative space";
  }
  return "Modern digital concept art, vibrant harmonious colors, detailed foreground and background layers";
}

function cleanSvg(raw: string, width: number, height: number): string {
  let text = raw.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
  const start = text.indexOf("<svg");
  const end = text.lastIndexOf("</svg>");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 6);
  }

  // Ensure xmlns and viewBox
  if (!text.includes("xmlns=")) {
    text = text.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!text.includes("viewBox=")) {
    text = text.replace("<svg", `<svg viewBox="0 0 ${width} ${height}"`);
  }

  // Ensure width and height attributes exist or match
  if (!text.includes("width=")) {
    text = text.replace("<svg", `<svg width="${width}"`);
  }
  if (!text.includes("height=")) {
    text = text.replace("<svg", `<svg height="${height}"`);
  }

  return text;
}

/**
 * Generate artwork using the primary Cloud Run image generation service.
 */
async function generateWithCloudRunImageApi(
  prompt: string,
  style: string,
  aspectRatio: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(`${CLOUD_RUN_BACKEND}/api/image/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        style,
      }),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json();
      const url = data.imageUrl || data.image?.imageUrl;
      if (typeof url === "string" && url.startsWith("data:image/")) {
        return url;
      }
    }
  } catch (err: any) {
    console.warn("[Art Synthesizer] Cloud Run image API call failed or timed out:", err?.message || err);
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}

/**
 * Generate artwork using Gemini via the connected Cloud Run backend.
 */
async function generateWithGemini(
  prompt: string,
  style: string,
  width: number,
  height: number
): Promise<string> {
  const styleDesc = getStyleDescription(style);
  const isLogoRequest = /logo|brand|monogram|emblem|badge|symbol|icon/i.test(prompt);

  const systemPrompt = `You are a master digital illustrator, concept artist, and vector designer.
Your task is to generate a complete, standalone, rich SVG artwork directly depicting the subject, scenery, characters, mood, and composition specified in the prompt.
Dimensions: width="${width}" height="${height}" viewBox="0 0 ${width} ${height}".
Style guidance: ${styleDesc}.

CRITICAL REQUIREMENTS:
- Create real, recognizable visual elements (e.g. characters, animals, vehicles, plants, mountains, skies, structures, or objects matching the user's prompt).
- Use rich defs: linearGradient, radialGradient, drop-shadow filters, or glow effects.
- Render multiple layers: detailed background, middle-ground environment, and clear focal subject.
${
  isLogoRequest
    ? "- The user requested a logo/brand design. If specific brand names, acronyms, or initials (such as APEX, HM, etc.) are in the prompt, render them prominently and elegantly using styled SVG <text> elements with clean typography, alongside a modern vector emblem or monogram motif."
    : "- DO NOT generate any placeholder badges, text labels, logos, watermarks, or 'MEYRA' labels."
}
- Output ONLY the standalone <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"> ... </svg> code.
- Absolutely NO markdown code fences, NO explanatory text before or after.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000);

  try {
    const res = await fetch(`${CLOUD_RUN_BACKEND}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Subject: "${prompt}". Style: ${style}. Canvas size: ${width}x${height}. Please output the raw SVG element illustrating this subject.`,
          },
        ],
        systemPrompt,
        stream: false,
        temperature: 0.6,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Gemini backend returned status ${res.status}`);
    }

    const data = await res.json();
    const content = data.content || "";
    const cleaned = cleanSvg(content, width, height);

    if (cleaned.startsWith("<svg") && cleaned.includes("</svg>")) {
      const base64 = Buffer.from(cleaned).toString("base64");
      return `data:image/svg+xml;base64,${base64}`;
    }

    throw new Error("Invalid SVG received from backend");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Algorithmic fallback: Creates a multi-layered procedural SVG specifically
 * tailored to the words and style of the prompt when external networks are offline.
 */
function generateProceduralFallback(
  prompt: string,
  style: string,
  width: number,
  height: number
): string {
  const p = prompt.toLowerCase();
  let seed = 0;
  for (let i = 0; i < prompt.length; i++) {
    seed = (seed * 31 + prompt.charCodeAt(i)) >>> 0;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Determine colors based on prompt semantics
  let bg1 = "#0f172a";
  let bg2 = "#020617";
  let accent1 = "#38bdf8";
  let accent2 = "#818cf8";
  let accent3 = "#c084fc";

  // Special procedural rendering for logos, brand monograms, and emblems
  if (/logo|brand|monogram|emblem|badge|symbol|icon/i.test(p)) {
    // Extract potential brand texts
    const words = prompt.match(/\b[A-Z0-9]{2,}\b/g) || [];
    const brandPrimary = words[0] || "APEX";
    const brandSecondary = words[1] || (words[0] !== "HM" && prompt.includes("HM") ? "HM" : "");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Dark Premium Canvas -->
  <rect width="${width}" height="${height}" fill="url(#logoBg)" rx="16" />

  <!-- Outer Geometric Ring -->
  <circle cx="${width * 0.5}" cy="${height * 0.42}" r="${width * 0.26}" fill="none" stroke="url(#primaryGrad)" stroke-width="4" stroke-dasharray="8 6" opacity="0.6" />
  <circle cx="${width * 0.5}" cy="${height * 0.42}" r="${width * 0.22}" fill="#111827" stroke="url(#primaryGrad)" stroke-width="3" filter="url(#logoGlow)" />

  <!-- Monogram Iconography -->
  <g transform="translate(${width * 0.5}, ${height * 0.42})">
    <path d="M-60 40 L0 -65 L60 40 L25 40 L0 -15 L-25 40 Z" fill="url(#goldGrad)" />
    <path d="M-25 15 L25 15 L15 -5 L-15 -5 Z" fill="#ffffff" opacity="0.9" />
    <circle cx="0" cy="-75" r="10" fill="#38bdf8" filter="url(#logoGlow)" />
  </g>

  <!-- Brand Typography -->
  <text x="${width * 0.5}" y="${height * 0.76}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(width * 0.07)}" font-weight="900" letter-spacing="8" fill="#ffffff">
    ${brandPrimary}
  </text>
  ${
    brandSecondary
      ? `<text x="${width * 0.5}" y="${height * 0.85}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(width * 0.038)}" font-weight="700" letter-spacing="12" fill="url(#goldGrad)">
    ${brandSecondary}
  </text>`
      : `<text x="${width * 0.5}" y="${height * 0.84}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(width * 0.026)}" font-weight="600" letter-spacing="6" fill="#94a3b8">
    PREMIUM IDENTITY
  </text>`
  }
</svg>`;

    const base64 = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  }

  if (/car|vehicle|racing|speed|motor|ferrari|porsche/i.test(p)) {
    bg1 = "#1c1917";
    bg2 = "#0c0a09";
    accent1 = "#ef4444";
    accent2 = "#f97316";
    accent3 = "#eab308";
  } else if (/nature|forest|tree|mountain|leaf|garden|flower|green|river/i.test(p)) {
    bg1 = "#064e3b";
    bg2 = "#022c22";
    accent1 = "#10b981";
    accent2 = "#34d399";
    accent3 = "#f59e0b";
  } else if (/sunset|sunrise|dusk|dawn|beach|ocean|sea/i.test(p)) {
    bg1 = "#4c0519";
    bg2 = "#1e1b4b";
    accent1 = "#f43f5e";
    accent2 = "#fb923c";
    accent3 = "#fde047";
  } else if (/anime|girl|boy|character|portrait|cute|pink/i.test(p)) {
    bg1 = "#3b0764";
    bg2 = "#18022e";
    accent1 = "#ec4899";
    accent2 = "#f472b6";
    accent3 = "#a855f7";
  } else if (/space|galaxy|star|planet|cosmos|nebula/i.test(p)) {
    bg1 = "#170f38";
    bg2 = "#050212";
    accent1 = "#8b5cf6";
    accent2 = "#3b82f6";
    accent3 = "#06b6d4";
  }

  // Draw procedural scene layers
  const stars: string[] = [];
  for (let i = 0; i < 40; i++) {
    const cx = Math.round(rand() * width);
    const cy = Math.round(rand() * (height * 0.65));
    const r = (rand() * 2 + 0.8).toFixed(1);
    const op = (rand() * 0.7 + 0.3).toFixed(2);
    stars.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent3}" opacity="${op}" />`);
  }

  const horizonY = Math.round(height * 0.62);
  const sunRadius = Math.round(Math.min(width, height) * 0.16);
  const sunX = Math.round(width * (0.35 + rand() * 0.3));
  const sunY = Math.round(horizonY - sunRadius * 0.6);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${bg1}" />
      <stop offset="100%" stop-color="${bg2}" />
    </linearGradient>
    <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accent3}" stop-opacity="1" />
      <stop offset="70%" stop-color="${accent2}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${accent1}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${accent2}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="${bg2}" stop-opacity="0.95" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Sky Canvas -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Particle / Star field -->
  ${stars.join("\n  ")}

  <!-- Celestial Glow / Sun -->
  <circle cx="${sunX}" cy="${sunY}" r="${sunRadius}" fill="url(#sunGrad)" filter="url(#glow)" />

  <!-- Mountainous / Environmental Ridges -->
  <path d="M0 ${horizonY + 30} Q${width * 0.25} ${horizonY - 80} ${width * 0.5} ${horizonY - 20} T${width} ${horizonY - 60} L${width} ${height} L0 ${height} Z" fill="url(#mountainGrad)" />
  <path d="M0 ${horizonY + 80} Q${width * 0.35} ${horizonY + 20} ${width * 0.7} ${horizonY + 50} T${width} ${horizonY + 20} L${width} ${height} L0 ${height} Z" fill="${bg2}" opacity="0.9" />

  <!-- Focal Dynamic Motif -->
  <g transform="translate(${width * 0.5}, ${horizonY}) scale(${Math.min(width, height) / 1000})">
    <ellipse cx="0" cy="40" rx="160" ry="16" fill="${accent1}" opacity="0.4" filter="url(#glow)" />
    <path d="M-120 20 L0 -90 L120 20 L40 30 L0 -20 L-40 30 Z" fill="${accent1}" filter="url(#glow)" opacity="0.9" />
    <circle cx="0" cy="-30" r="28" fill="${accent3}" />
  </g>
</svg>`;

  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Main synthesis entry point.
 */
export async function generateSynthesizedArtwork(
  options: SynthesizerOptions
): Promise<string> {
  const { prompt, aspectRatio = "1:1", style = "default" } = options;
  const { width, height } = getDimensions(aspectRatio);

  // 1. Try dedicated Cloud Run Image Generation API
  try {
    const cloudRunImage = await generateWithCloudRunImageApi(prompt, style, aspectRatio);
    if (cloudRunImage) {
      return cloudRunImage;
    }
  } catch (err: any) {
    console.warn("[Art Synthesizer] Cloud Run image API attempt error:", err?.message || err);
  }

  // 2. Try Gemini SVG generation
  try {
    const artworkUrl = await generateWithGemini(prompt, style, width, height);
    return artworkUrl;
  } catch (err: any) {
    console.warn("[Art Synthesizer] Gemini SVG generation error:", err?.message || err);
    console.log("[Art Synthesizer] Falling back to procedural vector synthesis for prompt:", prompt);
    return generateProceduralFallback(prompt, style, width, height);
  }
}
