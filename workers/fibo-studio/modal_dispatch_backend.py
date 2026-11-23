"""Modal image-worker adapter for the recoverable dispatcher."""
from __future__ import annotations

import struct

from dispatch_core import Lookup, LookupState, PermanentDispatchError, UnknownDispatchOutcome
from native_gateway import CALL_ID, validate_payload
from workload_contract import FIBO_MODEL_KEY, FIBO_MODEL_VERSION, Operation, PRODUCTION_CATALOG


class ModalImageBackend:
    def __init__(self, store, render_function, sign_call):
        self.store = store
        self.render_function = render_function
        self.sign_call = sign_call

    def lookup(self, attempt_id):
        result = self.store.lookup(attempt_id)
        if result.state is LookupState.ACCEPTED and result.handle and CALL_ID.fullmatch(result.handle):
            return Lookup(LookupState.ACCEPTED, self.sign_call(result.handle))
        return result

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
            source_operation = Operation.EDIT_IMAGE if inputs["sources"] else Operation.CREATE_IMAGE
            if source_operation.value != intent.operation:
                raise ValueError("FIBO operation does not match its bound sources")
        except (TypeError, ValueError, RecursionError, ZeroDivisionError, struct.error) as error:
            # Only input validation is permanent; ambiguous provider sends must
            # still reconcile by attempt ID rather than blindly retry.
            raise PermanentDispatchError(str(error)) from error
        if not self.store.reserve_send(intent.attempt_id):
            raise UnknownDispatchOutcome("Provider submission could not be reserved")
        try:
            call = self.render_function.spawn(
                dispatch_attempt_id=intent.attempt_id,
                admission_deadline=intent.admission_deadline.isoformat(),
                model_binding=(intent.model_key, intent.model_version, intent.operation),
                **inputs,
            )
            return self.sign_call(getattr(call, "object_id", None))
        except UnknownDispatchOutcome:
            raise
        except Exception as error:
            # A disconnected spawn response is ambiguous. The dispatcher will
            # reconcile the stable attempt and will never blindly resubmit it.
            raise UnknownDispatchOutcome("Modal submission outcome is unknown") from error
