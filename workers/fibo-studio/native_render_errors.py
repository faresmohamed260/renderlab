"""Shared private error identity for the CPU gateway and GPU renderer.

A renderer timeout means the accepted invocation stopped; readiness expiry is
also terminal after session cleanup. It is never a pending nonblocking SDK poll
or permission to resubmit an existing attempt. Keep this module lightweight and
packaged in both images so remote exception serialization preserves the type.
"""


class FiboRenderTimeout(RuntimeError):
    """The renderer's invocation ended without a result due to a timeout."""
