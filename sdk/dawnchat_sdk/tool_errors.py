from __future__ import annotations

from .host_exceptions import HostAPIError, HostConnectionError, SDKError


class ToolCallError(SDKError):
    """Base error for SDK tool gateway failures."""


class ToolTimeoutError(ToolCallError):
    """Raised when an async tool call exceeds timeout."""


class ToolCancelledError(ToolCallError):
    """Raised when a task has been cancelled."""


class ToolExecutionError(ToolCallError):
    """Raised when tool execution fails on host side."""


class ToolTransportError(ToolCallError):
    """Raised when transport or host connectivity fails."""



def map_host_error(error: Exception) -> ToolCallError:
    """Map host SDK exceptions to normalized ToolCallError hierarchy."""
    if isinstance(error, ToolCallError):
        return error

    if isinstance(error, HostConnectionError):
        return ToolTransportError(str(error))

    if isinstance(error, HostAPIError):
        message = str(error)
        detail = str(error.detail or "").lower()
        full = f"{message} {detail}".lower()
        if "timeout" in full:
            return ToolTimeoutError(message)
        if "cancel" in full:
            return ToolCancelledError(message)
        return ToolExecutionError(message)

    return ToolExecutionError(str(error))
