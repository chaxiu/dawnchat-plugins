class SDKError(Exception):
    pass


class HostConnectionError(SDKError):
    pass


class HostAPIError(SDKError):
    def __init__(self, message: str, status_code: int = 0, detail: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail
