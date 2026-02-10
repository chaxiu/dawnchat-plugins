import json
from pathlib import Path
from typing import Dict, Optional

class I18n:
    def __init__(self, locale_dir: str = "locales"):
        self.locale_dir = Path(__file__).parent / locale_dir
        self.translations: Dict[str, Dict[str, str]] = {}
        self.load_translations()

    def load_translations(self):
        if not self.locale_dir.exists():
            return
            
        for file in self.locale_dir.glob("*.json"):
            lang = file.stem
            try:
                with open(file, "r", encoding="utf-8") as f:
                    self.translations[lang] = json.load(f)
            except Exception as e:
                print(f"Error loading translation {file}: {e}")

    def t(self, key: str, lang: str = "en") -> str:
        """Get translation for key and language."""
        # Try exact match
        if lang in self.translations and key in self.translations[lang]:
            return self.translations[lang][key]
        
        # Fallback to English
        if "en" in self.translations and key in self.translations["en"]:
            return self.translations["en"][key]
            
        # Return key as fallback
        return key

# Global instance
i18n = I18n()
