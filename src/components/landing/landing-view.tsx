import { Check, X, ChevronDown, PlayCircle, Quote } from "lucide-react";
import { linesOf, splitPair, type Block } from "@/lib/landing-blocks";
import { youtubeIdFrom } from "@/lib/site";
import { formatVND } from "@/lib/utils";
import type { TrackItem } from "@/lib/track";
import type { ChapterWithLessons, ReviewRow } from "@/lib/types";
import { Countdown, LandingCheckoutForm } from "./landing-client";

export type LandingCtx = {
  landingId: string;
  title: string;
  cover: string | null;
  price: number;
  compare: number | null;
  chapters: ChapterWithLessons[];
  reviews: ReviewRow[];
  item: TrackItem;
  preview?: boolean;
};

const Wrap = ({ children, tint, id }: { children: React.ReactNode; tint?: boolean; id?: string }) => (
  <section id={id} className={tint ? "bg-zinc-50" : "bg-white"}>
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">{children}</div>
  </section>
);
const H2 = ({ children }: { children: React.ReactNode }) =>
  children ? <h2 className="text-center text-2xl font-extrabold tracking-tight text-zinc-900 md:text-3xl">{children}</h2> : null;

function Video({ url, title }: { url: string; title: string }) {
  const id = youtubeIdFrom(url);
  if (!id) return null;
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-black shadow-xl">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
        title={title}
        className="absolute inset-0 size-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function CtaButton({ text }: { text?: string }) {
  return (
    <a
      href="#dang-ky"
      className="inline-flex h-14 items-center justify-center rounded-lg bg-[var(--lp)] px-8 text-lg font-bold text-white shadow-lg transition hover:brightness-110"
    >
      {text || "ĐĂNG KÝ NGAY"}
    </a>
  );
}

function Price({ ctx }: { ctx: LandingCtx }) {
  const off = ctx.compare && ctx.compare > ctx.price ? Math.round((1 - ctx.price / ctx.compare) * 100) : 0;
  return (
    <div className="flex flex-wrap items-baseline justify-center gap-3">
      {off > 0 && <span className="text-xl text-zinc-400 line-through">{formatVND(ctx.compare!)}</span>}
      <span className="text-4xl font-extrabold text-[var(--lp)] md:text-5xl">{ctx.price ? formatVND(ctx.price) : "Miễn phí"}</span>
      {off > 0 && <span className="rounded-full bg-[var(--lp)] px-2.5 py-1 text-sm font-bold text-white">-{off}%</span>}
    </div>
  );
}

