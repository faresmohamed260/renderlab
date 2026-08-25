"""Studio persistence facade using the repository's shared SQLAlchemy runtime."""

from __future__ import annotations

import hashlib
import mimetypes
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from .schema import (
    StudioAssetRow,
    StudioGenerationOutputRow,
    StudioGenerationRow,
    StudioJobEventRow,
    StudioSessionRow,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StudioStore:
    def __init__(self, *, session_factory: sessionmaker, objects: Any) -> None:
        self.session_factory = session_factory
        self.objects = objects
        self.bucket_name = "studio-assets"
        self.objects.ensure_bucket(self.bucket_name, public=False)

    def create_session(self, *, name: str = "Untitled exploration", project_id: str = "") -> dict[str, Any]:
        row = StudioSessionRow(session_id=f"session-{uuid.uuid4().hex}", project_id=project_id, name=name.strip() or "Untitled exploration")
        with self.session_factory.begin() as session:
            session.add(row)
        return self.get_session(row.session_id, include_generations=False) or {}

    def list_sessions(self, *, limit: int = 100) -> list[dict[str, Any]]:
        with self.session_factory() as session:
            rows = session.execute(select(StudioSessionRow).order_by(StudioSessionRow.updated_at.desc()).limit(limit)).scalars().all()
            return [self._session_payload(row) for row in rows]

    def get_session(self, session_id: str, *, include_generations: bool = True) -> dict[str, Any] | None:
        with self.session_factory() as session:
            row = session.get(StudioSessionRow, session_id)
            if row is None:
                return None
            payload = self._session_payload(row)
            if include_generations:
                generations = session.execute(
                    select(StudioGenerationRow)
                    .where(StudioGenerationRow.session_id == session_id)
                    .order_by(StudioGenerationRow.created_at.asc())
                ).scalars().all()
                payload["generations"] = [self._generation_payload(session, item) for item in generations]
            return payload

    def rename_session(self, session_id: str, name: str) -> dict[str, Any] | None:
        with self.session_factory.begin() as session:
            row = session.get(StudioSessionRow, session_id)
            if row is None:
                return None
            row.name = name.strip() or row.name
            row.updated_at = _utcnow()
        return self.get_session(session_id, include_generations=False)

    def create_asset(self, *, filename: str, content_type: str, data: bytes, kind: str = "upload", source_generation_id: str = "", metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        media_type = self._media_type(content_type)
        asset_id = f"asset-{uuid.uuid4().hex}"
        suffix = mimetypes.guess_extension(content_type) or ".bin"
        safe_name = "".join(character for character in filename if character.isalnum() or character in "-_. ").strip()[:180]
        object_path = f"{kind}/{asset_id}/{safe_name or ('asset' + suffix)}"
        self.objects.upload_bytes(self.bucket_name, object_path, data, content_type=content_type, upsert=False)
        width, height = self._image_dimensions(data, content_type)
        if media_type == "image":
            thumbnail_path, thumbnail_data = self._thumbnail_data(asset_id, data, content_type=content_type)
            self.objects.upload_bytes(self.bucket_name, thumbnail_path, thumbnail_data, content_type="image/jpeg", upsert=True)
        row = StudioAssetRow(
            asset_id=asset_id,
            source_generation_id=source_generation_id,
            kind=kind,
            media_type=media_type,
            filename=safe_name or f"asset{suffix}",
            bucket_name=self.bucket_name,
            object_path=object_path,
            content_type=content_type,
            byte_length=len(data),
            sha256=hashlib.sha256(data).hexdigest(),
            width=width,
            height=height,
            metadata_json=dict(metadata or {}),
        )
        with self.session_factory.begin() as session:
            session.add(row)
        return self.get_asset(asset_id) or {}

    def get_asset(self, asset_id: str) -> dict[str, Any] | None:
        with self.session_factory() as session:
            row = session.get(StudioAssetRow, asset_id)
            return self._asset_payload(row) if row else None

    def asset_bytes(self, asset_id: str) -> tuple[dict[str, Any], bytes]:
        asset = self.get_asset(asset_id)
        if asset is None:
            raise FileNotFoundError(asset_id)
        return asset, self.objects.download_bytes(asset["bucket_name"], asset["object_path"])

    def thumbnail_bytes(self, asset_id: str) -> tuple[dict[str, Any], bytes]:
        asset = self.get_asset(asset_id)
        if asset is None or asset["media_type"] != "image":
            raise FileNotFoundError(asset_id)
        thumbnail_path = self._thumbnail_path(asset_id)
        try:
            return asset, self.objects.download_bytes(self.bucket_name, thumbnail_path)
        except FileNotFoundError:
            data = self.objects.download_bytes(asset["bucket_name"], asset["object_path"])
            thumbnail_path, thumbnail_data = self._thumbnail_data(asset_id, data, content_type=asset["content_type"])
            self.objects.upload_bytes(self.bucket_name, thumbnail_path, thumbnail_data, content_type="image/jpeg", upsert=True)
            return asset, thumbnail_data

    def list_assets(self, *, media_type: str = "", favorite: bool | None = None, workflow_id: str = "", limit: int = 60, offset: int = 0) -> dict[str, Any]:
        with self.session_factory() as session:
            stmt = select(StudioAssetRow).where(StudioAssetRow.kind == "output")
            if media_type:
                stmt = stmt.where(StudioAssetRow.media_type == media_type)
            if favorite is not None:
                stmt = stmt.where(StudioAssetRow.favorite == favorite)
            if workflow_id:
                stmt = stmt.where(StudioAssetRow.metadata_json["workflow_id"].as_string() == workflow_id)
            total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
            rows = session.execute(stmt.order_by(StudioAssetRow.created_at.desc()).offset(offset).limit(limit)).scalars().all()
            return {"items": [self._asset_payload(row) for row in rows], "total": int(total), "limit": limit, "offset": offset}

    def set_favorite(self, asset_id: str, favorite: bool) -> dict[str, Any] | None:
        with self.session_factory.begin() as session:
            row = session.get(StudioAssetRow, asset_id)
            if row is None:
                return None
            row.favorite = favorite
        return self.get_asset(asset_id)

    def create_generation(self, *, generation_id: str, job_id: str, session_id: str, workflow: Any, request: Any, parameters: dict[str, Any], workflow_hash: str) -> dict[str, Any]:
        row = StudioGenerationRow(
            generation_id=generation_id,
            job_id=job_id,
            session_id=session_id,
            workflow_id=workflow.id,
            workflow_version=workflow.version,
            model_family=workflow.model_family,
            operation=request.operation,
            parent_generation_id=request.parent_generation_id,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=int(parameters.get("seed", -1)),
            parameters_json=parameters,
            references_json=[item.model_dump() for item in request.references],
            workflow_hash=workflow_hash,
        )
        with self.session_factory.begin() as session:
            if session.get(StudioSessionRow, session_id) is None:
                raise KeyError(session_id)
            session.add(row)
            parent = session.get(StudioSessionRow, session_id)
            parent.updated_at = _utcnow()
        self.add_event(job_id, event_type="job.queued", status="queued", phase="Queued", message="Generation added to the queue.")
        return self.get_generation(generation_id) or {}

    def update_generation(self, generation_id: str, *, status: str, phase: str, error_code: str = "", error_message: str = "", technical_error: dict[str, Any] | None = None) -> dict[str, Any] | None:
        now = _utcnow()
        with self.session_factory.begin() as session:
            row = session.get(StudioGenerationRow, generation_id)
            if row is None:
                return None
            row.status = status
            row.phase = phase
            if status == "running" and row.started_at is None:
                row.started_at = now
            if status in {"completed", "failed", "cancelled"}:
                row.completed_at = now
            row.error_code = error_code
            row.error_message = error_message
            row.technical_error_json = dict(technical_error or {})
        return self.get_generation(generation_id)

    def attach_output(self, generation_id: str, asset_id: str, *, ordinal: int = 0, output_key: str = "images") -> None:
        with self.session_factory.begin() as session:
            session.add(StudioGenerationOutputRow(
                output_id=f"output-{uuid.uuid4().hex}", generation_id=generation_id, asset_id=asset_id,
                output_key=output_key, ordinal=ordinal,
            ))

    def get_generation(self, generation_id: str) -> dict[str, Any] | None:
        with self.session_factory() as session:
            row = session.get(StudioGenerationRow, generation_id)
            return self._generation_payload(session, row) if row else None

    def generation_for_job(self, job_id: str) -> dict[str, Any] | None:
        with self.session_factory() as session:
            row = session.execute(select(StudioGenerationRow).where(StudioGenerationRow.job_id == job_id)).scalar_one_or_none()
            return self._generation_payload(session, row) if row else None

    def list_queue(self) -> list[dict[str, Any]]:
        with self.session_factory() as session:
            rows = session.execute(
                select(StudioGenerationRow)
                .where(StudioGenerationRow.status.in_(["queued", "preparing", "running", "saving", "cancelling"]))
                .order_by(StudioGenerationRow.created_at.asc())
            ).scalars().all()
            return [self._generation_payload(session, row) for row in rows]

    def add_event(self, job_id: str, *, event_type: str, status: str, phase: str, message: str = "", payload: dict[str, Any] | None = None) -> dict[str, Any]:
        with self.session_factory.begin() as session:
            sequence = int(session.scalar(select(func.count()).select_from(StudioJobEventRow).where(StudioJobEventRow.job_id == job_id)) or 0) + 1
            row = StudioJobEventRow(
                event_id=f"event-{uuid.uuid4().hex}", job_id=job_id, sequence=sequence,
                event_type=event_type, status=status, phase=phase, message=message, payload_json=dict(payload or {}),
            )
            session.add(row)
        return self._event_payload(row)

    def list_events(self, job_id: str, *, after_sequence: int = 0) -> list[dict[str, Any]]:
        with self.session_factory() as session:
            rows = session.execute(
                select(StudioJobEventRow)
                .where(StudioJobEventRow.job_id == job_id, StudioJobEventRow.sequence > after_sequence)
                .order_by(StudioJobEventRow.sequence.asc())
            ).scalars().all()
            return [self._event_payload(row) for row in rows]

    @staticmethod
    def _session_payload(row: StudioSessionRow) -> dict[str, Any]:
        return {
            "id": row.session_id, "project_id": row.project_id, "name": row.name,
            "created_at": row.created_at.isoformat(), "updated_at": row.updated_at.isoformat(),
        }

    def _generation_payload(self, session: Any, row: StudioGenerationRow) -> dict[str, Any]:
        outputs = session.execute(
            select(StudioAssetRow)
            .join(StudioGenerationOutputRow, StudioGenerationOutputRow.asset_id == StudioAssetRow.asset_id)
            .where(StudioGenerationOutputRow.generation_id == row.generation_id)
            .order_by(StudioGenerationOutputRow.ordinal.asc())
        ).scalars().all()
        return {
            "id": row.generation_id, "job_id": row.job_id, "session_id": row.session_id,
            "workflow_id": row.workflow_id, "workflow_version": row.workflow_version,
            "model_family": row.model_family, "operation": row.operation,
            "parent_generation_id": row.parent_generation_id, "prompt": row.prompt,
            "negative_prompt": row.negative_prompt, "seed": row.seed,
            "parameters": dict(row.parameters_json or {}), "references": list(row.references_json or []),
            "workflow_hash": row.workflow_hash, "status": row.status, "phase": row.phase,
            "error": {"code": row.error_code, "message": row.error_message} if row.error_code else None,
            "outputs": [self._asset_payload(item) for item in outputs],
            "created_at": row.created_at.isoformat(),
            "started_at": row.started_at.isoformat() if row.started_at else "",
            "completed_at": row.completed_at.isoformat() if row.completed_at else "",
        }

    @staticmethod
    def _asset_payload(row: StudioAssetRow) -> dict[str, Any]:
        return {
            "id": row.asset_id, "source_generation_id": row.source_generation_id,
            "kind": row.kind, "media_type": row.media_type, "filename": row.filename,
            "bucket_name": row.bucket_name, "object_path": row.object_path,
            "content_type": row.content_type, "byte_length": row.byte_length,
            "sha256": row.sha256, "width": row.width, "height": row.height,
            "duration_ms": row.duration_ms, "favorite": bool(row.favorite),
            "metadata": dict(row.metadata_json or {}), "created_at": row.created_at.isoformat(),
            "content_url": f"/studio/assets/{row.asset_id}/content",
            "thumbnail_url": f"/studio/assets/{row.asset_id}/thumbnail" if row.media_type == "image" else f"/studio/assets/{row.asset_id}/content",
        }

    @staticmethod
    def _event_payload(row: StudioJobEventRow) -> dict[str, Any]:
        return {
            "id": row.event_id, "job_id": row.job_id, "sequence": row.sequence,
            "event_type": row.event_type, "status": row.status, "phase": row.phase,
            "message": row.message, "payload": dict(row.payload_json or {}),
            "created_at": row.created_at.isoformat(),
        }

    @staticmethod
    def _media_type(content_type: str) -> str:
        if content_type.startswith("image/"):
            return "image"
        if content_type.startswith("video/"):
            return "video"
        raise ValueError(f"unsupported media type '{content_type}'")

    @staticmethod
    def _image_dimensions(data: bytes, content_type: str) -> tuple[int, int]:
        if not content_type.startswith("image/"):
            return 0, 0
        with Image.open(BytesIO(data)) as image:
            return int(image.width), int(image.height)

    @staticmethod
    def _thumbnail_path(asset_id: str) -> str:
        return f"thumbnails/{asset_id}/256.jpg"

    @classmethod
    def _thumbnail_data(cls, asset_id: str, data: bytes, *, content_type: str) -> tuple[str, bytes]:
        if not content_type.startswith("image/"):
            raise ValueError("thumbnails are only available for image assets")
        with Image.open(BytesIO(data)) as image:
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            output = BytesIO()
            image.convert("RGB").save(output, format="JPEG", quality=82, optimize=True, progressive=True)
            return cls._thumbnail_path(asset_id), output.getvalue()
