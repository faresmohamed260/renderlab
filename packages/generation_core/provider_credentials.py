"""Credential-vault access for model download providers."""

from __future__ import annotations

import os
from typing import Any


PROVIDERS = {
    "huggingface": {"name": "Hugging Face", "environment": "HF_TOKEN"},
    "civitai": {"name": "Civitai", "environment": "CIVITAI_API_KEY"},
}


class ProviderCredentialStore:
    service_name = "RenderLab"

    def __init__(self, backend: Any | None = None) -> None:
        if backend is None:
            try:
                import keyring
            except ImportError as exc:  # pragma: no cover
                raise RuntimeError("The Studio credential vault dependency is not installed.") from exc
            backend = keyring
        self.backend = backend

    def statuses(self) -> dict[str, Any]:
        return {"providers": [self.status(provider_id) for provider_id in PROVIDERS]}

    def status(self, provider_id: str) -> dict[str, Any]:
        provider = self._provider(provider_id)
        stored = self._stored(provider_id)
        from_environment = bool(str(os.getenv(provider["environment"]) or "").strip())
        return {
            "id": provider_id,
            "name": provider["name"],
            "configured": bool(stored or from_environment),
            "source": "credential_vault" if stored else ("environment" if from_environment else "none"),
        }

    def get(self, provider_id: str) -> str:
        provider = self._provider(provider_id)
        return self._stored(provider_id) or str(os.getenv(provider["environment"]) or "").strip()

    def save(self, provider_id: str, api_key: str) -> dict[str, Any]:
        self._provider(provider_id)
        normalized = str(api_key or "").strip()
        if not normalized:
            raise ValueError("API key is required.")
        if len(normalized) > 4096:
            raise ValueError("API key is too long.")
        self.backend.set_password(self.service_name, provider_id, normalized)
        return self.status(provider_id)

    def delete(self, provider_id: str) -> dict[str, Any]:
        self._provider(provider_id)
        try:
            self.backend.delete_password(self.service_name, provider_id)
        except Exception as exc:
            if self._stored(provider_id):
                raise RuntimeError("The credential vault could not remove this API key.") from exc
        return self.status(provider_id)

    def _stored(self, provider_id: str) -> str:
        return str(self.backend.get_password(self.service_name, provider_id) or "").strip()

    @staticmethod
    def _provider(provider_id: str) -> dict[str, str]:
        normalized = str(provider_id or "").strip().casefold()
        if normalized not in PROVIDERS:
            raise KeyError(provider_id)
        return PROVIDERS[normalized]
