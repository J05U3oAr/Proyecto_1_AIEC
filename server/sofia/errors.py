class PublicError(Exception):
    """Only these fixed messages may cross the HTTP boundary."""

    def __init__(
        self,
        code: str,
        message: str,
        status: int = 503,
        retryable: bool = False,
        retry_after: int | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.retryable = retryable
        self.retry_after = retry_after
        self.trace: list[dict[str, object]] = []
        self.usage: dict[str, int] = {}


def unavailable() -> PublicError:
    return PublicError(
        "upstream_unavailable", "No puedo consultar el servicio ahora.", retryable=True
    )
