"""
v2_player ondemand_help - On-demand help service.

This module provides on-demand help functionality for Smart Player v2.
When the user long-presses on the video or subtitle, it generates
a contextual explanation using LLM.

Features:
1. Long-press detection on video/subtitle
2. Context extraction from current playback position
3. LLM-based explanation generation
4. TTS playback of explanation

Usage:
    from services.v2_player.ondemand_help import OnDemandHelpService
    
    service = OnDemandHelpService(paths)
    explanation = await service.get_explanation(text, context)
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Dict, Optional

from dawnchat_sdk.host import host

from storage.v2_player import V2PlayerPaths

logger = logging.getLogger("echoflow.v2_player.ondemand_help")


class OnDemandHelpError(Exception):
    """Raised when on-demand help fails."""
    pass


# System prompt for explanation
EXPLANATION_SYSTEM_PROMPT = """你是一个英语学习助手。用户正在观看英语视频，遇到了不理解的内容。

请用简洁易懂的中文解释用户询问的内容。解释应该：
1. 简洁明了，不超过 100 字
2. 通俗易懂，适合英语学习者
3. 如果是词汇或短语，给出发音提示和例句
4. 如果是语法或句式，解释其用法
5. 如果是文化背景，简要说明

只输出解释内容，不要重复问题。"""


class OnDemandHelpService:
    """
    On-demand help service.
    
    Provides contextual explanations for content the user doesn't understand.
    """
    
    def __init__(
        self,
        paths: V2PlayerPaths,
        *,
        model: Optional[str] = None,
        cache_explanations: bool = True,
    ):
        """
        Initialize on-demand help service.
        
        Args:
            paths: V2PlayerPaths instance
            model: LLM model to use
            cache_explanations: Whether to cache explanations
        """
        self.paths = paths
        self.model = model
        self.cache_explanations = cache_explanations
        
        self._cache_dir = self.paths.root / "help_cache"
    
    async def get_explanation(
        self,
        text: str,
        *,
        context: Optional[str] = None,
        current_time: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Get explanation for the given text.
        
        Args:
            text: Text to explain (word, phrase, or sentence)
            context: Surrounding context (e.g., full sentence)
            current_time: Current playback time
        
        Returns:
            Dict with:
            - explanation: The explanation text
            - cached: Whether this was a cached result
            - tts_path: Path to TTS audio (if generated)
        """
        if not text.strip():
            raise OnDemandHelpError("Empty text provided")
        
        # Check cache
        cache_key = self._get_cache_key(text, context)
        cached = self._load_from_cache(cache_key)
        
        if cached:
            logger.debug(f"Using cached explanation for: {text[:30]}...")
            return {
                "explanation": cached["explanation"],
                "cached": True,
                "tts_path": cached.get("tts_path"),
            }
        
        # Generate explanation
        explanation = await self._generate_explanation(text, context)
        
        # Save to cache
        if self.cache_explanations:
            self._save_to_cache(cache_key, {"explanation": explanation})
        
        return {
            "explanation": explanation,
            "cached": False,
            "tts_path": None,
        }
    
    async def get_explanation_with_tts(
        self,
        text: str,
        *,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get explanation with TTS audio.
        
        Args:
            text: Text to explain
            context: Surrounding context
        
        Returns:
            Dict with explanation and tts_path
        """
        result = await self.get_explanation(text, context=context)
        
        if result.get("tts_path"):
            return result
        
        # Generate TTS
        try:
            tts_path = await self._generate_tts(result["explanation"])
            result["tts_path"] = tts_path
            
            # Update cache
            if self.cache_explanations:
                cache_key = self._get_cache_key(text, context)
                self._save_to_cache(cache_key, {
                    "explanation": result["explanation"],
                    "tts_path": tts_path,
                })
        except Exception as e:
            logger.warning(f"TTS generation failed: {e}")
        
        return result
    
    async def _generate_explanation(
        self,
        text: str,
        context: Optional[str],
    ) -> str:
        """Generate explanation using LLM."""
        # Build user prompt
        if context:
            user_prompt = f"上下文：{context}\n\n请解释：{text}"
        else:
            user_prompt = f"请解释：{text}"
        
        try:
            response = await host.ai.chat(
                messages=[
                    {"role": "system", "content": EXPLANATION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                model=self.model,
                temperature=0.5,
            )
            
            if response.get("status") != "success":
                raise OnDemandHelpError(f"LLM call failed: {response.get('message')}")
            
            return response.get("content", "").strip()
            
        except OnDemandHelpError:
            raise
        except Exception as e:
            logger.exception("Explanation generation failed")
            raise OnDemandHelpError(f"Failed to generate explanation: {e}") from e
    
    async def _generate_tts(self, text: str) -> str:
        """Generate TTS for explanation."""
        # Lazy import synthesize_tts
        try:
            from services.narrator import synthesize_tts
        except ImportError:
            raise OnDemandHelpError("TTS not available")
        
        # Generate unique filename
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
        output_path = self._cache_dir / f"help_{text_hash}.wav"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        await synthesize_tts(
            text=text,
            output_path=str(output_path),
            speaker="Emma",
            speed=1.0,
        )
        
        return str(output_path)
    
    def _get_cache_key(self, text: str, context: Optional[str]) -> str:
        """Generate cache key."""
        content = f"{text}||{context or ''}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]
    
    def _load_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Load from cache."""
        cache_file = self._cache_dir / f"{cache_key}.json"
        
        if not cache_file.exists():
            return None
        
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception:
            return None
    
    def _save_to_cache(self, cache_key: str, data: Dict[str, Any]) -> None:
        """Save to cache."""
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = self._cache_dir / f"{cache_key}.json"
        cache_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    
    def clear_cache(self) -> None:
        """Clear all cached explanations."""
        import shutil
        if self._cache_dir.exists():
            shutil.rmtree(self._cache_dir, ignore_errors=True)

