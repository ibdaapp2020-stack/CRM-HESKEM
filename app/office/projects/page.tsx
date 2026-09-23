import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { lead: true, milestones: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">הקמת מערכות</h1>
      {projects.map((p) => {
        const done = p.milestones.filter((m) => m.status === "DONE").length;
        return (
          <Link key={p.id} href={`/office/projects/${p.id}`}>
            <Card className="mb-2 flex items-center justify-between p-4 hover:border-cyan/40">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted">{p.lead.fullName}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">
                  {done}/{p.milestones.length}
                </span>
                <Badge tone={p.status === "LIVE" ? "green" : "cyan"}>{p.status}</Badge>
              </div>
            </Card>
          </Link>
        );
      })}
      {projects.length === 0 && (
        <p className="text-sm text-muted">
          אין הקמות עדיין. אפשר לפתוח פרויקט מכרטיס ליד אחרי תשלום.
        </p>
      )}
    </div>
  );
}
