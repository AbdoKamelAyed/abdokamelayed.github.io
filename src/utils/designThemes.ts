import type { Lang } from "../types/hub";
import { loc } from "./i18n";

export type DesignThemeCategory = "editorial" | "minimal" | "technical" | "expressive";
export type CanvasPatternKind = "none" | "blueprint-grid" | "dot-matrix" | "warm-rule" | "radial-glow";

export interface DesignThemeDefinition {
  id: string;
  order: number;
  category: DesignThemeCategory;
  polarity: "light" | "dark";
  glassRecommended: boolean;
  name: { en: string; ar: string };
  directionTagline: { en: string; ar: string };
  directionGuide: { en: string; ar: string };
  idealFor: { en: string; ar: string };
  fonts: {
    display: string;
    body: string;
    mono: string;
    label: string;
  };
  geometry: {
    cardRadius: string;
    controlRadius: string;
    borderWidth: string;
    cardShadow: string;
    styleLabel: { en: string; ar: string };
  };
  canvasPattern: CanvasPatternKind;
  tokens: {
    bg: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    secondary: string;
    glassSurface: string;
    glassElevated: string;
  };
}

export const DESIGN_THEMES: DesignThemeDefinition[] = [
  {
    id: "swiss-studio",
    order: 1,
    category: "minimal",
    polarity: "light",
    glassRecommended: false,
    name: { en: "Swiss Studio Daylight", ar: "استوديو سويسري نهاري" },
    directionTagline: {
      en: "Optical white canvas · Crisp slate grid · Cobalt precision",
      ar: "خلفية بيضاء نقية · شبكة دقيقة · لمسات زرقاء هندسية",
    },
    directionGuide: {
      en: "Grounded in International Typographic Style: balanced whitespace, crisp 1px slate hairlines, geometric sans headings, and zero ornamental clutter.",
      ar: "مستوحى من المدرسة السويسرية: مساحات بيضاء متوازنة، خطوط حدود رفيعة، وعناوين هندسية خالية من الزخرفة الزائدة.",
    },
    idealFor: { en: "Portfolios & System Docs", ar: "معارض الأعمال والوثائق" },
    fonts: {
      display: '"Bricolage Grotesque", "Plus Jakarta Sans", system-ui, sans-serif',
      body: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      label: "Bricolage Grotesque + Plus Jakarta Sans",
    },
    geometry: {
      cardRadius: "14px",
      controlRadius: "8px",
      borderWidth: "1px",
      cardShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      styleLabel: { en: "Crisp 14px", ar: "حواف 14px" },
    },
    canvasPattern: "none",
    tokens: {
      bg: "#ffffff",
      surface: "#f8fafc",
      surfaceElevated: "#ffffff",
      border: "#e2e8f0",
      text: "#0f172a",
      textMuted: "#475569",
      primary: "#0f172a",
      secondary: "#2563eb",
      glassSurface: "rgba(248, 250, 252, 0.78)",
      glassElevated: "rgba(255, 255, 255, 0.8)",
    },
  },
  {
    id: "oxford-broadsheet",
    order: 2,
    category: "editorial",
    polarity: "light",
    glassRecommended: false,
    name: { en: "Oxford Warm Broadsheet", ar: "صحيفة أكسفورد الكلاسيكية" },
    directionTagline: {
      en: "Warm travertine paper · Classic editorial serif · Deep oxblood ink",
      ar: "ورق دافئ · خطوط تحريرية كلاسيكية · حبر عنابي عميق",
    },
    directionGuide: {
      en: "High-trust long-form publication layout inspired by literary journals and university presses, pairing high-contrast serif headlines with comfortable reading measure.",
      ar: "تصميم نشر صحفي عريق للمقالات الطويلة يجمع بين العناوين الكلاسيكية والتباين المريح للقراءة.",
    },
    idealFor: { en: "Essays & Journal Issues", ar: "المقالات وأعداد المجلة" },
    fonts: {
      display: '"Playfair Display", Georgia, serif',
      body: '"Source Serif 4", Georgia, serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
      label: "Playfair Display + Source Serif 4",
    },
    geometry: {
      cardRadius: "4px",
      controlRadius: "4px",
      borderWidth: "1px",
      cardShadow: "0 2px 6px rgba(41, 31, 20, 0.05)",
      styleLabel: { en: "Editorial 4px", ar: "تحريري 4px" },
    },
    canvasPattern: "warm-rule",
    tokens: {
      bg: "#faf7f2",
      surface: "#f2ece1",
      surfaceElevated: "#fffdf9",
      border: "#ddd3c2",
      text: "#1c1917",
      textMuted: "#57534e",
      primary: "#291d19",
      secondary: "#9f1239",
      glassSurface: "rgba(242, 236, 225, 0.82)",
      glassElevated: "rgba(255, 253, 249, 0.85)",
    },
  },
  {
    id: "architect-blueprint",
    order: 3,
    category: "technical",
    polarity: "light",
    glassRecommended: false,
    name: { en: "Architect Technical Blueprint", ar: "مخطط معماري تقني" },
    directionTagline: {
      en: "Drafting grid paper · Precision Archivo sans · Cobalt CAD rules",
      ar: "ورق رسم هندسي · خطوط تقنية صارمة · شبكات زرقاء",
    },
    directionGuide: {
      en: "An engineering drafting-table aesthetic with faint coordinate gridlines, crisp 6px plates, flat border contrast, and technical IBM Plex Mono metadata.",
      ar: "هوية هندسية تحاكي طاولة الرسم المعماري مع خلفية شبكية خفيفة وخطوط برمجية دقيقة.",
    },
    idealFor: { en: "Architecture & GitHub Lab", ar: "الهندسة وتحليلات الكود" },
    fonts: {
      display: '"Archivo", system-ui, sans-serif',
      body: '"Public Sans", system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
      label: "Archivo + Public Sans + IBM Plex Mono",
    },
    geometry: {
      cardRadius: "6px",
      controlRadius: "4px",
      borderWidth: "1px",
      cardShadow: "none",
      styleLabel: { en: "CAD 6px", ar: "هندسي 6px" },
    },
    canvasPattern: "blueprint-grid",
    tokens: {
      bg: "#f4f7fb",
      surface: "#e9eff7",
      surfaceElevated: "#ffffff",
      border: "#c7d6ea",
      text: "#0b192e",
      textMuted: "#3b5272",
      primary: "#0f294a",
      secondary: "#1d4ed8",
      glassSurface: "rgba(233, 239, 247, 0.8)",
      glassElevated: "rgba(255, 255, 255, 0.85)",
    },
  },
  {
    id: "nordic-linen",
    order: 4,
    category: "minimal",
    polarity: "light",
    glassRecommended: true,
    name: { en: "Nordic Linen & Pine", ar: "كتان إسكندنافي وصنوبر" },
    directionTagline: {
      en: "Mist stone surface · Soft rounded calm · Botanical pine accent",
      ar: "ألوان حجرية هادئة · حواف ناعمة · أخضر صنوبري",
    },
    directionGuide: {
      en: "Scandinavian daylight calm with generous 20px card radii, low-glare warm grey-green canvas, and restorative deep forest accents.",
      ar: "بساطة إسكندنافية مريحة للعين بزوايا دائرية رحبة وتدرجات رملية ناعمة.",
    },
    idealFor: { en: "Knowledge Base & Profiles", ar: "قاعدة المعرفة والملف الشخصي" },
    fonts: {
      display: '"Outfit", system-ui, sans-serif',
      body: '"Plus Jakarta Sans", system-ui, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      label: "Outfit + Plus Jakarta Sans",
    },
    geometry: {
      cardRadius: "20px",
      controlRadius: "12px",
      borderWidth: "1px",
      cardShadow: "0 4px 18px rgba(17, 34, 28, 0.05)",
      styleLabel: { en: "Soft 20px", ar: "ناعم 20px" },
    },
    canvasPattern: "none",
    tokens: {
      bg: "#f5f6f4",
      surface: "#ebeee9",
      surfaceElevated: "#fbfcfa",
      border: "#d6dcd3",
      text: "#16201c",
      textMuted: "#4a5951",
      primary: "#1b3b30",
      secondary: "#1f6f54",
      glassSurface: "rgba(235, 238, 233, 0.78)",
      glassElevated: "rgba(251, 252, 250, 0.82)",
    },
  },
  {
    id: "kyoto-washi",
    order: 5,
    category: "editorial",
    polarity: "light",
    glassRecommended: false,
    name: { en: "Kyoto Washi & Vermilion", ar: "ورق كيوتو والحبر القرمزي" },
    directionTagline: {
      en: "Unbleached ivory grain · Expressive Fraunces serif · Sumi-e crimson",
      ar: "ورق عاجي طبيعي · حروف أدبية مميزة · ختام قرمزي",
    },
    directionGuide: {
      en: "Inspired by Japanese editorial printmaking: organic ivory parchment paired with sculpted Fraunces headings and restrained terracotta ink focal points.",
      ar: "مستلهم من الطباعة اليابانية الهادئة، يمزج بين الورق العاجي الدافئ وعناوين ذات طابع نحتي.",
    },
    idealFor: { en: "Reflective Essays & Craft", ar: "المقالات التأملية والإبداع" },
    fonts: {
      display: '"Fraunces", Georgia, serif',
      body: '"Lora", Georgia, serif',
      mono: '"Space Mono", ui-monospace, monospace',
      label: "Fraunces + Lora + Space Mono",
    },
    geometry: {
      cardRadius: "10px",
      controlRadius: "6px",
      borderWidth: "1px",
      cardShadow: "0 2px 10px rgba(45, 32, 22, 0.05)",
      styleLabel: { en: "Washi 10px", ar: "ورقي 10px" },
    },
    canvasPattern: "warm-rule",
    tokens: {
      bg: "#fbf9f4",
      surface: "#f3efe6",
      surfaceElevated: "#ffffff",
      border: "#e3dbcc",
      text: "#211c17",
      textMuted: "#61574b",
      primary: "#2a2018",
      secondary: "#b83b28",
      glassSurface: "rgba(243, 239, 230, 0.8)",
      glassElevated: "rgba(255, 255, 255, 0.85)",
    },
  },
  {
    id: "brutalist-poster",
    order: 6,
    category: "expressive",
    polarity: "light",
    glassRecommended: false,
    name: { en: "Kinetic Swiss Poster", ar: "ملصق سويسري جريء" },
    directionTagline: {
      en: "Stark chalk contrast · 0px razor geometry · International red",
      ar: "تباين حاد · زوايا 0px صلبة · أحمر دولي جريء",
    },
    directionGuide: {
      en: "High-impact Bauhaus and modernist poster aesthetic: condensed Oswald headlines, strict 0px sharp right angles, heavy structural framing, and vibrant vermilion action accents.",
      ar: "طابع باوهاوس والملصقات الجرافيكية الحادة: زوايا قائمة 0px وإطارات واضحة مع حضور قوي للعناوين.",
    },
    idealFor: { en: "Launch Showcases & Editions", ar: "المعارض وإطلاق المشاريع" },
    fonts: {
      display: '"Oswald", "Archivo", sans-serif',
      body: '"DM Sans", system-ui, sans-serif',
      mono: '"Space Mono", ui-monospace, monospace',
      label: "Oswald + DM Sans + Space Mono",
    },
    geometry: {
      cardRadius: "0px",
      controlRadius: "0px",
      borderWidth: "1.5px",
      cardShadow: "4px 4px 0px rgba(17, 17, 17, 0.9)",
      styleLabel: { en: "Sharp 0px", ar: "حاد 0px" },
    },
    canvasPattern: "dot-matrix",
    tokens: {
      bg: "#ffffff",
      surface: "#f4f4f5",
      surfaceElevated: "#ffffff",
      border: "#18181b",
      text: "#09090b",
      textMuted: "#3f3f46",
      primary: "#09090b",
      secondary: "#dc2626",
      glassSurface: "rgba(244, 244, 245, 0.9)",
      glassElevated: "rgba(255, 255, 255, 0.94)",
    },
  },
  {
    id: "coastal-alabaster",
    order: 7,
    category: "minimal",
    polarity: "light",
    glassRecommended: true,
    name: { en: "Coastal Slate & Brass", ar: "ساحلي أردوازي ونحاسي" },
    directionTagline: {
      en: "Alabaster harbour tone · Urbanist geometric · Burnished amber",
      ar: "أبيض أردوازي ناعم · خطوط هندسية معاصرة · عنبر دافئ",
    },
    directionGuide: {
      en: "Architectural maritime palette pairing cool sea-slate ink with soft alabaster cards and warm nautical brass accents.",
      ar: "توليفة بحرية هادئة تمزج بين الأزرق الأردوازي الرصين ولمسات النحاس الدافئ.",
    },
    idealFor: { en: "Product Engineering & Work", ar: "المنتجات والخبرة المهنية" },
    fonts: {
      display: '"Urbanist", system-ui, sans-serif',
      body: '"Manrope", system-ui, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      label: "Urbanist + Manrope",
    },
    geometry: {
      cardRadius: "16px",
      controlRadius: "10px",
      borderWidth: "1px",
      cardShadow: "0 6px 20px rgba(15, 39, 68, 0.05)",
      styleLabel: { en: "Smooth 16px", ar: "انسيابي 16px" },
    },
    canvasPattern: "radial-glow",
    tokens: {
      bg: "#f7f9fc",
      surface: "#edf2f8",
      surfaceElevated: "#ffffff",
      border: "#d3deeb",
      text: "#0f2238",
      textMuted: "#475c75",
      primary: "#132c47",
      secondary: "#b45309",
      glassSurface: "rgba(237, 242, 248, 0.78)",
      glassElevated: "rgba(255, 255, 255, 0.82)",
    },
  },
  {
    id: "sandstone-archive",
    order: 8,
    category: "editorial",
    polarity: "light",
    glassRecommended: false,
    name: { en: "Museum Archival Monograph", ar: "أرشيف المتحف الحجري" },
    directionTagline: {
      en: "Limestone plaque canvas · Cormorant serif · Antique bronze",
      ar: "ورق حجري دافئ · خطوط كورمورانت الفنية · برونز أثري",
    },
    directionGuide: {
      en: "Curated gallery monograph aesthetic inspired by architecture exhibitions: refined limestone warmth, tall high-contrast serifs, and museum plaque spacing.",
      ar: "طابع الكتالوجات المتحفية والمعارض المعمارية مع ألوان الحجر الرملي الراقية.",
    },
    idealFor: { en: "Collections & Case Studies", ar: "المجموعات ودراسات الحالة" },
    fonts: {
      display: '"Cormorant Garamond", Georgia, serif',
      body: '"Source Serif 4", Georgia, serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
      label: "Cormorant Garamond + Source Serif 4",
    },
    geometry: {
      cardRadius: "8px",
      controlRadius: "6px",
      borderWidth: "1px",
      cardShadow: "0 2px 12px rgba(68, 52, 34, 0.06)",
      styleLabel: { en: "Plaque 8px", ar: "لوحي 8px" },
    },
    canvasPattern: "none",
    tokens: {
      bg: "#f3efe8",
      surface: "#e9e3d8",
      surfaceElevated: "#fcfaf6",
      border: "#d5cbb8",
      text: "#231e18",
      textMuted: "#5e5446",
      primary: "#382c1e",
      secondary: "#854d0e",
      glassSurface: "rgba(233, 227, 216, 0.8)",
      glassElevated: "rgba(252, 250, 246, 0.84)",
    },
  },
  {
    id: "obsidian-terminal",
    order: 9,
    category: "technical",
    polarity: "dark",
    glassRecommended: true,
    name: { en: "Obsidian Developer Studio", ar: "استوديو المطور الداكن" },
    directionTagline: {
      en: "Deep carbon slate · Matrix dot surface · Electric precision blue",
      ar: "كربون ليلي عميق · شبكة نقطية · أزرق هندسي ساطع",
    },
    directionGuide: {
      en: "Focused nocturnal workstation built for prolonged code reading: low-glare obsidian surfaces, subtle coordinate dot-matrix, and razor cobalt affordances.",
      ar: "بيئة عمل ليلية مركزة لقراءة الكود والتحليلات بدون إجهاد بصري مع خلفية نقطية خافتة.",
    },
    idealFor: { en: "Code Viewers & Dashboards", ar: "عارض الكود ولوحة التحكم" },
    fonts: {
      display: '"Bricolage Grotesque", system-ui, sans-serif',
      body: '"Plus Jakarta Sans", system-ui, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      label: "Bricolage Grotesque + JetBrains Mono",
    },
    geometry: {
      cardRadius: "10px",
      controlRadius: "6px",
      borderWidth: "1px",
      cardShadow: "0 6px 24px rgba(0, 0, 0, 0.45)",
      styleLabel: { en: "Terminal 10px", ar: "برمجي 10px" },
    },
    canvasPattern: "dot-matrix",
    tokens: {
      bg: "#090d14",
      surface: "#101622",
      surfaceElevated: "#151d2c",
      border: "#253147",
      text: "#f1f5f9",
      textMuted: "#94a3b8",
      primary: "#f8fafc",
      secondary: "#3b82f6",
      glassSurface: "rgba(16, 22, 34, 0.78)",
      glassElevated: "rgba(21, 29, 44, 0.82)",
    },
  },
  {
    id: "midnight-editorial",
    order: 10,
    category: "editorial",
    polarity: "dark",
    glassRecommended: true,
    name: { en: "Midnight Editorial Salon", ar: "الصالون الأدبي الليلي" },
    directionTagline: {
      en: "Velvet charcoal · Sculpted Fraunces serif · Burnished amber gold",
      ar: "فحم مخملي · خطوط أدبية فاخرة · ذهب عنبري دافئ",
    },
    directionGuide: {
      en: "Nocturnal luxury publication direction pairing velvet graphite backgrounds with editorial serifs and understated amber gold accents—zero harsh contrast glare.",
      ar: "إصدار مسائي فاخر يجمع بين الخلفية الداكنة الدافئة والذهب الهادئ لتجربة قراءة أدبية راقية.",
    },
    idealFor: { en: "Night Reading & Monographs", ar: "القراءة الليلية والكتب" },
    fonts: {
      display: '"Fraunces", Georgia, serif',
      body: '"Plus Jakarta Sans", system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
      label: "Fraunces + Plus Jakarta Sans",
    },
    geometry: {
      cardRadius: "14px",
      controlRadius: "8px",
      borderWidth: "1px",
      cardShadow: "0 8px 28px rgba(0, 0, 0, 0.42)",
      styleLabel: { en: "Salon 14px", ar: "أنيق 14px" },
    },
    canvasPattern: "radial-glow",
    tokens: {
      bg: "#101116",
      surface: "#171920",
      surfaceElevated: "#1e2029",
      border: "#2f3342",
      text: "#f4f1ea",
      textMuted: "#a8a29e",
      primary: "#fef3c7",
      secondary: "#f59e0b",
      glassSurface: "rgba(23, 25, 32, 0.78)",
      glassElevated: "rgba(30, 32, 41, 0.82)",
    },
  },
  {
    id: "carbon-industrial",
    order: 11,
    category: "technical",
    polarity: "dark",
    glassRecommended: false,
    name: { en: "Carbon Aerospace Telemetry", ar: "لوحة قياس كربونية" },
    directionTagline: {
      en: "Anodized gunmetal · Telemetry Oswald · Signal emerald",
      ar: "معدن مؤكسد داكن · خطوط قياس هندسية · أخضر إشارة",
    },
    directionGuide: {
      en: "Precision mission-control console aesthetic with crisp 4px metallic plates, subtle blueprint lines, tabular numbers, and emerald instrument status signals.",
      ar: "تصميم مستوحى من غرف التحكم الفضائية بأطر دقيقة ومؤشرات أرقام واضحة ولمسات زمردية.",
    },
    idealFor: { en: "Metrics, Commits & Releases", ar: "الإحصائيات والإصدارات" },
    fonts: {
      display: '"Oswald", "Archivo", sans-serif',
      body: '"Manrope", system-ui, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      label: "Oswald + Manrope + JetBrains Mono",
    },
    geometry: {
      cardRadius: "4px",
      controlRadius: "4px",
      borderWidth: "1px",
      cardShadow: "0 2px 12px rgba(0, 0, 0, 0.4)",
      styleLabel: { en: "Chamfer 4px", ar: "تقني 4px" },
    },
    canvasPattern: "blueprint-grid",
    tokens: {
      bg: "#0b0f13",
      surface: "#121820",
      surfaceElevated: "#17202b",
      border: "#263445",
      text: "#ecfdf5",
      textMuted: "#94a3b8",
      primary: "#e2e8f0",
      secondary: "#10b981",
      glassSurface: "rgba(18, 24, 32, 0.84)",
      glassElevated: "rgba(23, 32, 43, 0.88)",
    },
  },
  {
    id: "deep-abyss",
    order: 12,
    category: "expressive",
    polarity: "dark",
    glassRecommended: true,
    name: { en: "Deep Ocean Trench", ar: "أعماق المحيط الهادئ" },
    directionTagline: {
      en: "Nocturnal trench navy · Frosted sapphire glass · Sky cerulean",
      ar: "كحلي الأعماق · شفافية زجاجية · سماوي بحري نقي",
    },
    directionGuide: {
      en: "Layered deep-sea glassmorphic direction featuring sapphire ambient depth, translucent surface panels, and luminous ice-blue highlights.",
      ar: "اتجاه بصري غني بطبقات زجاجية زرقاء داكنة وإضاءة سماوية هادئة.",
    },
    idealFor: { en: "Media Galleries & Showcase", ar: "معرض الوسائط والعروض" },
    fonts: {
      display: '"Urbanist", system-ui, sans-serif',
      body: '"DM Sans", system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
      label: "Urbanist + DM Sans",
    },
    geometry: {
      cardRadius: "18px",
      controlRadius: "10px",
      borderWidth: "1px",
      cardShadow: "0 10px 30px rgba(2, 10, 24, 0.55)",
      styleLabel: { en: "Frosted 18px", ar: "زجاجي 18px" },
    },
    canvasPattern: "radial-glow",
    tokens: {
      bg: "#07111f",
      surface: "#0d1b2e",
      surfaceElevated: "#12243d",
      border: "#223b5e",
      text: "#f0f9ff",
      textMuted: "#93c5fd",
      primary: "#e0f2fe",
      secondary: "#38bdf8",
      glassSurface: "rgba(13, 27, 46, 0.72)",
      glassElevated: "rgba(18, 36, 61, 0.76)",
    },
  },
  {
    id: "pine-conservatory",
    order: 13,
    category: "expressive",
    polarity: "dark",
    glassRecommended: true,
    name: { en: "Nocturnal Conservatory", ar: "المشتل الليلي الداكن" },
    directionTagline: {
      en: "Forest obsidian · Organic Cormorant serif · Mint jade ink",
      ar: "أخضر غابات عميق · حروف فنية ناعمة · نعناع زمردي",
    },
    directionGuide: {
      en: "Botanical night glasshouse direction combining velvety dark moss surfaces with calligraphic Cormorant headlines and soft mint highlights.",
      ar: "أجواء حدائق ليلية هادئة تمزج بين الأخضر الطحلبي الداكن والخطوط الأدبية الرشيقة.",
    },
    idealFor: { en: "Personal Notes & About", ar: "الملاحظات والنبذة الشخصية" },
    fonts: {
      display: '"Cormorant Garamond", Georgia, serif',
      body: '"Lora", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      label: "Cormorant Garamond + Lora",
    },
    geometry: {
      cardRadius: "18px",
      controlRadius: "10px",
      borderWidth: "1px",
      cardShadow: "0 8px 28px rgba(3, 15, 10, 0.5)",
      styleLabel: { en: "Botanical 18px", ar: "عضوي 18px" },
    },
    canvasPattern: "radial-glow",
    tokens: {
      bg: "#09130f",
      surface: "#101e18",
      surfaceElevated: "#162921",
      border: "#264236",
      text: "#ecfdf5",
      textMuted: "#a7c4b5",
      primary: "#d1fae5",
      secondary: "#34d399",
      glassSurface: "rgba(16, 30, 24, 0.76)",
      glassElevated: "rgba(22, 41, 33, 0.8)",
    },
  },
  {
    id: "espresso-atelier",
    order: 14,
    category: "expressive",
    polarity: "dark",
    glassRecommended: false,
    name: { en: "Espresso Craft Atelier", ar: "أتيليه الإسبريسو والنحاس" },
    directionTagline: {
      en: "Roasted umber warmth · Playfair serif · Terracotta copper",
      ar: "بني محمص دافئ · عناوين بلي فير · نحاس محروق",
    },
    directionGuide: {
      en: "Tactile studio workshop atmosphere: rich coffee-umber surfaces replacing cold blues, warm cream typography, and glowing terracotta copper accents.",
      ar: "دفء الاستوديو اليدوي بدرجات القهوة المحمصة والخطوط الكريمية واللمسات النحاسية.",
    },
    idealFor: { en: "Creative Works & Podcasts", ar: "الأعمال الإبداعية والصوتيات" },
    fonts: {
      display: '"Playfair Display", Georgia, serif',
      body: '"DM Sans", system-ui, sans-serif',
      mono: '"Space Mono", ui-monospace, monospace',
      label: "Playfair Display + DM Sans",
    },
    geometry: {
      cardRadius: "12px",
      controlRadius: "8px",
      borderWidth: "1px",
      cardShadow: "0 6px 24px rgba(10, 5, 2, 0.45)",
      styleLabel: { en: "Studio 12px", ar: "استوديو 12px" },
    },
    canvasPattern: "warm-rule",
    tokens: {
      bg: "#130f0d",
      surface: "#1d1714",
      surfaceElevated: "#261e1a",
      border: "#3e312b",
      text: "#f7efe8",
      textMuted: "#bfa89b",
      primary: "#ffedd5",
      secondary: "#f97316",
      glassSurface: "rgba(29, 23, 20, 0.8)",
      glassElevated: "rgba(38, 30, 26, 0.84)",
    },
  },
  {
    id: "monochrome-noir",
    order: 15,
    category: "minimal",
    polarity: "dark",
    glassRecommended: false,
    name: { en: "High-Contrast Noir Gallery", ar: "معرض نوار أحادي التباين" },
    directionTagline: {
      en: "Pure gallery obsidian · Surgical 2px frames · Optical silver",
      ar: "أسود معارض صافي · إطارات حادة 2px · فضي ناصع",
    },
    directionGuide: {
      en: "Uncompromising monochrome exhibition aesthetic: zero color distraction, crisp 2px gallery frames, balanced Outfit geometry, and archival focus on photography and prose.",
      ar: "أسلوب معارض أحادي اللون بتباين صارم وإطارات دقيقة يبرز النصوص والصور بدون تشتيت.",
    },
    idealFor: { en: "Photography & Minimalist Writing", ar: "الصور والكتابة الصافية" },
    fonts: {
      display: '"Outfit", system-ui, sans-serif',
      body: '"Manrope", system-ui, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      label: "Outfit + Manrope + JetBrains Mono",
    },
    geometry: {
      cardRadius: "2px",
      controlRadius: "2px",
      borderWidth: "1px",
      cardShadow: "none",
      styleLabel: { en: "Gallery 2px", ar: "معرضي 2px" },
    },
    canvasPattern: "none",
    tokens: {
      bg: "#09090b",
      surface: "#121215",
      surfaceElevated: "#18181b",
      border: "#2e2e36",
      text: "#fafafa",
      textMuted: "#a1a1aa",
      primary: "#ffffff",
      secondary: "#e4e4e7",
      glassSurface: "rgba(18, 18, 21, 0.82)",
      glassElevated: "rgba(24, 24, 27, 0.86)",
    },
  },
];