export function LandingBlock({ block, ctx }: { block: Block; ctx: LandingCtx }) {
  const d = block.data;
  switch (block.type) {
    case "hero":
      return (
        <section className="bg-gradient-to-b from-zinc-950 to-zinc-800 text-white">
          <div className="mx-auto max-w-4xl px-4 py-10 text-center md:py-16">
            {d.badge && <p className="text-xs font-bold tracking-widest text-[var(--lp)] uppercase md:text-sm">{d.badge}</p>}
            <h1 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight whitespace-pre-line md:text-5xl">{d.headline || ctx.title}</h1>
            {d.subheadline && <p className="mx-auto mt-4 max-w-2xl text-base whitespace-pre-line text-zinc-300 md:text-lg">{d.subheadline}</p>}
            <div className="mt-8">
              {d.video && youtubeIdFrom(d.video) ? (
                <Video url={d.video} title={ctx.title} />
              ) : d.image || ctx.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.image || ctx.cover!} alt={ctx.title} className="mx-auto w-full rounded-xl shadow-xl" />
              ) : null}
            </div>
            <div className="mt-8"><CtaButton text={d.cta_text} /></div>
          </div>
        </section>
      );

    case "pain":
      return (
        <Wrap tint>
          <H2>{d.title}</H2>
          <ul className="mx-auto mt-8 max-w-2xl space-y-3">
            {linesOf(d.items).map((t, i) => (
              <li key={i} className="flex gap-3 rounded-lg bg-white p-4 shadow-sm">
                <X className="mt-0.5 size-5 shrink-0 text-red-500" />
                <span className="text-zinc-800">{t}</span>
              </li>
            ))}
          </ul>
          {d.closing && <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-semibold whitespace-pre-line text-zinc-900">{d.closing}</p>}
        </Wrap>
      );

    case "benefits": {
      const items = linesOf(d.items);
      if (!items.length) return null;
      return (
        <Wrap>
          <H2>{d.title}</H2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((line, i) => {
              const [a, b] = splitPair(line);
              return (
                <div key={i} className="flex gap-3 rounded-xl border border-zinc-200 p-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--lp)] text-white"><Check className="size-4" /></span>
                  <div>
                    <p className="font-semibold text-zinc-900">{a}</p>
                    {b && <p className="mt-1 text-sm text-zinc-600">{b}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Wrap>
      );
    }

    case "video":
      if (!d.video || !youtubeIdFrom(d.video)) return null;
      return (
        <Wrap tint>
          <H2>{d.title}</H2>
          <div className="mt-8"><Video url={d.video} title={d.title || ctx.title} /></div>
          {d.caption && <p className="mt-4 text-center whitespace-pre-line text-zinc-600">{d.caption}</p>}
        </Wrap>
      );

    case "curriculum": {
      if (!ctx.chapters.length) return null;
      const total = ctx.chapters.reduce((s, c) => s + c.lessons.length, 0);
      return (
        <Wrap>
          <H2>{d.title || "Nội dung khóa học"}</H2>
          <p className="mt-2 text-center text-zinc-600">{d.note || `${ctx.chapters.length} phần · ${total} bài học`}</p>
          <div className="mx-auto mt-8 max-w-2xl space-y-2">
            {ctx.chapters.map((ch, i) => (
              <details key={ch.id} open={i === 0} className="group rounded-lg border border-zinc-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-zinc-900">
                  <span>{ch.title}</span>
                  <span className="flex items-center gap-2 text-sm font-normal text-zinc-500">
                    {ch.lessons.length} bài <ChevronDown className="size-4 transition group-open:rotate-180" />
                  </span>
                </summary>
                <ul className="border-t border-zinc-100 px-4 py-2">
                  {ch.lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 py-1.5 text-sm text-zinc-700">
                      <PlayCircle className="size-4 shrink-0 text-zinc-400" /> {l.title}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </Wrap>
      );
    }

    case "instructor": {
      const stats = linesOf(d.stats).map(splitPair);
      return (
        <Wrap tint>
          <H2>{d.title}</H2>
          <div className="mt-8 grid items-center gap-8 md:grid-cols-[260px_1fr]">
            {d.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.image} alt={d.name} className="mx-auto aspect-square w-60 rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="mx-auto flex aspect-square w-60 items-center justify-center rounded-2xl bg-[var(--lp)] text-5xl font-extrabold text-white">
                {(d.name || "LBT").split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-2xl font-bold text-zinc-900">{d.name}</p>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-zinc-700">{d.bio}</p>
              {stats.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {stats.map(([n, l], i) => (
                    <div key={i} className="rounded-lg bg-white p-3 shadow-sm">
                      <p className="text-2xl font-extrabold text-[var(--lp)]">{n}</p>
                      <p className="text-sm text-zinc-600">{l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Wrap>
      );
    }

    case "testimonials": {
      const custom = linesOf(d.items).map(splitPair);
      const items = custom.length ? custom : ctx.reviews.map((r) => [r.role ? `${r.name} — ${r.role}` : r.name, r.content] as string[]);
      const images = linesOf(d.images);
      if (!items.length && !images.length) return null;
      return (
        <Wrap>
          <H2>{d.title}</H2>
          {items.length > 0 && (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {items.map(([who, text], i) => (
                <figure key={i} className="rounded-xl border border-zinc-200 p-5">
                  <Quote className="size-6 text-[var(--lp)]" />
                  <blockquote className="mt-2 whitespace-pre-line text-zinc-700">{text}</blockquote>
                  <figcaption className="mt-3 font-semibold text-zinc-900">— {who}</figcaption>
                </figure>
              ))}
            </div>
          )}
          {images.length > 0 && (
            <div className="mt-6 columns-2 gap-3 md:columns-3">
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="Cảm nhận học viên" loading="lazy" className="mb-3 w-full rounded-lg border border-zinc-200" />
              ))}
            </div>
          )}
        </Wrap>
      );
    }

    case "pricing":
      return (
        <Wrap tint>
          <div className="mx-auto max-w-xl rounded-2xl border-2 border-[var(--lp)] bg-white p-6 text-center shadow-xl md:p-8">
            <H2>{d.title}</H2>
            <p className="mt-2 text-zinc-600">{ctx.title}</p>
            <div className="mt-5"><Price ctx={ctx} /></div>
            {d.deadline && <Countdown deadline={d.deadline} />}
            {linesOf(d.bonuses).length > 0 && (
              <ul className="mt-6 space-y-2 text-left">
                {linesOf(d.bonuses).map((t, i) => (
                  <li key={i} className="flex gap-2 text-zinc-800"><Check className="mt-0.5 size-5 shrink-0 text-green-600" /> {t}</li>
                ))}
              </ul>
            )}
            <div className="mt-7"><CtaButton text={d.cta_text} /></div>
            {d.note && <p className="mt-4 text-sm whitespace-pre-line text-zinc-500">{d.note}</p>}
          </div>
        </Wrap>
      );

    case "faq": {
      const items = linesOf(d.items).map(splitPair);
      if (!items.length) return null;
      return (
        <Wrap>
          <H2>{d.title}</H2>
          <div className="mx-auto mt-8 max-w-2xl space-y-2">
            {items.map(([q, a], i) => (
              <details key={i} className="group rounded-lg border border-zinc-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-zinc-900">
                  {q} <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
                </summary>
                <p className="border-t border-zinc-100 p-4 whitespace-pre-line text-zinc-700">{a}</p>
              </details>
            ))}
          </div>
        </Wrap>
      );
    }

    case "text":
      return (
        <Wrap>
          <H2>{d.title}</H2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed whitespace-pre-line text-zinc-700">{d.body}</p>
        </Wrap>
      );

    case "cta":
      return (
        <section className="bg-[var(--lp)] text-white">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center">
            {d.title && <h2 className="text-2xl font-extrabold md:text-3xl">{d.title}</h2>}
            {d.subtitle && <p className="mt-3 whitespace-pre-line opacity-90">{d.subtitle}</p>}
            <a href="#dang-ky" className="mt-6 inline-flex h-14 items-center rounded-lg bg-white px-8 text-lg font-bold text-zinc-900 shadow-lg hover:bg-zinc-100">
              {d.cta_text || "ĐĂNG KÝ NGAY"}
            </a>
          </div>
        </section>
      );

    case "checkout":
      return <CheckoutBlock data={d} ctx={ctx} />;
  }
}

function CheckoutBlock({ data, ctx }: { data: Record<string, string>; ctx: LandingCtx }) {
  return (
    <Wrap tint id="dang-ky">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-xl md:p-8">
        <H2>{data.title || "Đăng ký ngay"}</H2>
        {data.subtitle && <p className="mt-2 text-zinc-600">{data.subtitle}</p>}
        <div className="my-5"><Price ctx={ctx} /></div>
        <LandingCheckoutForm landingId={ctx.landingId} buttonText={data.button_text || "TIẾP TỤC THANH TOÁN"} item={ctx.item} preview={ctx.preview} />
      </div>
    </Wrap>
  );
}

/** Cả trang: các khối theo thứ tự; nếu quên khối form thì tự thêm ở cuối để nút "Đăng ký" luôn có chỗ đến */
export function LandingView({ blocks, ctx }: { blocks: Block[]; ctx: LandingCtx }) {
  const hasCheckout = blocks.some((b) => b.type === "checkout");
  return (
    <>
      {blocks.map((b) => <LandingBlock key={b.id} block={b} ctx={ctx} />)}
      {!hasCheckout && <CheckoutBlock data={{}} ctx={ctx} />}
    </>
  );
}
