import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ImageIcon, Images, RotateCcw, Video } from "lucide-react";

import { RenderLabBrand, RenderLabMark } from "@/components/brand/renderlab-brand";
import { Button } from "@/components/ui/button";

const operations = [
  {
    number: "01",
    title: "Create Image",
    body: "Start from a prompt and keep the result as durable RenderLab media.",
    icon: ImageIcon,
  },
  {
    number: "02",
    title: "Edit Image",
    body: "Guide a new image with one or two owned references and stable @image aliases.",
    icon: Images,
  },
  {
    number: "03",
    title: "Create Video",
    body: "Create video with curated aspect ratio, duration, audio, frame rate and resolution.",
    icon: Video,
  },
  {
    number: "04",
    title: "Animate Image",
    body: "Turn an owned image into motion while preserving the durable source for reuse.",
    icon: RotateCcw,
  },
] as const;

function serializeSearchParams(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }
  return query.toString();
}

function hasContinuationIntent(params: Record<string, string | string[] | undefined>) {
  return Object.prototype.hasOwnProperty.call(params, "source") || Object.prototype.hasOwnProperty.call(params, "action");
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (hasContinuationIntent(params)) {
    const query = serializeSearchParams(params);
    redirect(query ? `/create?${query}` : "/create");
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-canvas text-text">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] opacity-35 [background-image:linear-gradient(to_right,#11141a_1px,transparent_1px),linear-gradient(to_bottom,#11141a_1px,transparent_1px)] [background-size:72px_72px]"
      />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-20 pt-4 sm:px-8 lg:px-16 lg:pb-28 lg:pt-8">
        <header className="flex min-h-14 items-center rounded-2xl border border-border bg-[#0d0f13]/95 px-4 sm:px-6">
          <Link href="/" aria-label="RenderLab home" className="inline-flex min-h-11 items-center">
            <RenderLabBrand markClassName="size-7" textClassName="text-base sm:text-lg" />
          </Link>
          <span className="ml-3 hidden rounded-full border border-border bg-surface-2 px-3 py-1 text-[10px] font-semibold tracking-wide text-text-muted sm:inline-flex">
            Closed beta
          </span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/settings">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/create">
                Open Create
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-12 pb-20 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(500px,0.92fr)] lg:items-center lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">The creative workspace</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-text sm:text-6xl lg:text-[4.2rem] lg:leading-[1.03]">
              Create images. Shape them. Put them in motion.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-text-muted sm:text-lg">
              RenderLab brings image and video creation, reference-driven edits, reusable media, and retryable generation history into one focused workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">
                  Open Create
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/settings">Sign in</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs font-medium text-text-muted">Invitation-only access · No public sign-up</p>
          </div>

          <ProductPreview />
        </section>

        <section aria-labelledby="operations-heading" className="border-t border-border py-16 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Four verified operations</p>
          <div className="mt-4 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="operations-heading" className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Move from first idea to a reusable creative thread.
            </h2>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {operations.map(({ number, title: operationTitle, body, icon: Icon }) => (
              <article key={operationTitle} className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent">{number}</span>
                  <Icon aria-hidden="true" className="size-4 text-text-muted" />
                </div>
                <h3 className="mt-8 text-lg font-semibold text-text">{operationTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-text-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 border-t border-border py-16 lg:grid-cols-2 lg:py-20">
          <article className="rounded-2xl border border-border bg-surface-1 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Keep the work</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">References and results stay useful.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-text-muted sm:text-base">
              Create uploads become owned Library media. Generated results stay available for search, favorites, collections, download, rename, Edit and Animate continuation instead of disappearing after one generation.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-surface-1 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Keep the thread</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">History is part of the workspace.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-text-muted sm:text-base">
              Activity keeps generation status and history visible. Failed jobs can be retried from persisted product intent while the original historical attempt remains unchanged.
            </p>
          </article>
        </section>

        <section className="border-t border-border py-16 lg:py-20">
          <div className="flex flex-col gap-7 rounded-3xl border border-border bg-surface-1 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Closed beta</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Already invited? Your workspace is ready.</h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                RenderLab remains invitation-only. Sign in from Settings or open Create to draft before an authenticated action is required.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">Open Create</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/settings">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border pt-8 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="RenderLab home" className="inline-flex min-h-11 items-center text-text">
            <RenderLabBrand markClassName="size-6" textClassName="text-sm" />
          </Link>
          <p>Image and video creative workspace · Closed beta</p>
        </footer>
      </div>
    </main>
  );
}

function ProductPreview() {
  return (
    <div aria-label="RenderLab Create workspace preview" className="rounded-3xl border border-border bg-surface-1 p-4 shadow-2xl shadow-black/20 sm:p-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <RenderLabMark className="size-5 text-text" />
          <p className="text-sm font-semibold">Create</p>
        </div>
        <span className="text-xs font-semibold text-text-muted">Image</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Prompt</p>
            <p className="mt-3 text-sm leading-6 text-text">A studio portrait with precise lighting and a cobalt backdrop.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-lg border border-accent bg-surface-3 px-3 py-2 text-text">Image</span>
              <span className="rounded-lg border border-border px-3 py-2 text-text-muted">Video</span>
              <span className="rounded-lg bg-accent px-3 py-2 text-white">Generate</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-[#293044] text-xs font-semibold text-text">@1</div>
            <div>
              <p className="text-xs font-semibold text-text">@image1</p>
              <p className="mt-1 text-[11px] text-text-muted">Primary image · durable reference</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-[#151a24] p-3">
          <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-[#202634]">
            <div className="flex h-[72%] w-[66%] items-center justify-center rounded-[48%] bg-[#293248]">
              <div className="h-[52%] w-[64%] rounded-[48%] bg-[#34405a]" />
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-[11px] font-semibold text-text">Result saved to Library</p>
            <p className="mt-1 text-[10px] text-text-muted">Continue with Edit or Animate</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Create Image", "Edit Image", "Create Video", "Animate Image"].map((label) => (
          <span key={label} className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-center text-[10px] font-semibold text-text-muted">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
