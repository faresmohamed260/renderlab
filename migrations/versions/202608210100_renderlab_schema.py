"""Add durable RenderLab sessions, generations, assets, outputs, and events."""

from alembic import op

revision = "202608210100"
down_revision = "202608120100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    create table if not exists public.studio_sessions (
      session_id varchar(160) primary key,
      project_id varchar(160) not null default '',
      name varchar(240) not null,
      metadata_json json not null default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists public.studio_generations (
      generation_id varchar(160) primary key,
      job_id varchar(160) not null unique,
      session_id varchar(160) not null references public.studio_sessions(session_id) on delete cascade,
      workflow_id varchar(160) not null,
      workflow_version varchar(64) not null default '',
      model_family varchar(160) not null default '',
      operation varchar(48) not null default 'generate',
      parent_generation_id varchar(160) not null default '',
      prompt text not null default '', negative_prompt text not null default '',
      seed bigint not null default -1,
      parameters_json json not null default '{}', references_json json not null default '[]',
      workflow_hash varchar(64) not null default '', status varchar(64) not null default 'queued',
      phase varchar(120) not null default 'Queued', error_code varchar(120) not null default '',
      error_message text not null default '', technical_error_json json not null default '{}',
      created_at timestamptz not null default now(), started_at timestamptz null,
      completed_at timestamptz null, updated_at timestamptz not null default now()
    );
    create index if not exists ix_studio_generation_session on public.studio_generations(session_id, created_at);
    create index if not exists ix_studio_generation_status on public.studio_generations(status, created_at);
    create index if not exists ix_studio_generation_parent on public.studio_generations(parent_generation_id);
    create table if not exists public.studio_assets (
      asset_id varchar(160) primary key, source_generation_id varchar(160) not null default '',
      kind varchar(48) not null default 'upload', media_type varchar(32) not null,
      filename varchar(320) not null default '', bucket_name varchar(120) not null,
      object_path varchar(720) not null, content_type varchar(160) not null,
      byte_length bigint not null default 0, sha256 varchar(64) not null default '',
      width integer not null default 0, height integer not null default 0, duration_ms integer not null default 0,
      favorite boolean not null default false, metadata_json json not null default '{}',
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    create index if not exists ix_studio_asset_library on public.studio_assets(media_type, favorite, created_at);
    create index if not exists ix_studio_asset_generation on public.studio_assets(source_generation_id);
    create table if not exists public.studio_generation_outputs (
      output_id varchar(160) primary key,
      generation_id varchar(160) not null references public.studio_generations(generation_id) on delete cascade,
      asset_id varchar(160) not null references public.studio_assets(asset_id) on delete cascade,
      output_key varchar(120) not null default 'images', ordinal integer not null default 0
    );
    create index if not exists ix_studio_output_generation on public.studio_generation_outputs(generation_id, ordinal);
    create table if not exists public.studio_job_events (
      event_id varchar(160) primary key, job_id varchar(160) not null, sequence integer not null,
      event_type varchar(120) not null, status varchar(64) not null default '', phase varchar(120) not null default '',
      message text not null default '', payload_json json not null default '{}', created_at timestamptz not null default now()
    );
    create index if not exists ix_studio_event_job on public.studio_job_events(job_id, sequence);
    """)


def downgrade() -> None:
    op.execute("""
    drop table if exists public.studio_job_events;
    drop table if exists public.studio_generation_outputs;
    drop table if exists public.studio_assets;
    drop table if exists public.studio_generations;
    drop table if exists public.studio_sessions;
    """)
