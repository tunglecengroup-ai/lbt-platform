import { Plus, Mail, Send, Zap, Users, MousePointerClick } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatNumber } from "@/lib/utils";
import { automations } from "@/lib/mock-data";

const channelIcon = {
  Email: Mail,
  Telegram: Send,
  "Email + Telegram": Zap,
} as const;

export default function AutomationPage() {
  const active = automations.filter((a) => a.active).length;
  const totalSent = automations.reduce((s, a) => s + a.sent, 0);
  const avgOpen = Math.round(
    automations.reduce((s, a) => s + a.openRate, 0) / automations.length,
  );

  return (
    <>
      <Topbar title="Automation" subtitle="Chuỗi email & Telegram tự động chăm sóc học viên và lead" />
      <PageBody>
        <div className="mb-6 flex items-center justify-between">
          <MobileHeading title="Automation" />
          <div className="ml-auto">
            <Button size="sm">
              <Plus className="size-4" /> Tạo kịch bản
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Kịch bản đang chạy" value={`${active}/${automations.length}`} icon={Zap} hint="tự động 24/7" />
          <StatCard label="Tin đã gửi" value={formatNumber(totalSent)} icon={Send} hint="tổng cộng" />
          <StatCard label="Tỷ lệ mở TB" value={`${avgOpen}%`} delta={4} icon={MousePointerClick} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {automations.map((a) => {
            const Icon = channelIcon[a.channel];
            return (
              <Card key={a.id} className="transition-shadow hover:shadow-md">
                <CardContent>
                  <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold tracking-tight">{a.name}</h3>
                        <Badge tone={a.active ? "success" : "neutral"}>
                          <Dot /> {a.active ? "Đang chạy" : "Tạm dừng"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">
                        <span className="font-medium">Kích hoạt:</span> {a.trigger}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4 text-center">
                    <div>
                      <p className="tabular text-lg font-semibold">{a.steps}</p>
                      <p className="text-muted-foreground text-xs">bước</p>
                    </div>
                    <div>
                      <p className="tabular text-lg font-semibold">{formatNumber(a.audience)}</p>
                      <p className="text-muted-foreground text-xs">đối tượng</p>
                    </div>
                    <div>
                      <p className="tabular text-lg font-semibold">{formatNumber(a.sent)}</p>
                      <p className="text-muted-foreground text-xs">đã gửi</p>
                    </div>
                    <div>
                      <p className="tabular text-success text-lg font-semibold">{a.openRate}%</p>
                      <p className="text-muted-foreground text-xs">mở</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <Users className="size-3.5" /> {a.channel}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
