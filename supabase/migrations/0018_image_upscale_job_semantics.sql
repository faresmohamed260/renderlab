-- Phase 18B: make Image Upscale a truthful promptless generation-job operation.
--
-- Existing prompt-generation rows remain unchanged. The prompt column becomes
-- nullable only so `upscale-image` can persist without a synthetic prompt, while
-- a companion check preserves the nonblank-prompt invariant for all four existing
-- prompt-generation operations.

alter table public.generation_jobs
  alter column prompt drop not null;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_operation_check;

alter table public.generation_jobs
  add constraint generation_jobs_operation_check
  check (operation in (
    'create-image',
    'edit-image',
    'create-video',
    'animate-image',
    'upscale-image'
  ));

alter table public.generation_jobs
  drop constraint if exists generation_jobs_prompt_semantics_check;

alter table public.generation_jobs
  add constraint generation_jobs_prompt_semantics_check
  check (
    (operation = 'upscale-image' and prompt is null)
    or
    (
      operation in ('create-image', 'edit-image', 'create-video', 'animate-image')
      and prompt is not null
      and btrim(prompt) <> ''
    )
  );

comment on constraint generation_jobs_operation_check on public.generation_jobs is
  'RenderLab first-class creative operations, including fixed-scale Image Upscale.';
comment on constraint generation_jobs_prompt_semantics_check on public.generation_jobs is
  'Prompt generation requires a nonblank prompt; Image Upscale is intentionally promptless.';
