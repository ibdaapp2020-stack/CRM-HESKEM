import { Badge, Card } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { getClientLead } from "@/lib/client-lead";

export default async function PortalProjectPage() {
  const user = await requireClient();
  const lead = await getClientLead(user);
  const project = lead?.project;

  if (!project) {
    return (
      <Card className="p-6">
        <h1 className="mb-2 text-xl font-bold">הקמת המערכת</h1>
        <p className="text-sm text-muted">
          ההקמה תופיע כאן אחרי חתימה על המסמכים וסגירת החשבון.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-sm text-muted">{project.summary}</p>
      </div>
      {project.milestones.map((m) => (
        <Card key={m.id} className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium">{m.title}</div>
            <div className="text-sm text-muted">{m.description}</div>
          </div>
          <Badge
            tone={
              m.status === "DONE" ? "green" : m.status === "IN_PROGRESS" ? "cyan" : "slate"
            }
          >
            {m.status === "DONE"
              ? "הושלם"
              : m.status === "IN_PROGRESS"
                ? "בתהליך"
                : "ממתין"}
          </Badge>
        </Card>
      ))}
    </div>
  );
}
