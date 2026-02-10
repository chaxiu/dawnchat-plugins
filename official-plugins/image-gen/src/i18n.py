import json
from pathlib import Path

class I18n:
    def __init__(self):
        self.locales = {}
        self.current_lang = 'zh'  # Default to zh
        self.load_locales()
    
    def load_locales(self):
        locale_dir = Path(__file__).parent / 'locales'
        if not locale_dir.exists():
            return
            
        for file in locale_dir.glob('*.json'):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    self.locales[file.stem] = json.load(f)
            except Exception as e:
                print(f"Failed to load locale {file}: {e}")
                
    def set_lang(self, lang: str):
        # Support zh-CN -> zh mapping
        if lang.startswith('zh'):
            lang = 'zh'
        elif lang.startswith('en'):
            lang = 'en'
            
        self.current_lang = lang if lang in self.locales else 'en'
        
    def t(self, key: str) -> str:
        keys = key.split('.')
        value = self.locales.get(self.current_lang, {})
        
        try:
            for k in keys:
                if isinstance(value, dict):
                    value = value.get(k, key)
                else:
                    return key
            return str(value)
        except Exception:
            return key

i18n = I18n()
