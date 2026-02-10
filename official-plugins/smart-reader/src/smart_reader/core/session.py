from dataclasses import dataclass
from typing import Optional


@dataclass
class SessionState:
    current_file_id: Optional[str] = None


class SessionManager:
    def __init__(self) -> None:
        self.state = SessionState()

    def set_current_file(self, file_id: str) -> None:
        self.state.current_file_id = file_id

    def get_current_file(self) -> Optional[str]:
        return self.state.current_file_id
