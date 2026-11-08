"use client";

import { useEffect } from "react";
import { track, type TrackItem } from "@/lib/track";

/** Bắn 1 sự kiện khi trang hiện ra (đặt trong Server Component). purchase chỉ bắn 1 lần/đơn trên mỗi máy. */
export function TrackEvent(
  props:
    | { event: "view_item" | "begin_checkout"; item: TrackItem }
    | { event: "purchase"; item: TrackItem; transactionId: string; value: number },
) {
  const key = props.event === "purchase" ? props.transactionId : `${props.event}:${props.item.id}`;
  useEffect(() => {
    // chờ gtag/fbq khởi tạo (afterInteractive)
    const t = setTimeout(() => {
      if (props.event === "purchase") {
        const flag = `lbt_purchase_${props.transactionId}`;
        try {
          if (localStorage.getItem(flag)) return;
          localStorage.setItem(flag, "1");
        } catch {}
        track("purchase", { transactionId: props.transactionId, value: props.value, item: props.item });
      } else {
        track(props.event, { item: props.item });
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
