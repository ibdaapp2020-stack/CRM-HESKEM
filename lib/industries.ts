import { COMPANY } from "./company";

export type IndustryId =
  | "general"
  | "ecommerce"
  | "clinic"
  | "garage"
  | "restaurant"
  | "realestate"
  | "education"
  | "professional";

export type TemplateLine = {
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export const INDUSTRIES: { id: IndustryId; label: string; hint: string }[] = [
  { id: "general", label: "כללי / פיתוח מערכת", hint: "CRM, אוטומציה, מערכת מותאמת" },
  { id: "ecommerce", label: "חנות אונליין", hint: "אתר מכירות, מלאי, סליקה" },
  { id: "clinic", label: "קליניקה / רפואה", hint: "תורים, כרטיס מטופל, תזכורות" },
  { id: "garage", label: "מוסך / רכב", hint: "תור לטיפול, מעקב רכבים" },
  { id: "restaurant", label: "מסעדה / קייטרינג", hint: "הזמנות, תפריט, וואטסאפ" },
  { id: "realestate", label: "נדל״ן", hint: "לידים, נכסים, מעקב לקוחות" },
  { id: "education", label: "חינוך / קורסים", hint: "הרשמה, תשלומים, תלמידים" },
  { id: "professional", label: "משרד מקצועי", hint: "עו״ד, רו״ח, יועצים" },
];

export function industryLabel(id?: string | null) {
  return INDUSTRIES.find((i) => i.id === id)?.label ?? "כללי / פיתוח מערכת";
}

const footer = `${COMPANY.name} · ${COMPANY.email} · ${COMPANY.phone} · ח.פ ${COMPANY.vatId}`;

function quotePack(
  industry: IndustryId,
  name: string,
  title: string,
  introExtra: string,
  lines: TemplateLine[],
) {
  return {
    type: "QUOTE" as const,
    industry,
    name,
    title,
    intro: `מסמך זה מהווה הצעת מחיר מטעם ${COMPANY.legalName} עבור ${introExtra}. ההצעה מותאמת ללקוח וניתנת לחתימה דיגיטלית.`,
    body: `העבודה כוללת אפיון, פיתוח, הקמה והדרכה לפי הפירוט בטבלת השירותים.
לוחות הזמנים ייקבעו לאחר חתימה.
תוקף ההצעה: 14 יום ממועד הפקתה.`,
    footer,
    lineItems: lines,
    isDefault: true,
  };
}

function contractPack(industry: IndustryId, name: string, scope: string) {
  return {
    type: "CONTRACT" as const,
    industry,
    name,
    title: "הסכם למתן שירותי פיתוח",
    intro: `הסכם זה נערך בין ${COMPANY.legalName} (להלן: "ספק") לבין הלקוח המפורט במסמך.`,
    body: `1. היקף העבודה: ${scope}
2. תמורה: לפי הצעת המחיר החתומה, המהווה חלק בלתי נפרד מהסכם זה.
3. קניין רוחני: לאחר מלוא התשלום הלקוח מקבל רישיון שימוש במערכת שנבנתה עבורו. רכיבים גנריים נשארים בבעלות IBDA.
4. סודיות: הצדדים ישמרו על סודיות מידע עסקי וטכני.
5. אחריות: תיקון תקלות הנובעות מעבודת הספק בתקופת האחריות. אין אחריות לנזק עקיף.
6. ביטול: הודעה בכתב של 14 יום, בכפוף לתשלום עבור עבודה שבוצעה.
7. דין: דין מדינת ישראל.`,
    footer: `${COMPANY.name} · הסכם שירות · ${COMPANY.email}`,
    lineItems: [] as TemplateLine[],
    isDefault: true,
  };
}

function termsPack(industry: IndustryId) {
  return {
    type: "TERMS" as const,
    industry,
    name: "תקנון שימוש — IBDA",
    title: "תקנון והצהרת לקוח",
    intro: `הלקוח מאשר שקרא והבין את התקנון ואת אופן העבודה מול ${COMPANY.name}.`,
    body: `1. פורטל הלקוח משמש למעקב, מענה לשאלות וחתימה על מסמכים.
2. הלקוח מוסר מידע מדויק ובזמן — עיכוב במענה עלול לדחות לוחות זמנים.
3. פרטי אשראי נשמרים אצל ספק הסליקה בלבד, לא כמספר כרטיס מלא אצל IBDA.
4. חתימה דיגיטלית מהווה הסכמה מסחרית למסמך.
5. גרסה חתומה חלה על ההתקשרות הנוכחית.
6. פניות שירות דרך הפורטל או הוואטסאפ העסקי.`,
    footer: `${COMPANY.name} · תקנון · ${COMPANY.website}`,
    lineItems: [] as TemplateLine[],
    isDefault: true,
  };
}

export const INDUSTRY_TEMPLATES = [
  quotePack("general", "הצעת מחיר — פיתוח מערכת", "הצעת מחיר", "פיתוח מערכת מותאמת", [
    { title: "אפיון ועיצוב מערכת", description: "תהליכים, מסכים וחיבור וואטסאפ", quantity: 1, unitPrice: 8000, discount: 0 },
    { title: "פיתוח CRM + תיבת הודעות", description: "פייפליין, לקוחות וצ׳אט", quantity: 1, unitPrice: 28000, discount: 0 },
    { title: "הקמה, הדרכה וליווי", description: "עלייה לאוויר וחודש ליווי", quantity: 1, unitPrice: 12000, discount: 0 },
  ]),
  quotePack("ecommerce", "הצעת מחיר — חנות אונליין", "הצעת מחיר לחנות אונליין", "אתר מכירות וניהול הזמנות", [
    { title: "אתר חנות וקטלוג", description: "מוצרים, עגלה ותשלום", quantity: 1, unitPrice: 18000, discount: 0 },
    { title: "ניהול מלאי והזמנות", description: "דשבורד משרד + התראות", quantity: 1, unitPrice: 12000, discount: 0 },
    { title: "וואטסאפ ללקוחות", description: "אישור הזמנה ושאלות", quantity: 1, unitPrice: 7000, discount: 0 },
  ]),
  quotePack("clinic", "הצעת מחיר — קליניקה", "הצעת מחיר לקליניקה", "ניהול תורים ומטופלים", [
    { title: "כרטיס מטופל ותורים", description: "יומן, היסטוריה ותזכורות", quantity: 1, unitPrice: 16000, discount: 0 },
    { title: "תזכורות וואטסאפ", description: "אישור הגעה וביטולים", quantity: 1, unitPrice: 8000, discount: 0 },
    { title: "הקמה והדרכת צוות", description: "עלייה לאוויר לקליניקה", quantity: 1, unitPrice: 6000, discount: 0 },
  ]),
  quotePack("garage", "הצעת מחיר — מוסך", "הצעת מחיר למוסך", "תור לטיפול ומעקב רכבים", [
    { title: "כרטיס רכב ותור לטיפול", description: "יומן עבודה והיסטוריית טיפולים", quantity: 1, unitPrice: 14000, discount: 0 },
    { title: "וואטסאפ ללקוחות המוסך", description: "הגעה, מוכן לאיסוף, הצעת מחיר", quantity: 1, unitPrice: 8000, discount: 0 },
    { title: "הקמה והדרכה", description: "עלייה לאוויר במוסך", quantity: 1, unitPrice: 5000, discount: 0 },
  ]),
  quotePack("restaurant", "הצעת מחיר — מסעדה", "הצעת מחיר למסעדה", "הזמנות ותפריט בוואטסאפ", [
    { title: "תפריט והזמנות אונליין", description: "קטלוג מנות וסל הזמנה", quantity: 1, unitPrice: 12000, discount: 0 },
    { title: "וואטסאפ הזמנות", description: "קבלת הזמנה ואישור שעה", quantity: 1, unitPrice: 9000, discount: 0 },
    { title: "הקמה והדרכת צוות", description: "עלייה לאוויר למטבח/קופה", quantity: 1, unitPrice: 5000, discount: 0 },
  ]),
  quotePack("realestate", "הצעת מחיר — נדל״ן", "הצעת מחיר למשרד נדל״ן", "ניהול לידים ונכסים", [
    { title: "CRM נכסים ולידים", description: "פייפליין, נכסים ומעקב", quantity: 1, unitPrice: 20000, discount: 0 },
    { title: "וואטסאפ למתעניינים", description: "מענה ראשון ושליחת מפרט", quantity: 1, unitPrice: 8000, discount: 0 },
    { title: "הקמה והדרכה", description: "עלייה לאוויר לסוכנים", quantity: 1, unitPrice: 6000, discount: 0 },
  ]),
  quotePack("education", "הצעת מחיר — קורסים", "הצעת מחיר למוסד לימודים", "הרשמה, תשלומים ותלמידים", [
    { title: "מערכת הרשמה וקורסים", description: "מחזורי לימוד ותלמידים", quantity: 1, unitPrice: 18000, discount: 0 },
    { title: "תשלומים ותזכורות", description: "גבייה והודעות וואטסאפ", quantity: 1, unitPrice: 8000, discount: 0 },
    { title: "הקמה והדרכה", description: "עלייה לאוויר למזכירות", quantity: 1, unitPrice: 5000, discount: 0 },
  ]),
  quotePack("professional", "הצעת מחיר — משרד מקצועי", "הצעת מחיר למשרד מקצועי", "ניהול לקוחות ותיקים", [
    { title: "ניהול תיקים ולקוחות", description: "CRM, משימות ומסמכים", quantity: 1, unitPrice: 16000, discount: 0 },
    { title: "וואטסאפ ללקוחות המשרד", description: "קביעת פגישה ומעקב", quantity: 1, unitPrice: 7000, discount: 0 },
    { title: "הקמה והדרכה", description: "עלייה לאוויר לצוות", quantity: 1, unitPrice: 5000, discount: 0 },
  ]),
  contractPack("general", "הסכם עבודה — פיתוח מערכת", "הספק יפתח ויקים את המערכת לפי האפיון שאושר בהצעת המחיר החתומה."),
  contractPack("ecommerce", "הסכם עבודה — חנות אונליין", "הספק יקים אתר מכירות, ניהול הזמנות וחיבור וואטסאפ לפי ההצעה החתומה."),
  contractPack("clinic", "הסכם עבודה — קליניקה", "הספק יקים מערכת תורים, כרטיס מטופל ותזכורות לפי ההצעה החתומה."),
  contractPack("garage", "הסכם עבודה — מוסך", "הספק יקים מערכת תור לטיפול ומעקב רכבים לפי ההצעה החתומה."),
  contractPack("restaurant", "הסכם עבודה — מסעדה", "הספק יקים מערכת הזמנות ותפריט עם וואטסאפ לפי ההצעה החתומה."),
  contractPack("realestate", "הסכם עבודה — נדל״ן", "הספק יקים CRM לנכסים ולידים לפי ההצעה החתומה."),
  contractPack("education", "הסכם עבודה — קורסים", "הספק יקים מערכת הרשמה ותלמידים לפי ההצעה החתומה."),
  contractPack("professional", "הסכם עבודה — משרד מקצועי", "הספק יקים מערכת תיקים ולקוחות לפי ההצעה החתומה."),
  termsPack("general"),
  termsPack("ecommerce"),
  termsPack("clinic"),
  termsPack("garage"),
  termsPack("restaurant"),
  termsPack("realestate"),
  termsPack("education"),
  termsPack("professional"),
];
