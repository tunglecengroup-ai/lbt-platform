import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStudent } from "@/lib/learning";
import { toolAccess, usedToday } from "@/lib/ai";
import { toolByKey } from "@/lib/ai-tools";
import { ToolRunner } from "./tool-runner";

export default async function ToolPage({ params }: PageProps<"/hoc/cong-cu/[tool]">) {
  const { tool: key } = await params;
  const tool = toolByKey(key);
  if (!tool) notFound();
  const student = await getStudent();
  const [access, used] = await Promise.all([toolAccess(student.id), usedToday(student.id)]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <Link href="/hoc/cong-cu" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Tất cả công cụ
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{tool.title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{tool.short}</p>
      <ToolRunner toolKey={tool.key} allowed={access.allowed} remaining={Math.max(0, access.quota - used)} quota={access.quota} />
    </main>
  );
}
