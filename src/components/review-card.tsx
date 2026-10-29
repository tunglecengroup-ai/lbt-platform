import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import type { ReviewRow } from "@/lib/types";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={className} aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`inline size-4 ${i <= Math.round(value) ? "fill-warning text-warning" : "text-border"}`} />
      ))}
    </span>
  );
}

export function ReviewCard({ review }: { review: ReviewRow }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <Stars value={review.rating} />
      <p className="mt-3 flex-1 text-sm leading-relaxed">“{review.content}”</p>
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={review.name} />
        <div className="leading-tight">
          <p className="text-sm font-semibold">{review.name}</p>
          {review.role && <p className="text-muted-foreground text-xs">{review.role}</p>}
        </div>
      </div>
    </Card>
  );
}
