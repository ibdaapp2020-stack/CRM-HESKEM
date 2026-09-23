import { CLIENT_VISIBLE_STAGES, STAGE_META, stageIndex } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

export function StageTimeline({ current }: { current: string }) {
  const currentIdx = stageIndex(current);
  return (
    <ol className="grid gap-2 md:grid-cols-5">
      {CLIENT_VISIBLE_STAGES.map((stage, index) => {
        const done = index < currentIdx;
        const active = stage === current;
        return (
          <li
            key={stage}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              active && "border-cyan bg-cyan/10 text-cyan-2",
              done && !active && "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
              !done && !active && "border-line text-muted",
            )}
          >
            <div className="text-[11px] opacity-70">{index + 1}</div>
            <div className="font-medium">{STAGE_META[stage].clientLabel}</div>
          </li>
        );
      })}
    </ol>
  );
}
