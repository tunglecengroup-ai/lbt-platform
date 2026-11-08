/** Dữ liệu có cấu trúc schema.org cho Google / AI search (SEO + AEO). Escape "<" để không thoát khỏi thẻ script. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
