import { PrismaClient } from "../lib/generated/prisma";
import { INDUSTRY_TEMPLATES } from "../lib/industries";

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  for (const tpl of INDUSTRY_TEMPLATES) {
    const exists = await prisma.documentTemplate.findFirst({
      where: { name: tpl.name, industry: tpl.industry, type: tpl.type },
    });
    if (exists) continue;
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
    created += 1;
  }
  await prisma.documentTemplate.updateMany({
    where: { name: "הצעת מחיר קבועה — IBDA" },
    data: { isDefault: false },
  });
  console.log(`Added ${created} industry templates`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
