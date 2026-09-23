import { PrismaClient } from "../lib/generated/prisma";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { INDUSTRY_TEMPLATES } from "../lib/industries";
import { DEFAULT_MESSAGE_TEMPLATES } from "../lib/whatsapp/templates";

const prisma = new PrismaClient();

async function main() {
  await prisma.signature.deleteMany();
  await prisma.documentLineItem.deleteMany();
  await prisma.document.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.clientQuestion.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.qualification.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.user.deleteMany();

  const staffHash = await bcrypt.hash("Ibda2026!", 10);
  const clientHash = await bcrypt.hash("Client2026!", 10);

  const staff = await prisma.user.create({
    data: {
      email: "admin@ibda.co.il",
      name: "מנהל IBDA",
      phone: "0500000000",
      role: "STAFF",
      passwordHash: staffHash,
    },
  });

  const client = await prisma.user.create({
    data: {
      email: "client@demo.co.il",
      name: "יוסי כהן",
      phone: "0521112233",
      role: "CLIENT",
      passwordHash: clientHash,
    },
  });

  for (const tpl of DEFAULT_MESSAGE_TEMPLATES) {
    await prisma.messageTemplate.create({ data: { ...tpl } });
  }
  for (const tpl of INDUSTRY_TEMPLATES) {
    await prisma.documentTemplate.create({
      data: {
        type: tpl.type,
        name: tpl.name,
        industry: tpl.industry,
        title: tpl.title,
        intro: tpl.intro,
        body: tpl.body,
        footer: tpl.footer,
        isDefault: tpl.isDefault,
        version: 1,
        lineItemsJson: JSON.stringify(tpl.lineItems),
      },
    });
  }

  const leadYossi = await prisma.lead.create({
    data: {
      fullName: "יוסי כהן",
      phone: "0521112233",
      email: "client@demo.co.il",
      company: "כהן דיגיטל",
      source: "whatsapp",
      industry: "general",
      stage: "QUOTE_SENT",
      score: 85,
      tags: JSON.stringify(["חם", "פיתוח מערכת"]),
      notes: "רוצה CRM + וואטסאפ לעסק קיים",
      ownerId: staff.id,
      clientUserId: client.id,
      qualification: {
        create: {
          budget: "high",
          serviceType: "custom",
          urgency: "now",
          fit: "high",
          score: 85,
          qualified: true,
        },
      },
    },
  });

  const conv = await prisma.conversation.create({
    data: {
      leadId: leadYossi.id,
      channel: "inbox",
      lastAt: new Date(),
      messages: {
        create: [
          {
            direction: "inbound",
            body: "שלום, ראיתי את IBDA. אנחנו צריכים מערכת לניהול לקוחות ווואטסאפ.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
          },
          {
            direction: "outbound",
            authorId: staff.id,
            templateKey: "welcome",
            body: "שלום יוסי, כאן IBDA. תודה שפנית אלינו — נשמח להבין במה אפשר לעזור ולהתקדם יחד.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25),
          },
          {
            direction: "inbound",
            body: "מעולה. תקציב באזור 50 אלף, רוצים להתחיל החודש.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          },
        ],
      },
    },
  });

  const quote = await prisma.document.create({
    data: {
      leadId: leadYossi.id,
      type: "QUOTE",
      title: "הצעת מחיר — מערכת CRM ווואטסאפ",
      intro: INDUSTRY_TEMPLATES[0].intro,
      body: INDUSTRY_TEMPLATES[0].body,
      footer: INDUSTRY_TEMPLATES[0].footer,
      status: "SENT",
      validUntil: new Date(Date.now() + 14 * 86400000),
      subtotal: 48000,
      vatRate: 17,
      vatAmount: 8160,
      total: 56160,
      customNotes: "כולל הקמה, הדרכה וחודש ליווי.",
      signToken: nanoid(24),
      signTokenExp: new Date(Date.now() + 30 * 86400000),
      lineItems: {
        create: [
          {
            title: "אפיון ועיצוב מערכת",
            description: "אפיון תהליכים, מסכים וחיבור וואטסאפ",
            quantity: 1,
            unitPrice: 8000,
            sortOrder: 0,
          },
          {
            title: "פיתוח CRM + תיבת הודעות",
            description: "פייפליין, לקוחות, צ'אט ותבניות",
            quantity: 1,
            unitPrice: 28000,
            sortOrder: 1,
          },
          {
            title: "הקמה, הדרכה וליווי",
            description: "עלייה לאוויר וחודש ליווי",
            quantity: 1,
            unitPrice: 12000,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  await prisma.clientQuestion.create({
    data: {
      leadId: leadYossi.id,
      authorId: staff.id,
      question: "מה כתובת העסק לצורך החשבונית וההסכם?",
      required: true,
    },
  });

  await prisma.appointment.create({
    data: {
      leadId: leadYossi.id,
      type: "ZOOM",
      title: "פגישת אפיון בזום",
      scheduledAt: new Date(Date.now() + 2 * 86400000),
      location: "https://zoom.us/j/ibda-demo",
      notes: "להציג תהליך מכירה נוכחי",
    },
  });

  const otherLeads = [
    {
      fullName: "נועה לוי",
      phone: "0549991111",
      email: "noa@shop.co.il",
      company: "נועה שופ",
      industry: "ecommerce",
      stage: "NEW_LEAD",
      score: 0,
      tags: ["חדש"],
      inbound: "היי, אפשר פרטים על בניית אתר לחנות?",
    },
    {
      fullName: "אבי מזרחי",
      phone: "0532223344",
      email: "avi@garage.co.il",
      company: "מוסך מזרחי",
      industry: "garage",
      stage: "QUALIFYING",
      score: 45,
      tags: ["אוטומציה"],
      inbound: "צריך וואטסאפ אוטומטי לתור למוסך",
    },
    {
      fullName: "דנה ברק",
      phone: "0507778888",
      email: "dana@clinic.co.il",
      company: "קליניקת ברק",
      industry: "clinic",
      stage: "VOICE_CALL",
      score: 70,
      tags: ["חם"],
      inbound: "אפשר שיחה היום אחר הצהריים?",
    },
    {
      fullName: "רועי חדד",
      phone: "0581234567",
      email: "roy@startup.io",
      company: "Hadad Labs",
      industry: "general",
      stage: "LOST",
      score: 25,
      tags: ["תקציב נמוך"],
      inbound: "יש תקציב של 3,000 שח בלבד",
    },
  ];

  for (const item of otherLeads) {
    const user = await prisma.user.create({
      data: {
        email: item.email,
        name: item.fullName,
        phone: item.phone,
        role: "CLIENT",
        passwordHash: clientHash,
      },
    });
    const lead = await prisma.lead.create({
      data: {
        fullName: item.fullName,
        phone: item.phone,
        email: item.email,
        company: item.company,
        industry: item.industry,
        stage: item.stage,
        score: item.score,
        tags: JSON.stringify(item.tags),
        ownerId: staff.id,
        clientUserId: user.id,
        lostReason: item.stage === "LOST" ? "ציון סינון נמוך / תקציב" : null,
      },
    });
    await prisma.conversation.create({
      data: {
        leadId: lead.id,
        messages: {
          create: { direction: "inbound", body: item.inbound },
        },
      },
    });
    if (item.score) {
      await prisma.qualification.create({
        data: {
          leadId: lead.id,
          budget: item.score >= 60 ? "mid" : "low",
          serviceType: "automation",
          urgency: item.score >= 60 ? "month" : "explore",
          fit: item.score >= 60 ? "high" : "low",
          score: item.score,
          qualified: item.score >= 40,
        },
      });
    }
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        actorId: staff.id,
        type: "lead_created",
        message: `ליד נכנס מוואטסאפ: ${item.fullName}`,
      },
    });
  }

  await prisma.activity.createMany({
    data: [
      {
        leadId: leadYossi.id,
        actorId: staff.id,
        type: "lead_created",
        message: "ליד נכנס מוואטסאפ: יוסי כהן",
      },
      {
        leadId: leadYossi.id,
        actorId: staff.id,
        type: "qualified",
        message: "סינון הושלם — ציון 85 (מתאים)",
      },
      {
        leadId: leadYossi.id,
        actorId: staff.id,
        type: "document_sent",
        message: `נשלחה הצעת מחיר לחתימה (${quote.id})`,
      },
    ],
  });

  console.log("Seeded IBDA CRM");
  console.log("Staff: admin@ibda.co.il / Ibda2026!");
  console.log("Client: client@demo.co.il / Client2026!");
  console.log("Inbox conversation:", conv.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
