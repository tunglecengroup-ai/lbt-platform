import { Phone, Mail } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Badge, Dot } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { formatShortVND, timeAgo } from "@/lib/utils";
import { LEAD_STAGES } from "@/lib/types";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { Users, Banknote, Target, Percent } from "lucide-react";

const sourceTone: Record<string, string> = {
  "Facebook Ads": "text-info",
  "Landing page": "text-violet",
  YouTube: "text-danger",
  "Inbox page": "text-warning",
  "Giới thiệu": "text-success",
};

function scoreTone(score: number) {
  if (score >= 80) return "success" as const;
  if (score >= 55) return "warning" as const;
  return "danger" as const;
}

export const dynamic = "force-dynamic";

type LeadView = {
  id: string; name: string; phone: string | null; email: string | null; source: string | null;
  value: number; stage: string; owner: string | null; score: number; note: string | null; lastTouch: string;
};

export default async function CrmPage() {
  const { data } = await createAdminSupabase()
    .from("leads")
    .select("id, name, phone, email, source, value_vnd, stage, owner, score, note, last_touch_at")
    .order("last_touch_at", { ascending: false })
    .limit(2000);
  const leads: LeadView[] = (data ?? []).map((l) => ({
    id: l.id, name: l.name, phone: l.phone, email: l.email, source: l.source, value: l.value_vnd ?? 0,
    stage: l.stage, owner: l.owner, score: l.score ?? 0, note: l.note, lastTouch: l.last_touch_at,
  }));
  const pipelineValue = leads
    .filter((l) => !["chot", "mat"].includes(l.stage))
    .reduce((s, l) => s + l.value, 0);
  const won = leads.filter((l) => l.stage === "chot").length;
  const rate = leads.length ? Math.round((won / leads.length) * 100) : 0;

  return (
    <>
      <Topbar title="Khách hàng (CRM)" subtitle="Quản lý lead từ Facebook Ads, landing page và các kênh" />
      <PageBody>
        <MobileHeading title="Khách hàng (CRM)" subtitle="Quản lý lead từ mọi kênh" />

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Tổng lead" value={String(leads.length)} icon={Users} hint="đang theo dõi" />
          <StatCard label="Giá trị phễu" value={formatShortVND(pipelineValue)} icon={Banknote} hint="chưa chốt" />
          <StatCard label="Đã chốt" value={String(won)} icon={Target} />
          <StatCard label="Tỷ lệ chốt" value={`${rate}%`} icon={Percent} />
        </div>

        {/* Kanban */}
        <div className="scrollbar-thin -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {LEAD_STAGES.map((stage) => {
            const items = leads.filter((l) => l.stage === stage.id);
            const colValue = items.reduce((s, l) => s + l.value, 0);
            return (
              <div key={stage.id} className="w-[280px] shrink-0 snap-start">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge tone={stage.tone}>
                      <Dot /> {stage.label}
                    </Badge>
                    <span className="text-muted-foreground tabular text-sm">{items.length}</span>
                  </div>
                  <span className="text-muted-foreground tabular text-xs">{formatShortVND(colValue)}</span>
                </div>

                <div className="space-y-3">
                  {items.map((lead) => (
                    <Card key={lead.id} className="hover:border-primary/40 p-4 transition-colors">
                      <div className="flex items-start gap-3">
                        <Avatar name={lead.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{lead.name}</p>
                          <p className={`truncate text-xs font-medium ${sourceTone[lead.source ?? ""] ?? "text-muted-foreground"}`}>
                            {lead.source ?? "—"}
                          </p>
                        </div>
                        <Badge tone={scoreTone(lead.score)} className="h-5 px-1.5 text-[11px]">
                          {lead.score}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground mt-3 line-clamp-2 text-xs leading-relaxed">
                        {lead.note}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="tabular text-sm font-semibold">
                          {lead.value > 0 ? formatShortVND(lead.value) : "—"}
                        </span>
                        <div className="text-muted-foreground flex items-center gap-1">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md" aria-label={`Gọi ${lead.name}`}>
                              <Phone className="size-3.5" />
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md" aria-label={`Email ${lead.name}`}>
                              <Mail className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="text-muted-foreground mt-2 flex items-center justify-between border-t pt-2 text-[11px]">
                        <span className="truncate">{lead.owner ?? "Chưa giao"}</span>
                        <span>{timeAgo(lead.lastTouch)}</span>
                      </div>
                    </Card>
                  ))}

                  {items.length === 0 && (
                    <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-xs">
                      Chưa có lead
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
