import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";
import {
  addMilestoneAction,
  setMilestoneStatusAction,
} from "@/lib/actions/projects";
import { prisma } from "@/lib/prisma";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      lead: true,
      milestones: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!project) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <Link href={`/office/leads/${project.leadId}`} className="text-sm text-cyan-2">
          {project.lead.fullName}
        </Link>
        <p className="mt-2 text-sm text-muted">{project.summary}</p>
      </div>
      <div className="space-y-2">
        {project.milestones.map((m) => (
          <Card key={m.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{m.title}</div>
              <div className="text-sm text-muted">{m.description}</div>
            </div>
            <form action={setMilestoneStatusAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={m.id} />
              <select
                name="status"
                defaultValue={m.status}
                className="rounded-xl border border-line bg-navy px-3 py-2 text-sm"
              >
                <option value="PENDING">ממתין</option>
                <option value="IN_PROGRESS">בתהליך</option>
                <option value="DONE">הושלם</option>
              </select>
              <Button type="submit" variant="outline">
                עדכן
              </Button>
            </form>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <h2 className="mb-3 font-medium">אבן דרך חדשה</h2>
        <form action={addMilestoneAction} className="space-y-3">
          <input type="hidden" name="projectId" value={project.id} />
          <Field label="כותרת">
            <Input name="title" required />
          </Field>
          <Field label="תיאור">
            <Textarea name="description" rows={2} />
          </Field>
          <Button type="submit">הוסף</Button>
        </form>
      </Card>
      <Badge tone={project.status === "LIVE" ? "green" : "cyan"}>{project.status}</Badge>
    </div>
  );
}
