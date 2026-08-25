"""Relational Studio records built on the shared persistence metadata."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from packages.persistence_runtime.schema import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StudioSessionRow(Base):
    __tablename__ = "studio_sessions"

    session_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(160), default="")
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class StudioGenerationRow(Base):
    __tablename__ = "studio_generations"
    __table_args__ = (
        Index("ix_studio_generation_session", "session_id", "created_at"),
        Index("ix_studio_generation_status", "status", "created_at"),
        Index("ix_studio_generation_parent", "parent_generation_id"),
    )

    generation_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    session_id: Mapped[str] = mapped_column(ForeignKey("studio_sessions.session_id", ondelete="CASCADE"), nullable=False)
    workflow_id: Mapped[str] = mapped_column(String(160), nullable=False)
    workflow_version: Mapped[str] = mapped_column(String(64), default="")
    model_family: Mapped[str] = mapped_column(String(160), default="")
    operation: Mapped[str] = mapped_column(String(48), default="generate")
    parent_generation_id: Mapped[str] = mapped_column(String(160), default="")
    prompt: Mapped[str] = mapped_column(Text, default="")
    negative_prompt: Mapped[str] = mapped_column(Text, default="")
    seed: Mapped[int] = mapped_column(BigInteger, default=-1)
    parameters_json: Mapped[dict] = mapped_column(JSON, default=dict)
    references_json: Mapped[list] = mapped_column(JSON, default=list)
    workflow_hash: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(64), default="queued")
    phase: Mapped[str] = mapped_column(String(120), default="Queued")
    error_code: Mapped[str] = mapped_column(String(120), default="")
    error_message: Mapped[str] = mapped_column(Text, default="")
    technical_error_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class StudioAssetRow(Base):
    __tablename__ = "studio_assets"
    __table_args__ = (
        Index("ix_studio_asset_library", "media_type", "favorite", "created_at"),
        Index("ix_studio_asset_generation", "source_generation_id"),
    )

    asset_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    source_generation_id: Mapped[str] = mapped_column(String(160), default="")
    kind: Mapped[str] = mapped_column(String(48), default="upload")
    media_type: Mapped[str] = mapped_column(String(32), nullable=False)
    filename: Mapped[str] = mapped_column(String(320), default="")
    bucket_name: Mapped[str] = mapped_column(String(120), nullable=False)
    object_path: Mapped[str] = mapped_column(String(720), nullable=False)
    content_type: Mapped[str] = mapped_column(String(160), nullable=False)
    byte_length: Mapped[int] = mapped_column(BigInteger, default=0)
    sha256: Mapped[str] = mapped_column(String(64), default="")
    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class StudioGenerationOutputRow(Base):
    __tablename__ = "studio_generation_outputs"
    __table_args__ = (Index("ix_studio_output_generation", "generation_id", "ordinal"),)

    output_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    generation_id: Mapped[str] = mapped_column(ForeignKey("studio_generations.generation_id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[str] = mapped_column(ForeignKey("studio_assets.asset_id", ondelete="CASCADE"), nullable=False)
    output_key: Mapped[str] = mapped_column(String(120), default="images")
    ordinal: Mapped[int] = mapped_column(Integer, default=0)


class StudioJobEventRow(Base):
    __tablename__ = "studio_job_events"
    __table_args__ = (Index("ix_studio_event_job", "job_id", "sequence"),)

    event_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(160), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="")
    phase: Mapped[str] = mapped_column(String(120), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


STUDIO_TABLES = [
    StudioSessionRow.__table__,
    StudioGenerationRow.__table__,
    StudioAssetRow.__table__,
    StudioGenerationOutputRow.__table__,
    StudioJobEventRow.__table__,
]
