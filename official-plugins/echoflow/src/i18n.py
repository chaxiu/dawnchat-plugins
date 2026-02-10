"""
Internationalization support for EchoFlow plugin.
"""

import json
from pathlib import Path
from typing import Dict

_translations: Dict[str, Dict[str, str]] = {}
_locales_dir = Path(__file__).parent / "locales"


def _load_translations():
    """Load all translation files."""
    global _translations
    if _translations:
        return
    
    for locale_file in _locales_dir.glob("*.json"):
        lang = locale_file.stem
        with open(locale_file, "r", encoding="utf-8") as f:
            _translations[lang] = json.load(f)


class I18n:
    """Simple i18n helper."""
    
    def t(self, key: str, lang: str = "zh") -> str:
        """Get translation for key."""
        _load_translations()
        
        translations = _translations.get(lang, _translations.get("en", {}))
        return translations.get(key, key)


i18n = I18n()