export const DEFAULT_DESIGN_THEME_ID = "swiss-studio";

const POLARITY_PAIRS: Record<string, string> = {
  "swiss-studio": "obsidian-terminal",
  "obsidian-terminal": "swiss-studio",
  "oxford-broadsheet": "midnight-editorial",
  "midnight-editorial": "oxford-broadsheet",
  "architect-blueprint": "carbon-industrial",
  "carbon-industrial": "architect-blueprint",
  "nordic-linen": "pine-conservatory",
  "pine-conservatory": "nordic-linen",
  "kyoto-washi": "espresso-atelier",
  "espresso-atelier": "kyoto-washi",
  "coastal-alabaster": "deep-abyss",
  "deep-abyss": "coastal-alabaster",
  "sandstone-archive": "espresso-atelier",
  "brutalist-poster": "monochrome-noir",
  "monochrome-noir": "brutalist-poster",
};

export function getDesignThemeById(id?: string | null): DesignThemeDefinition {
  if (!id) return DESIGN_THEMES[0];
  return DESIGN_THEMES.find((t) => t.id === id) || DESIGN_THEMES[0];
}

export function getPairedPolarityThemeId(id: string | null | undefined, targetPolarity: "light" | "dark"): string {
  const current = getDesignThemeById(id);
  if (current.polarity === targetPolarity) return current.id;
  const pairedId = POLARITY_PAIRS[current.id];
  if (pairedId) {
    const paired = getDesignThemeById(pairedId);
    if (paired.polarity === targetPolarity) return paired.id;
  }
  const fallback = DESIGN_THEMES.find((t) => t.polarity === targetPolarity);
  return fallback ? fallback.id : DEFAULT_DESIGN_THEME_ID;
}

