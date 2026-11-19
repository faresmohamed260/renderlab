"""Modal image-worker adapter for the recoverable dispatcher."""
from __future__ import annotations

from dispatch_core import PermanentDispatchError, UnknownDispatchOutcome
from native_gateway import validate_payload
from workload_contract import FIBO_MODEL_KEY, FIBO_MODEL_VERSION, Operation, PRODUCTION_CATALOG


class ModalImageBackend:
    def __init__(self, store, render_function):
        self.store = store
        self.render_function = render_function

    def lookup(self, attempt_id):
        return self.store.lookup(attempt_id)

    def submit(self, intent):
        try:
            PRODUCTION_CATALOG.resolve(
                key=intent.model_key,
                version=intent.model_version,
                operation=Operation(intent.operation),
            )
            if (intent.model_key, intent.model_version) != (FIBO_MODEL_KEY, FIBO_MODEL_VERSION):
                raise ValueError("Dispatch binding is not the active FIBO version")
            inputs = validate_payload(dict(intent.payload))
        except (TypeError, ValueError) as error:
            raise PermanentDispatchError(str(error)) from error
        try:
            call = self.render_function.spawn(
                dispatch_attempt_id=intent.attempt_id,
                admission_deadline=intent.admission_deadline.isoformat(),
                **inputs,
            )
            if not getattr(call, "object_id", None):
                raise UnknownDispatchOutcome("Modal accepted no readable execution handle")
            return call.object_id
        except UnknownDispatchOutcome:
            raise
        except Exception as error:
            # A disconnected spawn response is ambiguous. The dispatcher will
            # reconcile the stable attempt and will never blindly resubmit it.
            raise UnknownDispatchOutcome("Modal submission outcome is unknown") from error
