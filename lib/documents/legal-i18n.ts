import { COMPANY } from "../company";

export const LEGAL_I18N = {
  CONTRACT: {
    en: {
      title: "Service agreement",
      intro: `This agreement is made between ${COMPANY.legalName} ("Provider") and the client named in this document.`,
      body: `1. Scope: Provider will build and launch the system as approved in the signed quote.
2. Fees: According to the signed quote. Late payment may delay delivery.
3. IP: After full payment the client receives a license to use the system built for them. Generic components remain IBDA's.
4. Confidentiality: Both parties will keep business and technical information confidential.
5. Liability: Provider will fix defects from its work during the warranty period. No liability for indirect damage.
6. Termination: 14 days written notice, subject to payment for work done.
7. Law: The laws of the State of Israel apply.`,
      footer: `${COMPANY.name} · Service agreement · ${COMPANY.email}`,
    },
    ar: {
      title: "اتفاقية خدمات",
      intro: `أبرمت هذه الاتفاقية بين ${COMPANY.legalName} ("المزود") والعميل المذكور في هذا المستند.`,
      body: `1. النطاق: يبني المزود النظام وفق عرض السعر الموقع.
2. المقابل: حسب العرض الموقع. التأخير في الدفع قد يؤخر التسليم.
3. الملكية الفكرية: بعد اكتمال الدفع يحصل العميل على ترخيص استخدام النظام. المكونات العامة تبقى لـ IBDA.
4. السرية: يحافظ الطرفان على سرية المعلومات.
5. المسؤولية: إصلاح العيوب الناتجة عن عمل المزود خلال فترة الضمان. لا مسؤولية عن ضرر غير مباشر.
6. الإنهاء: إشعار مكتوب خلال 14 يوماً مع دفع العمل المنجز.
7. القانون: يسري قانون دولة إسرائيل.`,
      footer: `${COMPANY.name} · اتفاقية · ${COMPANY.email}`,
    },
  },
  TERMS: {
    en: {
      title: "Terms of use",
      intro: `The client confirms they have read and understood these terms and how work is done with ${COMPANY.name}.`,
      body: `1. The client portal is used for progress, required answers and document signing.
2. The client provides accurate information on time.
3. Card details are stored only with the payment provider, never as a full PAN at IBDA.
4. A digital signature is commercial consent to the document.
5. The signed version applies to this engagement.
6. Support is via the portal or business WhatsApp.`,
      footer: `${COMPANY.name} · Terms · ${COMPANY.website}`,
    },
    ar: {
      title: "شروط الاستخدام",
      intro: `يؤكد العميل أنه قرأ وفهم الشروط وطريقة العمل مع ${COMPANY.name}.`,
      body: `1. بوابة العميل للمتابعة والإجابة على الأسئلة والتوقيع.
2. يقدم العميل معلومات دقيقة وفي الوقت المناسب.
3. بيانات البطاقة تُحفظ لدى مزود الدفع فقط.
4. التوقيع الرقمي موافقة تجارية على المستند.
5. النسخة الموقعة تسري على هذا التعاقد.
6. الدعم عبر البوابة أو واتساب العمل.`,
      footer: `${COMPANY.name} · شروط · ${COMPANY.website}`,
    },
  },
} as const;

export function legalOverlay(type: string, locale: string) {
  if (locale === "he") return null;
  const pack = LEGAL_I18N[type as keyof typeof LEGAL_I18N];
  if (!pack) return null;
  return (pack as Record<string, { title: string; intro: string; body: string; footer: string }>)[locale] ?? null;
}