export function getDesignThemeCategoryLabel(cat: DesignThemeCategory | "all", lang: Lang): string {
  switch (cat) {
    case "all":
      return lang === "ar" ? "الكل (15)" : "All Directions (15)";
    case "editorial":
      return lang === "ar" ? "تحريري وأدبي" : "Editorial & Serif";
    case "minimal":
      return lang === "ar" ? "بسيط ومعماري" : "Minimal & Nordic";
    case "technical":
      return lang === "ar" ? "تقني وهندسي" : "Technical & Blueprint";
    case "expressive":
      return lang === "ar" ? "جريء وإبداعي" : "Expressive & Atelier";
  }
}

export function getLocalizedThemeName(theme: DesignThemeDefinition, lang: Lang): string {
  return loc(theme.name, lang);
}

export function applyDesignThemeToDocument(
  themeId?: string | null,
  options?: {
    glassMode?: boolean;
    customSecondaryAccent?: string;
    customPrimaryAccent?: string;
  }
): DesignThemeDefinition {
  const theme = getDesignThemeById(themeId);
  if (typeof document === "undefined") return theme;

  const root = document.documentElement;
  const glassEnabled = options?.glassMode ?? theme.glassRecommended;

  root.setAttribute("data-design-theme", theme.id);
  root.setAttribute("data-theme-pattern", theme.canvasPattern);
  root.setAttribute("data-glass", String(glassEnabled));
  root.classList.toggle("dark", theme.polarity === "dark");

  const t = theme.tokens;
  root.style.setProperty("--hub-bg", t.bg);
  root.style.setProperty("--hub-surface", glassEnabled ? t.glassSurface : t.surface);
  root.style.setProperty("--hub-surface-elevated", glassEnabled ? t.glassElevated : t.surfaceElevated);
  root.style.setProperty("--hub-border", t.border);
  root.style.setProperty("--hub-text", t.text);
  root.style.setProperty("--hub-text-muted", t.textMuted);
  root.style.setProperty("--hub-primary", options?.customPrimaryAccent || t.primary);
  root.style.setProperty("--hub-secondary", options?.customSecondaryAccent || t.secondary);

  root.style.setProperty("--font-display", theme.fonts.display);
  root.style.setProperty("--font-body", theme.fonts.body);
  root.style.setProperty("--font-mono", theme.fonts.mono);

  root.style.setProperty("--hub-card-radius", theme.geometry.cardRadius);
  root.style.setProperty("--hub-control-radius", theme.geometry.controlRadius);
  root.style.setProperty("--hub-border-width", theme.geometry.borderWidth);
  root.style.setProperty("--hub-card-shadow", theme.geometry.cardShadow);

  return theme;
}
