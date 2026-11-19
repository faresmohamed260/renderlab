type RoutePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function RoutePlaceholder({ eyebrow, title, description }: RoutePlaceholderProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{eyebrow}</p>
      <h2 className="max-w-3xl text-2xl font-semibold tracking-tight text-text sm:text-[28px]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted sm:text-[15px]">{description}</p>

      <div className="mt-8 flex min-h-[28rem] items-center justify-center rounded-2xl border border-border bg-surface-1 px-6 text-center text-sm text-text-muted sm:min-h-[32rem]">
        Feature-owned workspace
      </div>
    </section>
  );
}
