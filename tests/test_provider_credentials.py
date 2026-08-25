from packages.generation_core.provider_credentials import ProviderCredentialStore


class FakeVault:
    def __init__(self) -> None:
        self.values = {}

    def get_password(self, service, username):
        return self.values.get((service, username))

    def set_password(self, service, username, value):
        self.values[(service, username)] = value

    def delete_password(self, service, username):
        self.values.pop((service, username), None)


def test_provider_keys_are_masked_and_use_the_credential_vault(monkeypatch) -> None:
    monkeypatch.delenv("HF_TOKEN", raising=False)
    vault = FakeVault()
    store = ProviderCredentialStore(vault)
    saved = store.save("huggingface", "hf_secret")
    assert saved == {"id": "huggingface", "name": "Hugging Face", "configured": True, "source": "credential_vault"}
    assert "hf_secret" not in str(store.statuses())
    assert store.get("huggingface") == "hf_secret"
    assert store.delete("huggingface")["configured"] is False


def test_environment_key_is_reported_without_being_returned(monkeypatch) -> None:
    monkeypatch.setenv("CIVITAI_API_KEY", "private")
    status = ProviderCredentialStore(FakeVault()).status("civitai")
    assert status["configured"] is True
    assert status["source"] == "environment"
    assert "private" not in str(status)
