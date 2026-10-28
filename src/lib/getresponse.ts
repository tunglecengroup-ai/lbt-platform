import "server-only";

/**
 * Đẩy học viên vào list GetResponse sau khi mua (để chạy chuỗi email chào mừng).
 * Không có GETRESPONSE_API_KEY hoặc khóa chưa gắn list -> bỏ qua, không lỗi đơn.
 */
export async function addToGetResponse(opts: {
  email: string;
  name?: string | null;
  campaignId?: string | null;
}) {
  const key = process.env.GETRESPONSE_API_KEY;
  const campaignId = opts.campaignId || process.env.GETRESPONSE_DEFAULT_CAMPAIGN_ID;
  if (!key || !campaignId) return { skipped: true };

  const res = await fetch("https://api.getresponse.com/v3/contacts", {
    method: "POST",
    headers: { "X-Auth-Token": `api-key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      name: opts.name || undefined,
      campaign: { campaignId },
    }),
  });
  // 409 = đã có trong list -> coi như thành công
  if (!res.ok && res.status !== 409) {
    console.error("GetResponse lỗi", res.status, await res.text());
    return { ok: false };
  }
  return { ok: true };
}
