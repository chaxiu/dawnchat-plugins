"""
v2_player player_page - Smart Player v2 main page.

This page implements the "continuous playback with auto-pause commentary" experience.

Key features:
- Video player with SmartScript-driven pause points
- Auto pause -> TTS playback -> auto resume
- Progress bar with marked pre-teach points
- Commentary status indicator
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, Optional

from nicegui import app, ui

from i18n import i18n
from storage.v2_player import SmartScript, SmartScriptEntry, V2PlayerPaths
from services.v2_player import V2Pipeline
from ui.practice_page_head import build_practice_head_html

if TYPE_CHECKING:
    from course.models import Course
    from storage.course_db import CourseDatabase


_STATIC_ROUTES: set[str] = set()


def _mount_static(route: str, directory: str) -> None:
    """Mount static files if not already mounted."""
    if route in _STATIC_ROUTES:
        return
    try:
        app.add_static_files(route, directory)
    except Exception:
        pass
    _STATIC_ROUTES.add(route)


def _build_v2_player_head_html(colors: Any) -> str:
    """Build additional CSS/JS for v2 player."""
    return f"""
    <style>
    .v2-player-container {{
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }}
    
    .v2-video-wrapper {{
        position: relative;
        width: 100%;
        background: {colors.bg_secondary};
        border-radius: 12px;
        overflow: hidden;
    }}
    
    .v2-video-wrapper video {{
        width: 100%;
        display: block;
    }}
    
    .v2-narrator-indicator {{
        position: absolute;
        bottom: 16px;
        right: 16px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: {colors.bg_secondary};
        border: 2px solid {colors.border};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        opacity: 0.6;
    }}
    
    .v2-narrator-indicator.speaking {{
        opacity: 1;
        border-color: {colors.primary};
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
        animation: v2-pulse 1.5s ease-in-out infinite;
    }}
    
    @keyframes v2-pulse {{
        0%, 100% {{ transform: scale(1); }}
        50% {{ transform: scale(1.05); }}
    }}
    
    .v2-progress-bar {{
        position: relative;
        width: 100%;
        height: 8px;
        background: {colors.bg_secondary};
        border-radius: 4px;
        margin: 1rem 0;
        cursor: pointer;
    }}
    
    .v2-progress-fill {{
        height: 100%;
        background: {colors.primary};
        border-radius: 4px;
        transition: width 0.1s linear;
    }}
    
    .v2-progress-marker {{
        position: absolute;
        top: -4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: {colors.warning};
        border: 2px solid {colors.bg_primary};
        transform: translateX(-50%);
        cursor: pointer;
        transition: transform 0.2s ease;
    }}
    
    .v2-progress-marker:hover {{
        transform: translateX(-50%) scale(1.2);
    }}
    
    .v2-progress-marker.gap-filling {{
        background: {colors.success};
    }}
    
    .v2-controls {{
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem 0;
    }}

    .v2-toggle-btn {{
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        background: {colors.primary};
        color: white;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
    }}

    .v2-toggle-btn:active {{
        transform: scale(0.98);
    }}

    .v2-settings-wrapper {{
        position: relative;
        display: inline-flex;
        align-items: center;
        margin-left: auto;
    }}

    .v2-settings-btn {{
        width: 36px;
        height: 36px;
        border-radius: 10px;
        border: 1px solid {colors.border};
        background: {colors.bg_secondary};
        color: {colors.text_secondary};
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }}

    .v2-settings-btn:hover {{
        background: {colors.bg_primary};
        color: {colors.text_primary};
        border-color: {colors.primary};
    }}

    .v2-settings-btn svg {{
        width: 18px;
        height: 18px;
    }}

    .v2-settings-panel {{
        position: absolute;
        right: 0;
        bottom: calc(100% + 8px);
        z-index: 100;
        width: 280px;
        padding: 1rem;
        background: {colors.bg_secondary};
        border: 1px solid {colors.border};
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }}

    .v2-settings-title {{
        font-size: 0.9rem;
        font-weight: 600;
        color: {colors.text_primary};
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid {colors.border};
    }}

    .v2-setting-row {{
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 0.85rem;
    }}

    .v2-setting-row:last-child {{
        margin-bottom: 0;
    }}

    .v2-setting-head {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        color: {colors.text_secondary};
        font-size: 0.85rem;
    }}

    .v2-setting-value {{
        color: {colors.text_primary};
        font-size: 0.85rem;
        font-weight: 500;
    }}

    .v2-setting-row input[type="range"] {{
        width: 100%;
        accent-color: {colors.primary};
    }}

    .v2-setting-toggle {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        cursor: pointer;
    }}

    .v2-setting-toggle-label {{
        color: {colors.text_secondary};
        font-size: 0.85rem;
    }}

    .v2-setting-toggle-switch {{
        position: relative;
        width: 40px;
        height: 22px;
        background: {colors.bg_primary};
        border-radius: 11px;
        transition: background 0.2s ease;
        cursor: pointer;
    }}

    .v2-setting-toggle-switch.active {{
        background: {colors.primary};
    }}

    .v2-setting-toggle-switch::after {{
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s ease;
    }}

    .v2-setting-toggle-switch.active::after {{
        transform: translateX(18px);
    }}

    .v2-setting-divider {{
        height: 1px;
        background: {colors.border};
        margin: 0.75rem 0;
    }}

    .v2-setting-action {{
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        margin: 4px -4px;
        border-radius: 8px;
        color: {colors.text_secondary};
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
    }}

    .v2-setting-action:hover {{
        background: rgba(99, 102, 241, 0.1);
        color: {colors.text_primary};
    }}

    .v2-setting-action svg {{
        width: 16px;
        height: 16px;
        flex-shrink: 0;
    }}
    
    .v2-time-display {{
        font-family: monospace;
        font-size: 0.9rem;
        color: {colors.text_secondary};
    }}
    
    .v2-commentary-panel {{
        background: {colors.bg_secondary};
        border: 1px solid {colors.border};
        border-radius: 12px;
        padding: 1rem;
        margin-top: 1rem;
        min-height: 80px;
    }}
    
    .v2-commentary-text {{
        color: {colors.text_primary};
        font-size: 1.1rem;
        line-height: 1.6;
    }}
    
    .v2-card {{
        background: {colors.bg_secondary};
        border: 1px solid {colors.border};
        border-radius: 12px;
        padding: 1rem;
    }}
    
    /* === Three Area Layout === */
    .v2-main-layout {{
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }}
    
    .v2-video-area {{
        position: relative;
        width: 100%;
        background: {colors.bg_secondary};
        border-radius: 12px;
        overflow: hidden;
    }}
    
    .v2-progress-area {{
        padding: 0.5rem 0;
    }}
    
    .v2-controls-area {{
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }}
    
    /* === ChapterStrip (Dropdown Style) === */
    .v2-chapter-dropdown {{
        position: relative;
        display: inline-flex;
        align-items: center;
    }}
    
    .v2-chapter-toggle {{
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: {colors.bg_secondary};
        border: 1px solid {colors.border};
        border-radius: 8px;
        color: {colors.text_primary};
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
        max-width: 200px;
    }}
    
    .v2-chapter-toggle:hover {{
        background: {colors.bg_primary};
        border-color: {colors.primary};
    }}
    
    .v2-chapter-toggle .v2-chapter-current {{
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }}
    
    .v2-chapter-toggle .v2-chapter-arrow {{
        transition: transform 0.2s ease;
        flex-shrink: 0;
    }}
    
    .v2-chapter-toggle.expanded .v2-chapter-arrow {{
        transform: rotate(180deg);
    }}
    
    .v2-chapter-menu {{
        position: absolute;
        bottom: calc(100% + 8px);
        left: 0;
        min-width: 220px;
        max-width: 320px;
        max-height: 300px;
        overflow-y: auto;
        background: {colors.bg_secondary};
        border: 1px solid {colors.border};
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        z-index: 100;
        display: none;
        animation: v2-fade-in 0.15s ease;
    }}
    
    @keyframes v2-fade-in {{
        from {{ opacity: 0; transform: translateY(4px); }}
        to {{ opacity: 1; transform: translateY(0); }}
    }}
    
    .v2-chapter-menu.visible {{
        display: block;
    }}
    
    .v2-chapter-list {{
        padding: 8px 0;
    }}
    
    .v2-chapter-item {{
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        cursor: pointer;
        transition: background 0.15s ease;
        color: {colors.text_secondary};
    }}
    
    .v2-chapter-item:hover {{
        background: rgba(99, 102, 241, 0.1);
        color: {colors.text_primary};
    }}
    
    .v2-chapter-item.active {{
        background: rgba(99, 102, 241, 0.15);
        color: {colors.primary};
    }}
    
    .v2-chapter-item .v2-chapter-index {{
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: {colors.bg_primary};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 600;
        flex-shrink: 0;
    }}
    
    .v2-chapter-item.active .v2-chapter-index {{
        background: {colors.primary};
        color: white;
    }}
    
    .v2-chapter-item .v2-chapter-title {{
        flex: 1;
        font-size: 0.85rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }}
    
    .v2-chapter-item .v2-chapter-time {{
        font-size: 0.75rem;
        color: {colors.text_disabled};
        flex-shrink: 0;
    }}
    
    /* === Narration Overlay === */
    .v2-overlay-container {{
        position: absolute;
        bottom: 60px;
        left: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
        z-index: 20;
    }}
    
    .v2-overlay-container > * {{
        pointer-events: auto;
    }}
    
    .v2-overlay-card {{
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        border-radius: 12px;
        padding: 1rem;
        max-width: 400px;
        animation: v2-slide-up 0.3s ease;
    }}
    
    @keyframes v2-slide-up {{
        from {{
            opacity: 0;
            transform: translateY(10px);
        }}
        to {{
            opacity: 1;
            transform: translateY(0);
        }}
    }}
    
    .v2-overlay-card.hidden {{
        display: none;
    }}
    
    .v2-overlay-title {{
        font-size: 0.9rem;
        font-weight: 600;
        color: white;
        margin-bottom: 0.5rem;
    }}
    
    .v2-overlay-body {{
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.5;
    }}
    
    .v2-overlay-tldr {{
        font-size: 0.9rem;
        color: white;
        margin-bottom: 0.5rem;
    }}
    
    .v2-overlay-bullets {{
        list-style: disc;
        padding-left: 1.25rem;
        margin: 0;
    }}
    
    .v2-overlay-bullets li {{
        margin-bottom: 0.25rem;
    }}
    
    /* === QA Card === */
    .v2-qa-question {{
        font-size: 0.95rem;
        font-weight: 600;
        color: white;
        margin-bottom: 0.75rem;
    }}
    
    .v2-qa-options {{
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }}
    
    .v2-qa-option {{
        padding: 0.5rem 0.75rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
    }}
    
    .v2-qa-option:hover {{
        background: rgba(255, 255, 255, 0.2);
    }}
    
    .v2-qa-option.correct {{
        background: rgba(34, 197, 94, 0.3);
        border-color: rgba(34, 197, 94, 0.5);
    }}
    
    .v2-qa-option.incorrect {{
        background: rgba(239, 68, 68, 0.3);
        border-color: rgba(239, 68, 68, 0.5);
    }}
    
    .v2-qa-explanation {{
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.8);
    }}
    </style>
    
    <script>
    (function() {{
        if (window.v2PlayerController) return;
        
        const state = {{
            script: null,
            currentEntryIndex: -1,
            isNarrating: false,
            autoPauseEnabled: true,
            videoDuration: 0,
            lastVideoTime: 0,
            settings: {{
                duckingVolume: 0.12,
                narrationRate: 1.0,
            }},
            videoBaseVolume: 1.0,
        }};

        const playedKeys = new Set();
        
        function getVideo() {{
            return document.getElementById('v2-video');
        }}
        
        function getNarrationAudio() {{
            return document.getElementById('v2-narration-audio');
        }}
        
        function getIndicator() {{
            return document.getElementById('v2-narrator-indicator');
        }}
        
        function getProgressFill() {{
            return document.getElementById('v2-progress-fill');
        }}
        
        function getTimeDisplay() {{
            return document.getElementById('v2-time-display');
        }}
        
        function getCommentaryText() {{
            return document.getElementById('v2-commentary-text');
        }}

        function getSettingsPanel() {{
            return document.getElementById('v2-settings-panel');
        }}

        function syncSettingsPanel() {{
            const duck = document.getElementById('v2-ducking-volume');
            const duckValue = document.getElementById('v2-ducking-volume-value');
            if (duck) duck.value = String(Number(state.settings.duckingVolume) || 0);
            if (duckValue) {{
                duckValue.textContent = Math.round((Number(state.settings.duckingVolume) || 0) * 100) + '%';
            }}

            const rate = document.getElementById('v2-narration-rate');
            const rateValue = document.getElementById('v2-narration-rate-value');
            if (rate) rate.value = String(Number(state.settings.narrationRate) || 1);
            if (rateValue) {{
                rateValue.textContent = (Number(state.settings.narrationRate) || 1).toFixed(2) + 'x';
            }}
            
            syncAutoPauseSwitch();
        }}
        
        function syncAutoPauseSwitch() {{
            const switchEl = document.getElementById('v2-auto-pause-switch');
            if (!switchEl) return;
            if (state.autoPauseEnabled) {{
                switchEl.classList.add('active');
            }} else {{
                switchEl.classList.remove('active');
            }}
        }}
        
        function formatTime(seconds) {{
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
        }}
        
        function updateProgress() {{
            const video = getVideo();
            const fill = getProgressFill();
            const timeDisplay = getTimeDisplay();
            if (!video || !fill) return;
            
            const current = video.currentTime || 0;
            const duration = (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : (state.videoDuration || 1));
            const percent = (current / duration) * 100;
            fill.style.width = percent + '%';
            
            if (timeDisplay) {{
                timeDisplay.textContent = formatTime(current) + ' / ' + formatTime(duration);
            }}
        }}
        
        function entryKey(entry, index) {{
            if (!entry) return '';
            if (entry.entry_id) return String(entry.entry_id);
            return String(index) + ':' + String(entry.time_in || 0);
        }}

        function findEntryToTrigger(lastTime, currentTime) {{
            if (!state.script || !state.script.entries) return null;
            const entries = state.script.entries;
            const epsilon = 0.15;
            for (let i = 0; i < entries.length; i++) {{
                const entry = entries[i];
                if (!entry || entry.action_type === 'ignore') continue;
                const k = entryKey(entry, i);
                if (k && playedKeys.has(k)) continue;
                const t = Number(entry.time_in || 0);
                if (t <= currentTime + epsilon && t >= lastTime - epsilon) {{
                    return {{ index: i, entry: entry }};
                }}
                if (t > currentTime + epsilon) {{
                    return null;
                }}
            }}
            return null;
        }}
        
        function checkPausePoints(lastTime, currentTime) {{
            if (!state.autoPauseEnabled || state.isNarrating) return;
            
            const video = getVideo();
            if (!video || video.paused) return;
            
            const next = findEntryToTrigger(lastTime, currentTime);
            if (next) triggerNarration(next.index, next.entry);
        }}
        
        // Smooth volume ducking
        const DUCKING_CONFIG = {{
            fadeInDuration: 300,
            fadeOutDuration: 200,
        }};
        
        let volumeFadeInterval = null;
        
        function smoothVolumeChange(video, targetVolume, duration, callback) {{
            if (volumeFadeInterval) {{
                clearInterval(volumeFadeInterval);
            }}
            
            const startVolume = video.volume;
            const volumeDiff = targetVolume - startVolume;
            const steps = 20;
            const stepDuration = duration / steps;
            let currentStep = 0;
            
            volumeFadeInterval = setInterval(function() {{
                currentStep++;
                const progress = currentStep / steps;
                // Ease out curve for smooth transition
                const easeProgress = 1 - Math.pow(1 - progress, 2);
                video.volume = startVolume + (volumeDiff * easeProgress);
                
                if (currentStep >= steps) {{
                    clearInterval(volumeFadeInterval);
                    volumeFadeInterval = null;
                    video.volume = targetVolume;
                    if (callback) callback();
                }}
            }}, stepDuration);
        }}
        
        function triggerNarration(index, entry) {{
            const video = getVideo();
            const audio = getNarrationAudio();
            const indicator = getIndicator();
            const commentaryText = getCommentaryText();
            
            if (!video) return;
            
            state.currentEntryIndex = index;
            state.isNarrating = true;
            const k = entryKey(entry, index);
            if (k) playedKeys.add(k);

            state.videoBaseVolume = video.volume;
            
            // Pause video for pre_teach_pause, or duck for gap_filling
            if (entry.action_type === 'pre_teach_pause') {{
                video.pause();
            }} else if (entry.action_type === 'gap_filling' && entry.ducking) {{
                // Smooth fade to ducked volume
                smoothVolumeChange(video, state.settings.duckingVolume, DUCKING_CONFIG.fadeInDuration);
            }}
            
            // Show indicator as speaking
            if (indicator) {{
                indicator.classList.add('speaking');
            }}
            
            // Show commentary text
            if (commentaryText) {{
                commentaryText.textContent = entry.script || '';
            }}
            
            // Show overlay widget if available
            if (entry.widget) {{
                window.v2PlayerController.showOverlay(entry);
            }}
            
            // Play TTS audio if available
            if (audio && entry.tts_path) {{
                audio.src = entry.tts_path;
                audio.playbackRate = Math.max(0.5, Math.min(2.0, Number(state.settings.narrationRate) || 1.0));
                audio.play().catch(function() {{}});
            }} else {{
                // No TTS, simulate narration duration
                const duration = (entry.estimated_duration || 2) * 1000;
                setTimeout(function() {{
                    endNarration(entry);
                }}, duration);
            }}
        }}
        
        function endNarration(entry) {{
            const video = getVideo();
            const indicator = getIndicator();
            
            state.isNarrating = false;
            
            if (indicator) {{
                indicator.classList.remove('speaking');
            }}
            
            // Hide overlay widget
            window.v2PlayerController.hideOverlay();
            
            // Resume video
            if (video) {{
                // Smooth fade back to full volume
                smoothVolumeChange(video, state.videoBaseVolume, DUCKING_CONFIG.fadeOutDuration, function() {{
                    if (entry && entry.action_type === 'pre_teach_pause') {{
                        video.play().catch(function() {{}});
                    }}
                }});
            }}
        }}
        
        window.v2PlayerController = {{
            setScript: function(script) {{
                state.script = script;
                state.currentEntryIndex = -1;
                playedKeys.clear();
                state.lastVideoTime = 0;
                if (state.script && Array.isArray(state.script.entries)) {{
                    state.script.entries.sort(function(a, b) {{
                        return (a.time_in || 0) - (b.time_in || 0);
                    }});
                }}
                renderMarkers();
                renderChapterStrip();
                renderScriptInfo();
            }},
            
            setAutoPause: function(enabled) {{
                state.autoPauseEnabled = Boolean(enabled);
                syncAutoPauseSwitch();
            }},

            toggleAutoPauseSetting: function() {{
                state.autoPauseEnabled = !state.autoPauseEnabled;
                syncAutoPauseSwitch();
            }},

            setSettings: function(settings) {{
                const s = settings || {{}};
                if (s.duckingVolume != null) {{
                    const v = Number(s.duckingVolume);
                    if (!Number.isNaN(v)) state.settings.duckingVolume = Math.max(0.0, Math.min(1.0, v));
                }}
                if (s.narrationRate != null) {{
                    const r = Number(s.narrationRate);
                    if (!Number.isNaN(r)) state.settings.narrationRate = Math.max(0.5, Math.min(2.0, r));
                }}
                const audio = getNarrationAudio();
                if (audio && state.isNarrating) {{
                    audio.playbackRate = Math.max(0.5, Math.min(2.0, Number(state.settings.narrationRate) || 1.0));
                }}
                const video = getVideo();
                const entry = state.script?.entries?.[state.currentEntryIndex];
                if (video && state.isNarrating && entry && entry.action_type === 'gap_filling' && entry.ducking) {{
                    smoothVolumeChange(video, state.settings.duckingVolume, 120);
                }}
                syncSettingsPanel();
            }},

            toggleSettingsMenu: function() {{
                const panel = getSettingsPanel();
                if (!panel) return;
                const visible = panel.style.display !== 'none';
                panel.style.display = visible ? 'none' : 'block';
                if (!visible) syncSettingsPanel();
            }},
            
            play: function() {{
                const video = getVideo();
                if (video) video.play().catch(function() {{}});
                syncPlayToggle();
            }},
            
            pause: function() {{
                const video = getVideo();
                if (video) video.pause();
                const audio = getNarrationAudio();
                if (audio) audio.pause();
                syncPlayToggle();
            }},

            togglePlay: function() {{
                const video = getVideo();
                const audio = getNarrationAudio();
                if (state.isNarrating && audio) {{
                    if (audio.paused) {{
                        audio.playbackRate = Math.max(0.5, Math.min(2.0, Number(state.settings.narrationRate) || 1.0));
                        audio.play().catch(function() {{}});
                    }} else {{
                        audio.pause();
                    }}
                    syncPlayToggle();
                    return;
                }}
                if (!video) return;
                if (video.paused) {{
                    video.play().catch(function() {{}});
                }} else {{
                    video.pause();
                }}
                syncPlayToggle();
            }},
            
            seek: function(time) {{
                const video = getVideo();
                if (video) video.currentTime = Math.max(0, time);
                playedKeys.clear();
                state.currentEntryIndex = -1;
                state.isNarrating = false;
                if (video) state.lastVideoTime = Number(video.currentTime || 0);
                const audio = getNarrationAudio();
                if (audio) {{
                    audio.pause();
                    audio.currentTime = 0;
                }}
                if (video) {{
                    smoothVolumeChange(video, state.videoBaseVolume, DUCKING_CONFIG.fadeOutDuration);
                }}
            }},
            
            skipNarration: function() {{
                const audio = getNarrationAudio();
                if (audio) {{
                    audio.pause();
                    audio.currentTime = 0;
                }}
                endNarration(state.script?.entries?.[state.currentEntryIndex]);
            }},
            
            getState: function() {{
                return state;
            }},
            
            // Chapter navigation
            seekToChapter: function(chapterId) {{
                if (!state.script || !state.script.chapters) return;
                const chapter = state.script.chapters.find(c => c.chapter_id === chapterId);
                if (chapter) {{
                    this.seek(chapter.start_time);
                }}
            }},
            
            getCurrentChapter: function() {{
                if (!state.script || !state.script.chapters) return null;
                const video = getVideo();
                if (!video) return null;
                const currentTime = video.currentTime || 0;
                
                for (let i = state.script.chapters.length - 1; i >= 0; i--) {{
                    const chapter = state.script.chapters[i];
                    if (currentTime >= chapter.start_time) {{
                        return chapter;
                    }}
                }}
                return state.script.chapters[0] || null;
            }},
            
            // Overlay widget management
            showOverlay: function(entry) {{
                const container = getOverlayContainer();
                if (!container || !entry || !entry.widget) return;
                
                const widget = entry.widget;
                container.innerHTML = '';
                
                if (widget.widget_type === 'explain_card') {{
                    container.innerHTML = buildExplainCard(widget);
                }} else if (widget.widget_type === 'qa_card') {{
                    container.innerHTML = buildQACard(widget);
                }} else if (widget.widget_type === 'graph') {{
                    container.innerHTML = buildGraphCard(widget);
                }} else if (widget.widget_type === 'mindmap') {{
                    container.innerHTML = buildMindmapCard(widget);
                }} else if (widget.widget_type === 'steps_card') {{
                    container.innerHTML = buildStepsCard(widget);
                }} else {{
                    container.innerHTML = buildSimpleCard(widget);
                }}
            }},
            
            hideOverlay: function() {{
                const container = getOverlayContainer();
                if (container) container.innerHTML = '';
            }},
        }};
        
        function getOverlayContainer() {{
            return document.getElementById('v2-overlay-container');
        }}
        
        function getChapterStrip() {{
            return document.getElementById('v2-chapter-strip');
        }}
        
        function buildExplainCard(widget) {{
            let html = '<div class="v2-overlay-card">';
            if (widget.title) {{
                html += '<div class="v2-overlay-title">' + escapeHtml(widget.title) + '</div>';
            }}
            if (widget.body) {{
                if (widget.body.tldr) {{
                    html += '<div class="v2-overlay-tldr">' + escapeHtml(widget.body.tldr) + '</div>';
                }}
                if (widget.body.bullets && Array.isArray(widget.body.bullets)) {{
                    html += '<ul class="v2-overlay-bullets">';
                    widget.body.bullets.forEach(function(b) {{
                        html += '<li>' + escapeHtml(b) + '</li>';
                    }});
                    html += '</ul>';
                }}
            }}
            html += '</div>';
            return html;
        }}
        
        function buildQACard(widget) {{
            const body = (widget && widget.body && typeof widget.body === 'object') ? widget.body : {{}};
            const options = (body.options && Array.isArray(body.options)) ? body.options : [];
            const rawAnswer = Number(body.answer);
            const correctIdx = (Number.isFinite(rawAnswer) ? Math.max(0, Math.min(options.length - 1, Math.floor(rawAnswer))) : 0);
            let html = '<div class="v2-overlay-card v2-qa-card">';
            if (body.question) {{
                html += '<div class="v2-qa-question">' + escapeHtml(body.question) + '</div>';
                if (options.length) {{
                    html += '<div class="v2-qa-options">';
                    options.forEach(function(opt, idx) {{
                        html += '<div class="v2-qa-option" data-idx="' + idx + '" data-answer="' + correctIdx + '" onclick="v2PlayerController.checkQAAnswer(this, ' + idx + ', ' + correctIdx + ')">';
                        html += escapeHtml(opt);
                        html += '</div>';
                    }});
                    html += '</div>';
                }}
            }}
            html += '</div>';
            return html;
        }}

        function buildGraphCard(widget) {{
            const body = (widget && widget.body && typeof widget.body === 'object') ? widget.body : {{}};
            const nodes = (body.nodes && Array.isArray(body.nodes)) ? body.nodes : [];
            const edges = (body.edges && Array.isArray(body.edges)) ? body.edges : [];
            let html = '<div class="v2-overlay-card">';
            if (widget.title) {{
                html += '<div class="v2-overlay-title">' + escapeHtml(widget.title) + '</div>';
            }}
            html += '<div class="v2-overlay-body">';
            if (nodes.length) {{
                html += '<div>' + escapeHtml('Concepts: ' + String(nodes.length)) + '</div>';
            }}
            if (edges.length) {{
                html += '<div>' + escapeHtml('Links: ' + String(edges.length)) + '</div>';
            }}
            if (nodes.length) {{
                html += '<div style="margin-top:6px;">';
                for (let i = 0; i < Math.min(5, nodes.length); i++) {{
                    const n = nodes[i];
                    const label = (n && typeof n === 'object') ? (n.label || n.id || '') : String(n);
                    if (!label) continue;
                    html += '<span style="margin-right:8px;">• ' + escapeHtml(label) + '</span>';
                }}
                html += '</div>';
            }}
            html += '</div>';
            html += '</div>';
            return html;
        }}

        function buildMindmapCard(widget) {{
            const body = (widget && widget.body && typeof widget.body === 'object') ? widget.body : {{}};
            const root = (body.root && typeof body.root === 'object') ? body.root : null;
            let html = '<div class="v2-overlay-card">';
            if (widget.title) {{
                html += '<div class="v2-overlay-title">' + escapeHtml(widget.title) + '</div>';
            }}
            if (root) {{
                html += '<div class="v2-overlay-body">';
                html += renderMindmapLines(root);
                html += '</div>';
            }}
            html += '</div>';
            return html;
        }}

        function renderMindmapLines(root) {{
            let out = '';
            let count = 0;
            function walk(node, depth) {{
                if (!node || count >= 24 || depth >= 5) return;
                const label = (node.label != null) ? String(node.label) : '';
                if (label) {{
                    out += '<div style="margin-left:' + (depth * 12) + 'px;">• ' + escapeHtml(label) + '</div>';
                    count += 1;
                }}
                const children = (node.children && Array.isArray(node.children)) ? node.children : [];
                for (let i = 0; i < children.length; i++) {{
                    if (count >= 24) break;
                    walk(children[i], depth + 1);
                }}
            }}
            walk(root, 0);
            return out;
        }}

        function buildStepsCard(widget) {{
            const body = (widget && widget.body && typeof widget.body === 'object') ? widget.body : {{}};
            const steps = (body.steps && Array.isArray(body.steps)) ? body.steps : [];
            let html = '<div class="v2-overlay-card">';
            if (widget.title) {{
                html += '<div class="v2-overlay-title">' + escapeHtml(widget.title) + '</div>';
            }}
            if (steps.length) {{
                html += '<ol class="v2-overlay-bullets" style="list-style:decimal;">';
                for (let i = 0; i < steps.length; i++) {{
                    const s = steps[i];
                    const text = (s && typeof s === 'object') ? (s.text || s.title || '') : String(s);
                    if (!text) continue;
                    html += '<li>' + escapeHtml(text) + '</li>';
                }}
                html += '</ol>';
            }}
            html += '</div>';
            return html;
        }}

        function buildSimpleCard(widget) {{
            const body = (widget && widget.body && typeof widget.body === 'object') ? widget.body : {{}};
            let content = '';
            if (body && typeof body === 'object') {{
                content = body.content || body.text || '';
                if (!content) {{
                    try {{
                        content = JSON.stringify(body);
                    }} catch (e) {{
                        content = '';
                    }}
                }}
            }}
            if (content && content.length > 800) {{
                content = content.slice(0, 800) + '…';
            }}
            let html = '<div class="v2-overlay-card">';
            if (widget.title) {{
                html += '<div class="v2-overlay-title">' + escapeHtml(widget.title) + '</div>';
            }}
            if (content) {{
                html += '<div class="v2-overlay-body">' + escapeHtml(content) + '</div>';
            }}
            html += '</div>';
            return html;
        }}
        
        function escapeHtml(text) {{
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        }}
        
        window.v2PlayerController.checkQAAnswer = function(el, selectedIdx, correctIdx) {{
            const optionsEl = el.parentElement;
            if (!optionsEl) return;
            
            const options = optionsEl.querySelectorAll('.v2-qa-option');
            options.forEach(function(opt, idx) {{
                opt.classList.remove('correct', 'incorrect');
                if (idx === correctIdx) {{
                    opt.classList.add('correct');
                }} else if (idx === selectedIdx && idx !== correctIdx) {{
                    opt.classList.add('incorrect');
                }}
            }});
        }};
        
        function renderChapterStrip() {{
            const container = getChapterStrip();
            if (!container) return;
            
            container.innerHTML = '';
            const chapters = (state.script && state.script.chapters) ? state.script.chapters : [];
            if (!chapters.length) {{
                container.style.display = 'none';
                return;
            }}
            
            container.style.display = 'inline-flex';
            
            // Build dropdown structure
            const toggle = document.createElement('div');
            toggle.className = 'v2-chapter-toggle';
            toggle.id = 'v2-chapter-toggle';
            toggle.onclick = function(e) {{
                e.stopPropagation();
                toggleChapterMenu();
            }};
            
            const currentLabel = document.createElement('span');
            currentLabel.className = 'v2-chapter-current';
            currentLabel.id = 'v2-chapter-current';
            const currentChapter = window.v2PlayerController.getCurrentChapter();
            currentLabel.textContent = currentChapter ? currentChapter.title : (chapters[0] ? chapters[0].title : 'Chapter');
            toggle.appendChild(currentLabel);
            
            const arrow = document.createElement('span');
            arrow.className = 'v2-chapter-arrow';
            arrow.innerHTML = '▼';
            toggle.appendChild(arrow);
            
            container.appendChild(toggle);
            
            // Build menu
            const menu = document.createElement('div');
            menu.className = 'v2-chapter-menu';
            menu.id = 'v2-chapter-menu';
            
            const list = document.createElement('div');
            list.className = 'v2-chapter-list';
            
            chapters.forEach(function(chapter, idx) {{
                const item = document.createElement('div');
                item.className = 'v2-chapter-item';
                item.dataset.chapterId = String(chapter.chapter_id);
                item.onclick = function(e) {{
                    e.stopPropagation();
                    window.v2PlayerController.seekToChapter(chapter.chapter_id);
                    closeChapterMenu();
                }};
                
                const indexEl = document.createElement('span');
                indexEl.className = 'v2-chapter-index';
                indexEl.textContent = String(idx + 1);
                item.appendChild(indexEl);
                
                const titleEl = document.createElement('span');
                titleEl.className = 'v2-chapter-title';
                titleEl.textContent = chapter.title || ('Chapter ' + (idx + 1));
                item.appendChild(titleEl);
                
                const timeEl = document.createElement('span');
                timeEl.className = 'v2-chapter-time';
                timeEl.textContent = formatTime(chapter.start_time || 0);
                item.appendChild(timeEl);
                
                list.appendChild(item);
            }});
            
            menu.appendChild(list);
            container.appendChild(menu);
        }}
        
        function toggleChapterMenu() {{
            const menu = document.getElementById('v2-chapter-menu');
            const toggle = document.getElementById('v2-chapter-toggle');
            if (!menu || !toggle) return;
            
            const isVisible = menu.classList.contains('visible');
            if (isVisible) {{
                closeChapterMenu();
            }} else {{
                menu.classList.add('visible');
                toggle.classList.add('expanded');
                updateChapterHighlight();
            }}
        }}
        
        function closeChapterMenu() {{
            const menu = document.getElementById('v2-chapter-menu');
            const toggle = document.getElementById('v2-chapter-toggle');
            if (menu) menu.classList.remove('visible');
            if (toggle) toggle.classList.remove('expanded');
        }}
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {{
            const dropdown = document.querySelector('.v2-chapter-dropdown');
            if (dropdown && !dropdown.contains(e.target)) {{
                closeChapterMenu();
            }}
        }});
        
        function updateChapterHighlight() {{
            const currentChapter = window.v2PlayerController.getCurrentChapter();
            
            // Update dropdown current label
            const currentLabel = document.getElementById('v2-chapter-current');
            if (currentLabel && currentChapter) {{
                currentLabel.textContent = currentChapter.title || 'Chapter';
            }}
            
            // Update menu items
            const menu = document.getElementById('v2-chapter-menu');
            if (!menu) return;
            
            const items = menu.querySelectorAll('.v2-chapter-item');
            items.forEach(function(item) {{
                const chapterId = parseInt(item.dataset.chapterId, 10);
                if (currentChapter && chapterId === currentChapter.chapter_id) {{
                    item.classList.add('active');
                }} else {{
                    item.classList.remove('active');
                }}
            }});
        }}

        function syncPlayToggle() {{
            const playIcon = document.getElementById('v2-play-icon');
            const pauseIcon = document.getElementById('v2-pause-icon');
            if (!playIcon || !pauseIcon) return;
            const video = getVideo();
            const audio = getNarrationAudio();
            const playing = Boolean((state.isNarrating && audio && !audio.paused) || (video && !video.paused));
            playIcon.style.display = playing ? 'none' : 'inline-flex';
            pauseIcon.style.display = playing ? 'inline-flex' : 'none';
        }}
        
        function renderMarkers() {{
            const container = document.getElementById('v2-progress-markers');
            if (!container || !state.script || !state.script.entries) return;
            
            container.innerHTML = '';
            const video = getVideo();
            const duration = (video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : (state.videoDuration || 1));
            
            state.script.entries.forEach(function(entry, index) {{
                if (entry.action_type === 'ignore') return;
                
                const percent = (entry.time_in / duration) * 100;
                if (!Number.isFinite(percent)) return;
                const marker = document.createElement('div');
                marker.className = 'v2-progress-marker';
                if (entry.action_type === 'gap_filling') {{
                    marker.classList.add('gap-filling');
                }}
                marker.style.left = percent + '%';
                marker.title = entry.script?.substring(0, 50) || '';
                marker.onclick = function(e) {{
                    if (e) e.stopPropagation();
                    window.v2PlayerController.seek(entry.time_in - 0.5);
                }};
                container.appendChild(marker);
            }});
        }}

        function renderScriptInfo() {{
            const versionEl = document.getElementById('v2-script-version');
            const generatorEl = document.getElementById('v2-script-generator');
            const countEl = document.getElementById('v2-script-count');
            const listEl = document.getElementById('v2-script-entries');
            if (!versionEl || !generatorEl || !countEl || !listEl) return;

            const script = state.script || {{}};
            versionEl.textContent = 'Version: ' + String(script.version || '');
            generatorEl.textContent = 'Generator: ' + String(script.generator || '');

            const entries = Array.isArray(script.entries) ? script.entries : [];
            countEl.textContent = 'Entries: ' + String(entries.length);

            listEl.innerHTML = '';
            for (let i = 0; i < entries.length; i++) {{
                const entry = entries[i];
                if (!entry) continue;

                const card = document.createElement('div');
                card.className = 'v2-card mt-2';

                const head = document.createElement('div');
                head.style.color = '{colors.text_primary}';
                head.style.fontWeight = '600';
                const t = Number(entry.time_in || 0);
                head.textContent = '#' + String(i) + ': ' + String(entry.action_type || '') + ' @ ' + (Number.isFinite(t) ? t.toFixed(1) : '0.0') + 's' + (entry.tts_path ? ' (tts)' : ' (no tts)');

                const body = document.createElement('div');
                body.style.color = '{colors.text_secondary}';
                body.style.marginTop = '0.35rem';
                body.textContent = String(entry.script || '');

                card.appendChild(head);
                card.appendChild(body);
                listEl.appendChild(card);
            }}
        }}
        
        function attachListeners() {{
            const video = getVideo();
            const audio = getNarrationAudio();
            const progressBar = document.getElementById('v2-progress-bar');

            if (video && !video._v2Bound) {{
                video._v2Bound = true;
                video.addEventListener('loadedmetadata', function() {{
                    state.videoDuration = video.duration;
                    renderMarkers();
                    updateProgress();
                }});
                video.addEventListener('timeupdate', function() {{
                    const last = Number(state.lastVideoTime || 0);
                    const current = Number(video.currentTime || 0);
                    updateProgress();
                    updateChapterHighlight();
                    checkPausePoints(last, current);
                    state.lastVideoTime = current;
                }});
                video.addEventListener('play', syncPlayToggle);
                video.addEventListener('pause', syncPlayToggle);
            }}

            if (audio && !audio._v2Bound) {{
                audio._v2Bound = true;
                audio.addEventListener('play', syncPlayToggle);
                audio.addEventListener('pause', syncPlayToggle);
                audio.addEventListener('ended', function() {{
                    const entry = state.script?.entries?.[state.currentEntryIndex];
                    endNarration(entry);
                    syncPlayToggle();
                }});
            }}

            if (progressBar && !progressBar._v2Bound) {{
                progressBar._v2Bound = true;
                progressBar.addEventListener('click', function(e) {{
                    const rect = progressBar.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const ratio = rect.width > 0 ? Math.max(0, Math.min(1, x / rect.width)) : 0;
                    const v = getVideo();
                    const duration = (v && Number.isFinite(v.duration) && v.duration > 0 ? v.duration : (state.videoDuration || 0));
                    if (!duration || !Number.isFinite(duration)) return;
                    window.v2PlayerController.seek(duration * ratio);
                    updateProgress();
                }});
            }}

            syncSettingsPanel();
        }}

        document.addEventListener('DOMContentLoaded', function() {{
            attachListeners();
            syncPlayToggle();
            renderScriptInfo();
        }});

        attachListeners();
        syncPlayToggle();
        renderScriptInfo();
    }})();
    </script>
    """


def _create_mock_script() -> SmartScript:
    """Create a mock SmartScript for testing."""
    return SmartScript(
        version="1.0",
        course_id="mock",
        script_version="mock_v1",
        generator="rule",
        entries=[
            SmartScriptEntry(
                time_in=5.0,
                action_type="pre_teach_pause",
                script="接下来这段对话很重要，注意听主角说了什么。",
                ducking=False,
                estimated_duration=3.0,
                ref={"type": "mock", "reason": "High density segment"},
            ),
            SmartScriptEntry(
                time_in=15.0,
                action_type="gap_filling",
                script="刚才他提到了一个关键词。",
                ducking=True,
                estimated_duration=2.0,
                ref={"type": "mock", "reason": "Gap available"},
            ),
            SmartScriptEntry(
                time_in=30.0,
                action_type="pre_teach_pause",
                script="故事即将进入转折点，看看接下来会发生什么。",
                ducking=False,
                estimated_duration=3.5,
                ref={"type": "mock", "reason": "Plot transition"},
            ),
        ],
    )

def _script_dict_for_ui(*, script: SmartScript, course_id: str, tts_route: str) -> Dict[str, Any]:
    data = script.to_dict()
    entries = data.get("entries") or []
    if isinstance(entries, list):
        for e in entries:
            if not isinstance(e, dict):
                continue
            tts_path = str(e.get("tts_path") or "").strip()
            if not tts_path:
                continue
            try:
                p = Path(tts_path)
                if p.exists():
                    e["tts_path"] = f"{tts_route}/{p.name}"
                else:
                    e["tts_path"] = None
            except Exception:
                e["tts_path"] = None
    data["course_id"] = str(course_id)
    return data


async def render_v2_player_page(
    course: "Course",
    course_db: "CourseDatabase",
    theme: Any,
    lang: str = "zh",
) -> None:
    """
    Render the Smart Player v2 page.
    
    Args:
        course: Course to play
        course_db: Database instance
        theme: Theme object
        lang: UI language
    """
    c = theme.colors
    theme_mode = "dark" if getattr(theme, "is_dark", True) else "light"
    query = f"?theme={theme_mode}&lang={lang}"
    client = ui.context.client
    
    def _t(key: str) -> str:
        return i18n.t(key, lang)
    
    # Mount assets
    assets_dir = Path(__file__).resolve().parents[1] / "assets"
    _mount_static("/echoflow-assets", str(assets_dir))
    
    # Add head HTML
    ui.add_head_html(build_practice_head_html(colors=c))
    ui.add_head_html(_build_v2_player_head_html(c))
    
    # Get video URL
    video_url: Optional[str] = None
    cover_src: str = ""
    
    if getattr(course, "video_path", None):
        try:
            video_path = Path(str(course.video_path))
            if video_path.exists():
                video_route = f"/v2-video/{course.id}"
                _mount_static(video_route, str(video_path.parent))
                video_url = f"{video_route}/{video_path.name}"
        except Exception:
            pass
    
    if getattr(course, "cover_path", None):
        try:
            cover_path = Path(str(course.cover_path))
            if cover_path.exists():
                cover_route = f"/v2-cover/{course.id}"
                _mount_static(cover_route, str(cover_path.parent))
                cover_src = f"{cover_route}/{cover_path.name}"
        except Exception:
            pass
    
    # Try to load SmartScript, or use mock
    paths = V2PlayerPaths.from_db_path(Path(course_db.db_path), str(course.id))
    script: Optional[SmartScript] = None
    needs_preprocessing = True

    tts_route = f"/v2-tts/{course.id}"
    try:
        paths.tts_dir.mkdir(parents=True, exist_ok=True)
        _mount_static(tts_route, str(paths.tts_dir))
    except Exception:
        pass
    
    if paths.smart_script_json.exists():
        try:
            script = SmartScript.from_json(paths.smart_script_json.read_text(encoding="utf-8"))
            needs_preprocessing = False
        except Exception:
            pass
    
    if script is None:
        script = SmartScript(
            version="1.0",
            course_id=str(course.id),
            script_version="",
            generator="rule",
            entries=[],
        )
    
    # State for preprocessing
    preprocessing_status = ui.label("")
    preprocessing_status.set_visibility(False)
    if needs_preprocessing:
        preprocessing_status.set_visibility(True)
        preprocessing_status.set_text(
            "未检测到 v2 脚本，可点击右上角「分析视频」生成"
            if lang.startswith("zh")
            else "No v2 script found. Click “Analyze” to generate one."
        )
    
    async def run_preprocessing():
        """Run the preprocessing pipeline."""
        nonlocal script, needs_preprocessing
        
        preprocessing_status.set_visibility(True)
        preprocessing_status.set_text("正在分析视频和生成脚本..." if lang.startswith("zh") else "Analyzing video and generating script...")
        
        try:
            pipeline = V2Pipeline(course, course_db, enable_tts=True)
            prefs = course_db.get_app_prefs() or {}
            speaker = str(prefs.get("tts_voice") or "Emma").strip() or "Emma"
            quality = str(prefs.get("tts_quality") or "fast").strip() or "fast"
            tts_engine = str(prefs.get("tts_engine") or "vibevoice").strip() or "vibevoice"
            tts_model_id = str(prefs.get("tts_model_id") or "").strip() or None
            narration_lang = str(prefs.get("echoflow_pregen_lang") or lang or "zh").strip() or "zh"
            audience = str(prefs.get("echoflow_v2_audience") or "adult").strip() or "adult"
            english_level = str(prefs.get("echoflow_v2_english_level") or "intermediate").strip() or "intermediate"
            llm_model = str(prefs.get("llm_model") or "").strip() or None

            def _level_to_intensity(level: str) -> str:
                k = str(level or "intermediate").strip().lower()
                if k == "beginner":
                    return "high"
                if k == "advanced":
                    return "low"
                return "medium"

            intensity = _level_to_intensity(english_level)

            async def on_progress(frac: float, message: str) -> None:
                try:
                    if str(message).startswith("tts:"):
                        parts = str(message).split(":")
                        if len(parts) >= 3:
                            preprocessing_status.set_text(
                                (f"TTS 预生成：{parts[1]}（失败 {parts[2]}）" if lang.startswith("zh") else f"TTS: {parts[1]} (failed {parts[2]})")
                            )
                            return
                    preprocessing_status.set_text(str(message))
                except Exception:
                    return

            result = await pipeline.run_full(
                scope="all",
                intensity=str(intensity),
                narration_lang=narration_lang,
                audience=audience,
                english_level=english_level,
                script_mode="auto",
                llm_model=llm_model,
                speaker=speaker,
                quality=quality,
                engine=str(tts_engine),
                model_id=(str(tts_model_id).strip() if tts_model_id else None),
                on_progress=on_progress,
            )
            
            if result.success and result.script:
                script = result.script
                needs_preprocessing = False
                
                # Update UI
                script_json = json.dumps(
                    _script_dict_for_ui(script=script, course_id=str(course.id), tts_route=tts_route),
                    ensure_ascii=False,
                )
                await client.run_javascript(
                    f"v2PlayerController.setScript({script_json});",
                    timeout=5.0,
                )
                
                preprocessing_status.set_text(
                    f"分析完成！{result.subtitle_count} 个字幕，{result.script_entry_count} 个解说点" 
                    if lang.startswith("zh") else 
                    f"Done! {result.subtitle_count} subtitles, {result.script_entry_count} commentary points"
                )
            else:
                preprocessing_status.set_text(
                    f"分析失败：{result.error}" if lang.startswith("zh") else f"Analysis failed: {result.error}"
                )
        except Exception as e:
            preprocessing_status.set_text(
                f"分析失败：{e}" if lang.startswith("zh") else f"Analysis failed: {e}"
            )
    
    # Header
    with ui.row().classes("w-full items-center justify-between p-4").style(
        f"background-color: {c.bg_secondary}; border-bottom: 1px solid {c.border};"
    ):
        ui.button("←", on_click=lambda: ui.navigate.to(f"/{query}")).props("flat").style(
            f"color: {c.text_primary};"
        )
        ui.label(course.title).classes("text-lg font-semibold").style(
            f"color: {c.text_primary};"
        )
        with ui.row().classes("items-center gap-2"):
            if needs_preprocessing:
                ui.button(
                    "分析视频" if lang.startswith("zh") else "Analyze",
                    icon="auto_awesome",
                    on_click=run_preprocessing,
                ).props("color=primary")
            ui.label("Smart Player v2").classes("text-sm").style(
                f"color: {c.text_secondary};"
            )
    
    # Main content
    with ui.element("div").classes("v2-player-container"):
        # Video wrapper
        with ui.element("div").classes("v2-video-wrapper"):
            if video_url:
                poster_attr = f' poster="{cover_src}"' if cover_src else ""
                ui.html(
                    f"""
                    <video
                        id="v2-video"
                        preload="metadata"
                        playsinline
                        disablepictureinpicture
                        controlslist="nodownload noplaybackrate noremoteplayback"
                        src="{video_url}"
                        {poster_attr}
                    ></video>
                    """,
                    sanitize=False,
                )
            else:
                ui.label("视频未找到" if lang.startswith("zh") else "Video not found").style(
                    f"color: {c.text_secondary}; padding: 2rem;"
                )
            
            # Narrator indicator
            ui.html(
                """
                <div id="v2-narrator-indicator" class="v2-narrator-indicator">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                </div>
                """,
                sanitize=False,
            )
            
            # Overlay container for widgets
            ui.html(
                """
                <div id="v2-overlay-container" class="v2-overlay-container"></div>
                """,
                sanitize=False,
            )
        
        # Progress bar
        with ui.element("div").classes("v2-progress-bar").props("id=v2-progress-bar"):
            ui.element("div").classes("v2-progress-fill").props("id=v2-progress-fill")
            ui.element("div").props("id=v2-progress-markers")
        
        # i18n labels for settings
        ducking_label = "Ducking 音量" if lang.startswith("zh") else "Ducking volume"
        narration_rate_label = "解说倍速" if lang.startswith("zh") else "Narration rate"
        skip_narration_label = "跳过解说" if lang.startswith("zh") else "Skip narration"
        auto_pause_label = "自动暂停" if lang.startswith("zh") else "Auto pause"
        settings_title = "播放设置" if lang.startswith("zh") else "Settings"

        # Controls
        with ui.element("div").classes("v2-controls"):
            ui.html(
                """
                <button id="v2-play-toggle" class="v2-toggle-btn" type="button" onclick="v2PlayerController.togglePlay()">
                    <span id="v2-play-icon" style="display:inline-flex;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </span>
                    <span id="v2-pause-icon" style="display:none;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                    </span>
                </button>
                """,
                sanitize=False,
            )
            
            ui.element("span").classes("v2-time-display").props("id=v2-time-display")
            
            # Chapter dropdown (moved here, after time display)
            ui.html(
                """
                <div id="v2-chapter-strip" class="v2-chapter-dropdown"></div>
                """,
                sanitize=False,
            )

            # Settings button (pushed to right via margin-left:auto in CSS)
            ui.html(
                f"""
                <div class="v2-settings-wrapper">
                    <button id="v2-settings-btn" class="v2-settings-btn" type="button" onclick="v2PlayerController.toggleSettingsMenu()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <div id="v2-settings-panel" class="v2-settings-panel" style="display:none;">
                        <div class="v2-settings-title">{settings_title}</div>
                        
                        <!-- Auto pause toggle -->
                        <div class="v2-setting-toggle" onclick="v2PlayerController.toggleAutoPauseSetting()">
                            <span class="v2-setting-toggle-label">{auto_pause_label}</span>
                            <div id="v2-auto-pause-switch" class="v2-setting-toggle-switch active"></div>
                        </div>
                        
                        <!-- Skip narration action -->
                        <div class="v2-setting-action" onclick="v2PlayerController.skipNarration(); v2PlayerController.toggleSettingsMenu();">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                                <line x1="19" y1="5" x2="19" y2="19"></line>
                            </svg>
                            <span>{skip_narration_label}</span>
                        </div>
                        
                        <div class="v2-setting-divider"></div>
                        
                        <div class="v2-setting-row">
                            <div class="v2-setting-head">
                                <span>{ducking_label}</span>
                                <span id="v2-ducking-volume-value" class="v2-setting-value"></span>
                            </div>
                            <input id="v2-ducking-volume" type="range" min="0" max="1" step="0.01" oninput="v2PlayerController.setSettings({{duckingVolume: this.value}})" />
                        </div>
                        <div class="v2-setting-row">
                            <div class="v2-setting-head">
                                <span>{narration_rate_label}</span>
                                <span id="v2-narration-rate-value" class="v2-setting-value"></span>
                            </div>
                            <input id="v2-narration-rate" type="range" min="0.5" max="2" step="0.05" oninput="v2PlayerController.setSettings({{narrationRate: this.value}})" />
                        </div>
                    </div>
                </div>
                """,
                sanitize=False,
            )
        
        # Hidden narration audio
        ui.html(
            """
            <audio id="v2-narration-audio" preload="none" style="display:none;"></audio>
            """,
            sanitize=False,
        )
        
        # Commentary panel
        with ui.element("div").classes("v2-commentary-panel"):
            ui.label(
                "解说区" if lang.startswith("zh") else "Commentary"
            ).classes("text-sm font-semibold mb-2").style(f"color: {c.text_secondary};")
            ui.element("div").classes("v2-commentary-text").props("id=v2-commentary-text")
        
        # Preprocessing status
        preprocessing_status.classes("text-sm mt-2").style(f"color: {c.text_secondary};")
        
        # Script info (debug)
        with ui.expansion(
            "脚本信息" if lang.startswith("zh") else "Script Info",
            icon="code",
        ).classes("w-full mt-4"):
            ui.label("").style(f"color: {c.text_secondary};").props("id=v2-script-version")
            ui.label("").style(f"color: {c.text_secondary};").props("id=v2-script-generator")
            ui.label("").style(f"color: {c.text_secondary};").props("id=v2-script-count")
            ui.element("div").props("id=v2-script-entries")
    
    # Initialize script
    script_json = json.dumps(
        _script_dict_for_ui(script=script, course_id=str(course.id), tts_route=tts_route),
        ensure_ascii=False,
    )
    await client.run_javascript(
        f"setTimeout(function() {{ v2PlayerController.setScript({script_json}); }}, 200);",
        timeout=5.0,
    )
