import "server-only";
import { createHash } from "node:crypto";

const FOUR_HOURS = 60 * 60 * 4;

/**
 * Link nhúng Bunny Stream có KÝ TOKEN (bật "Embed view token authentication" trong
 * thư viện Bunny). Link hết hạn sau 4 giờ -> chia sẻ ra ngoài cũng không xem được lâu.
 * token = SHA256_HEX(token_key + video_id + expires)
 */
export function bunnyEmbedUrl(videoId: string) {
  const library = process.env.BUNNY_LIBRARY_ID;
  if (!library) return null;

  const params = new URLSearchParams({ autoplay: "false", preload: "true", responsive: "true" });
  const key = process.env.BUNNY_TOKEN_KEY;
  if (key) {
    const expires = Math.floor(Date.now() / 1000) + FOUR_HOURS;
    const token = createHash("sha256").update(key + videoId + expires).digest("hex");
    params.set("token", token);
    params.set("expires", String(expires));
  }
  return `https://iframe.mediadelivery.net/embed/${library}/${videoId}?${params}`;
}

/** Ưu tiên Bunny, rơi về YouTube (tiện chuyển dần video cũ từ Edubit) */
export function lessonEmbedUrl(lesson: { bunny_video_id?: string | null; youtube_id?: string | null }) {
  if (lesson.bunny_video_id) return bunnyEmbedUrl(lesson.bunny_video_id);
  if (lesson.youtube_id) return `https://www.youtube-nocookie.com/embed/${lesson.youtube_id}?rel=0&modestbranding=1`;
  return null;
}
