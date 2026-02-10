import json
from pathlib import Path
from typing import Dict


class I18n:
    def __init__(self, locale_dir: str = "locales"):
        self.locale_dir = Path(__file__).parent / locale_dir
        self.translations: Dict[str, Dict[str, str]] = {}
        self.load_translations()

    def load_translations(self) -> None:
        if not self.locale_dir.exists():
            return
        for file in self.locale_dir.glob("*.json"):
            lang = file.stem
            try:
                self.translations[lang] = json.loads(file.read_text(encoding="utf-8"))
            except Exception:
                continue

    def t(self, key: str, lang: str = "en") -> str:
        if lang in self.translations and key in self.translations[lang]:
            return self.translations[lang][key]
        if "en" in self.translations and key in self.translations["en"]:
            return self.translations["en"][key]
        return key


i18n = I18n()
