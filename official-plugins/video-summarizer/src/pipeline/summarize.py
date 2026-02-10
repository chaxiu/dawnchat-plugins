"""
Summarize Pipeline - LLM 摘要生成

负责使用 LLM 生成分段摘要和总摘要。
采用 Map-Reduce 模式处理长文本。
"""

import asyncio
import logging
import re
from dataclasses import dataclass, field
from typing import Optional, List

from dawnchat_sdk import host

from pipeline.transcribe import Segment

logger = logging.getLogger("video-summarizer.summarize")


@dataclass
class KeyPoint:
    """关键点"""
    timestamp: float  # 开始时间（秒）
    content: str
    speaker: Optional[str] = None


@dataclass
class SummaryResult:
    """摘要结果"""
    success: bool
    summary: Optional[str] = None  # 核心一句话总结
    key_points: List[KeyPoint] = field(default_factory=list)
    full_summary: Optional[str] = None  # 完整摘要
    error: Optional[str] = None


# Prompt 模板
SEGMENT_SUMMARY_PROMPT = """你是一个专业的内容摘要助手。请根据以下带时间戳的转录内容，提取3-5个关键要点。

每个要点必须：
1. 标注该要点对应的时间戳（使用原文中最相关片段的时间）
2. 简洁明了（不超过50字）
3. 包含核心信息

请严格按照以下格式输出（每行一个要点）：
- [MM:SS] 关键要点内容

示例：
- [0:26] 购买26000元的会卡翡翠原石
- [1:45] 开窗显示冰种绿色，颜色浓郁

转录内容：
{text_with_timestamps}"""


def _build_text_with_timestamps(segments: List[Segment]) -> str:
    """
    构建带时间戳的文本，供LLM参考
    
    格式：[MM:SS] [说话人] 文本内容
    """
    lines = []
    for seg in segments:
        minutes = int(seg.start // 60)
        seconds = int(seg.start % 60)
        speaker_tag = f"[{seg.speaker}] " if seg.speaker else ""
        lines.append(f"[{minutes}:{seconds:02d}] {speaker_tag}{seg.text}")
    return "\n".join(lines)

REDUCE_SUMMARY_PROMPT = """你是一个专业的内容摘要助手。请根据以下各段落的关键要点，生成一个完整的内容摘要。

要求：
1. 首先用一句话（不超过100字）概括整体内容
2. 然后整合所有关键要点，去除重复，保留最重要的5-8个要点

请用以下格式输出：

## 一句话总结
[你的一句话总结]

## 关键要点
- [要点1]
- [要点2]
- [要点3]
...

各段落要点：
{points}"""

# 配置
MAX_CONCURRENT_REQUESTS = 3

# Key Points Summarize Prompt - 用于层次化汇总时合并提炼内容
KEY_POINTS_SUMMARIZE_PROMPT = """你是一个专业的内容摘要助手。请将以下{input_count}个关键点**汇总提炼**为{target_count}个更精炼的要点。

重要：这不是简单的筛选，而是要**合并相关内容，提炼核心信息**！

要求：
1. 合并相似或相关的要点，提炼出综合性的核心信息
2. 每个输出要点应该涵盖多个输入要点的信息
3. 使用该要点涵盖内容中最早出现的时间戳
4. 确保不丢失重要信息，只是更精炼地表达
5. 输出要点应该比输入更精炼、更概括

示例：
输入：
- [0:10] 购买了一块翡翠原石
- [0:25] 原石价格两万六
- [0:40] 原石产自缅甸会卡

提炼后：
- [0:10] 以两万六购入缅甸会卡翡翠原石

输入关键点：
{key_points_text}

请严格按以下格式输出（每行一个）：
- [MM:SS] 提炼后的关键点内容
"""


def _calculate_max_key_points(duration_seconds: float) -> int:
    """
    基于视频时长计算合理的 key points 数量
    
    Args:
        duration_seconds: 视频时长（秒）
        
    Returns:
        建议的最大 key points 数量
    """
    duration_minutes = duration_seconds / 60
    
    if duration_minutes <= 5:
        return 8
    elif duration_minutes <= 15:
        return 12
    elif duration_minutes <= 30:
        return 15
    elif duration_minutes <= 60:
        return 18
    else:
        # 超过1小时，每30分钟增加3个
        extra = int((duration_minutes - 60) / 30) * 3
        return min(25, 18 + extra)  # 最多25个


def _get_duration_from_segments(segments: List[Segment]) -> float:
    """从 segments 获取总时长"""
    if not segments:
        return 0
    return segments[-1].end


# 智能分片配置
CHUNK_CONFIG = {
    "max_duration_seconds": 180,    # 最大3分钟
    "max_chars": 2000,              # 最大2000字符
    "min_duration_seconds": 30,     # 最小30秒
    "min_chars": 300,               # 最小300字符
    "silence_threshold_seconds": 1.5,  # 长静音阈值
}


async def generate_summary(
    segments: List[Segment],
    model: Optional[str] = None,
    max_key_points: Optional[int] = None
) -> SummaryResult:
    """
    生成摘要
    
    使用 Map-Reduce 模式：
    1. 将转录分片
    2. 并发生成各片段的关键点 (Map)
    3. 汇总生成最终摘要 (Reduce)
    4. 层次化 Reduce 关键点到合理数量
    
    Args:
        segments: 转录片段列表
        model: 使用的 LLM 模型
        max_key_points: 最大关键点数量（None 则根据视频时长动态计算）
        
    Returns:
        SummaryResult: 摘要结果
    """
    logger.info(f"[Summary] Starting summarization: {len(segments)} segments, model={model}")
    
    if not segments:
        logger.warning("[Summary] No segments provided")
        return SummaryResult(
            success=False,
            error="没有可用的转录内容"
        )
    
    try:
        # 计算视频时长和动态阈值
        duration = _get_duration_from_segments(segments)
        if max_key_points is None:
            max_key_points = _calculate_max_key_points(duration)
        logger.info(f"[Summary] Video duration: {duration:.1f}s ({duration/60:.1f}min), max_key_points: {max_key_points}")
        
        # 1. 智能分片
        chunks = _chunk_segments_smart(segments, CHUNK_CONFIG)
        logger.info(f"[Summary] Created {len(chunks)} chunks from {len(segments)} segments")
        
        if not chunks:
            logger.error("[Summary] Chunking failed - no chunks created")
            return SummaryResult(
                success=False,
                error="分片失败"
            )
        
        # 2. Map: 并发生成各片段的关键点
        chunk_results = await _map_chunks(chunks, model)
        
        if not chunk_results:
            return SummaryResult(
                success=False,
                error="关键点提取失败"
            )
        
        # 3. Reduce: 汇总生成最终摘要
        final_result = await _reduce_summaries(chunk_results, model)
        
        if not final_result["success"]:
            return SummaryResult(
                success=False,
                error=final_result.get("error", "汇总失败")
            )
        
        # 4. 提取所有关键点（不限制数量）
        all_key_points = _extract_key_points(chunk_results, segments, max_points=9999)
        logger.info(f"[Summary] Extracted {len(all_key_points)} raw key points")
        
        # 5. 层次化 Reduce 关键点到目标数量
        if len(all_key_points) > max_key_points:
            logger.info(f"[Summary] Starting hierarchical reduce: {len(all_key_points)} -> {max_key_points}")
            key_points = await _reduce_key_points_hierarchical(
                all_key_points, 
                max_key_points, 
                model
            )
        else:
            key_points = all_key_points
        
        # 6. 通过时间戳匹配speaker
        key_points = _match_speakers_to_key_points(key_points, segments)
        
        logger.info(f"[Summary] Final key points: {len(key_points)}")
        
        return SummaryResult(
            success=True,
            summary=final_result.get("one_line"),
            key_points=key_points,
            full_summary=final_result.get("full")
        )
        
    except Exception as e:
        logger.error(f"[Summary] Failed: {e}", exc_info=True)
        return SummaryResult(
            success=False,
            error=str(e)
        )


def _chunk_segments_smart(
    segments: List[Segment],
    config: dict
) -> List[dict]:
    """
    智能分片策略
    
    策略：
    1. 累积segments直到接近max限制
    2. 在最近的语义边界(说话人变换/长静音/句号)切割
    3. 确保每个chunk至少满足min限制
    4. 保留原始segments结构用于时间戳匹配
    
    Returns:
        List of {"start": float, "end": float, "text": str, "segments": List[Segment]}
    """
    if not segments:
        return []
    
    chunks = []
    current = {
        "start": segments[0].start,
        "end": segments[0].start,
        "texts": [],
        "segments": [],
        "chars": 0
    }
    
    for i, seg in enumerate(segments):
        should_split = False
        
        # 条件1: 超过最大时长
        if current["segments"] and seg.end - current["start"] > config["max_duration_seconds"]:
            should_split = True
        
        # 条件2: 超过最大字符数
        if current["chars"] + len(seg.text) > config["max_chars"]:
            should_split = True
        
        # 条件3: 说话人变换 (且满足最小限制)
        if (i > 0 and 
            seg.speaker and 
            seg.speaker != segments[i-1].speaker and
            current["chars"] >= config["min_chars"] and
            (seg.start - current["start"]) >= config["min_duration_seconds"]):
            should_split = True
        
        # 条件4: 长静音 (且满足最小限制)
        if (i > 0 and 
            seg.start - segments[i-1].end > config["silence_threshold_seconds"] and
            current["chars"] >= config["min_chars"] and
            (seg.start - current["start"]) >= config["min_duration_seconds"]):
            should_split = True
        
        if should_split and current["texts"]:
            # 保存当前chunk
            current["end"] = segments[i-1].end
            current["text"] = " ".join(current["texts"])
            del current["chars"]  # 移除临时字段
            chunks.append(current)
            
            # 开始新chunk
            current = {
                "start": seg.start,
                "end": seg.end,
                "texts": [],
                "segments": [],
                "chars": 0
            }
        
        current["texts"].append(seg.text)
        current["segments"].append(seg)
        current["chars"] += len(seg.text)
        current["end"] = seg.end
    
    # 添加最后一个chunk
    if current["texts"]:
        current["text"] = " ".join(current["texts"])
        if "chars" in current:
            del current["chars"]
        chunks.append(current)
    
    logger.info(f"[Chunking] Smart chunking: {len(segments)} segments -> {len(chunks)} chunks")
    for i, chunk in enumerate(chunks):
        logger.debug(f"[Chunking] Chunk {i}: {chunk['start']:.1f}s - {chunk['end']:.1f}s, "
                    f"{len(chunk['segments'])} segments, {len(chunk.get('text', ''))} chars")
    
    return chunks


async def _map_chunks(
    chunks: List[dict],
    model: Optional[str]
) -> List[dict]:
    """
    Map 阶段：并发处理各分片
    """
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    
    async def process_chunk(chunk: dict) -> dict:
        async with semaphore:
            segments = chunk.get("segments", [])
            if not segments:
                logger.warning(f"[Map] Chunk {chunk.get('start', 0):.1f}s has no segments, skipping")
                return {
                    "start": chunk["start"],
                    "end": chunk["end"],
                    "points": "",
                    "segments": [],
                    "success": False,
                    "error": "No segments"
                }
            
            # 构建带时间戳的文本
            text_with_timestamps = _build_text_with_timestamps(segments)
            
            # 限制长度（约3000字符）
            if len(text_with_timestamps) > 3000:
                # 截断但保持完整行
                lines = text_with_timestamps.split('\n')
                truncated_lines = []
                total_len = 0
                for line in lines:
                    if total_len + len(line) > 3000:
                        break
                    truncated_lines.append(line)
                    total_len += len(line) + 1
                text_with_timestamps = '\n'.join(truncated_lines)
            
            prompt = SEGMENT_SUMMARY_PROMPT.format(text_with_timestamps=text_with_timestamps)
            logger.debug(f"[Map] Processing chunk {chunk['start']:.1f}s - {chunk['end']:.1f}s, "
                        f"segments={len(segments)}, prompt_len={len(prompt)}")
            
            try:
                # 验证消息格式
                messages = [{"role": "user", "content": prompt}]
                logger.debug(f"[Map] Calling AI chat, model={model}, prompt_len={len(prompt)}")
                
                response = await host.ai.chat(
                    messages=messages,
                    model=model,
                    temperature=0.3
                )
                
                content = response.get("content", "")
                logger.debug(f"[Map] Got response, content_len={len(content)}")
                
                return {
                    "start": chunk["start"],
                    "end": chunk["end"],
                    "points": content,
                    "segments": segments,  # 保留segments用于speaker匹配
                    "success": True
                }
            except Exception as e:
                logger.error(f"[Map] Chunk processing failed: {e}", exc_info=True)
                return {
                    "start": chunk["start"],
                    "end": chunk["end"],
                    "points": "",
                    "segments": segments,
                    "success": False,
                    "error": str(e)
                }
    
    results = await asyncio.gather(*[process_chunk(c) for c in chunks])
    return [r for r in results if r["success"]]


async def _reduce_summaries(
    chunk_results: List[dict],
    model: Optional[str]
) -> dict:
    """
    Reduce 阶段：汇总生成最终摘要
    """
    logger.info(f"[Reduce] Starting reduce with {len(chunk_results)} chunk results")
    
    # 合并所有关键点
    all_points = []
    for result in chunk_results:
        points = result.get("points", "")
        if points:
            all_points.append(f"[{result['start']:.0f}s - {result['end']:.0f}s]\n{points}")
    
    if not all_points:
        logger.error("[Reduce] No valid points to reduce")
        return {"success": False, "error": "没有可用的关键点"}
    
    combined_points = "\n\n".join(all_points)
    prompt = REDUCE_SUMMARY_PROMPT.format(points=combined_points)
    logger.debug(f"[Reduce] Calling AI chat, prompt_len={len(prompt)}, model={model}")
    
    try:
        response = await host.ai.chat(
            messages=[
                {"role": "user", "content": prompt}
            ],
            model=model,
            temperature=0.3
        )
        logger.debug(f"[Reduce] Got response: {response.get('status', 'unknown')}")
        
        content = response.get("content", "")
        
        # 解析输出
        one_line = ""
        full = content
        
        # 尝试提取一句话总结
        if "## 一句话总结" in content:
            parts = content.split("## 一句话总结")
            if len(parts) > 1:
                summary_part = parts[1].split("##")[0].strip()
                one_line = summary_part.strip()
        
        return {
            "success": True,
            "one_line": one_line,
            "full": full
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def _extract_key_points(
    chunk_results: List[dict],
    segments: List[Segment],
    max_points: int
) -> List[KeyPoint]:
    """
    从各分片结果中提取带时间戳的关键点
    
    解析LLM输出格式: - [MM:SS] 关键要点内容
    """
    key_points = []
    
    # 匹配格式: - [MM:SS] 内容  或  - [M:SS] 内容
    timestamp_pattern = re.compile(r'^-\s*\[(\d+):(\d+)\]\s*(.+)$')
    # 兼容旧格式（无时间戳）: - [内容]  或  - 内容
    fallback_pattern = re.compile(r'^-\s*\[?([^\]]+)\]?$')
    
    for result in chunk_results:
        points_text = result.get("points", "")
        chunk_start = result.get("start", 0)
        chunk_segments = result.get("segments", [])
        
        lines = points_text.split("\n")
        for line in lines:
            line = line.strip()
            if not line.startswith("-"):
                continue
            
            # 尝试匹配带时间戳的格式
            match = timestamp_pattern.match(line)
            if match:
                minutes = int(match.group(1))
                seconds = int(match.group(2))
                content = match.group(3).strip()
                timestamp = minutes * 60 + seconds
                
                if content:
                    key_points.append(KeyPoint(
                        timestamp=timestamp,
                        content=content,
                        speaker=None  # 稍后通过时间戳匹配
                    ))
            else:
                # 兼容无时间戳的格式，使用chunk开始时间
                fallback_match = fallback_pattern.match(line)
                if fallback_match:
                    content = fallback_match.group(1).strip()
                    if content and len(content) > 5:  # 过滤太短的内容
                        key_points.append(KeyPoint(
                            timestamp=chunk_start,
                            content=content,
                            speaker=None
                        ))
    
    logger.info(f"[KeyPoints] Extracted {len(key_points)} key points from {len(chunk_results)} chunks")
    
    # 按时间戳排序
    key_points.sort(key=lambda kp: kp.timestamp)
    
    # 记录详细信息
    for i, kp in enumerate(key_points):
        logger.debug(f"[KeyPoints] #{i+1}: [{kp.timestamp:.0f}s] {kp.content[:30]}...")
    
    # 如果指定了 max_points 且超过限制，进行截断
    # 注意：主流程中会使用层次化 Reduce，这里只是保底逻辑
    if max_points < 9999 and len(key_points) > max_points:
        logger.warning(f"[KeyPoints] Truncating from {len(key_points)} to {max_points} key points (fallback)")
        key_points = key_points[:max_points]
    
    return key_points


def _match_speakers_to_key_points(
    key_points: List[KeyPoint],
    segments: List[Segment]
) -> List[KeyPoint]:
    """
    通过时间戳匹配speaker到关键点
    
    对于每个关键点，找到时间戳最接近的segment，并使用其speaker
    """
    if not segments:
        return key_points
    
    for kp in key_points:
        # 找到时间戳最接近的segment
        best_segment = None
        best_distance = float('inf')
        
        for seg in segments:
            # 计算关键点时间戳与segment的距离
            # 如果关键点在segment内部，距离为0
            if seg.start <= kp.timestamp <= seg.end:
                best_segment = seg
                best_distance = 0
                break
            
            # 否则计算到segment边界的距离
            distance = min(abs(kp.timestamp - seg.start), abs(kp.timestamp - seg.end))
            if distance < best_distance:
                best_distance = distance
                best_segment = seg
        
        if best_segment and best_segment.speaker:
            kp.speaker = best_segment.speaker
    
    matched_count = sum(1 for kp in key_points if kp.speaker)
    logger.debug(f"[KeyPoints] Matched speakers for {matched_count}/{len(key_points)} key points")
    
    return key_points


def _format_key_points_for_llm(key_points: List[KeyPoint]) -> str:
    """将 KeyPoint 列表格式化为 LLM 可读的文本"""
    lines = []
    for kp in key_points:
        minutes = int(kp.timestamp // 60)
        seconds = int(kp.timestamp % 60)
        lines.append(f"- [{minutes}:{seconds:02d}] {kp.content}")
    return "\n".join(lines)


def _parse_key_points_from_llm(llm_output: str) -> List[KeyPoint]:
    """从 LLM 输出解析 KeyPoint 列表"""
    key_points = []
    timestamp_pattern = re.compile(r'^-\s*\[(\d+):(\d+)\]\s*(.+)$')
    
    for line in llm_output.split("\n"):
        line = line.strip()
        if not line.startswith("-"):
            continue
        
        match = timestamp_pattern.match(line)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            content = match.group(3).strip()
            timestamp = minutes * 60 + seconds
            
            if content:
                key_points.append(KeyPoint(
                    timestamp=timestamp,
                    content=content,
                    speaker=None
                ))
    
    return key_points


async def _llm_summarize_key_points(
    key_points: List[KeyPoint],
    target_count: int,
    model: Optional[str]
) -> List[KeyPoint]:
    """
    调用 LLM 将 key_points 汇总提炼为 target_count 个
    
    注意：这不是简单筛选，而是合并相关内容，提炼核心信息！
    
    Args:
        key_points: 输入的关键点列表
        target_count: 目标数量
        model: 使用的 LLM 模型
        
    Returns:
        汇总提炼后的关键点列表
    """
    if len(key_points) <= target_count:
        return key_points
    
    key_points_text = _format_key_points_for_llm(key_points)
    prompt = KEY_POINTS_SUMMARIZE_PROMPT.format(
        input_count=len(key_points),
        target_count=target_count,
        key_points_text=key_points_text
    )
    
    logger.debug(f"[KeyPointsSummarize] Calling LLM to summarize {len(key_points)} -> {target_count}, prompt_len={len(prompt)}")
    
    try:
        response = await host.ai.chat(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            temperature=0.3
        )
        
        content = response.get("content", "")
        summarized = _parse_key_points_from_llm(content)
        
        logger.debug(f"[KeyPointsSummarize] LLM returned {len(summarized)} summarized key points")
        
        # 如果 LLM 返回的数量不对，做一些处理
        if not summarized:
            # LLM 没有返回有效结果，记录警告并返回原始的前 N 个
            logger.warning("[KeyPointsSummarize] LLM returned no valid key points, falling back to truncation")
            return key_points[:target_count]
        
        return summarized
        
    except Exception as e:
        logger.error(f"[KeyPointsSummarize] LLM call failed: {e}", exc_info=True)
        # 失败时返回前 N 个
        return key_points[:target_count]


async def _reduce_key_points_hierarchical(
    key_points: List[KeyPoint],
    target_count: int,
    model: Optional[str],
    max_depth: int = 3
) -> List[KeyPoint]:
    """
    层次化 Reduce key points
    
    递归调用 LLM 汇总提炼关键点，直到数量 <= target_count
    
    注意：这是汇总提炼，不是简单筛选！每轮都会合并相关内容。
    
    Args:
        key_points: 输入的关键点列表
        target_count: 目标最大数量
        model: 使用的 LLM 模型
        max_depth: 最大递归深度（防止死循环）
        
    Returns:
        汇总提炼后的关键点列表
    """
    # 终止条件：数量已满足 或 达到最大深度
    if len(key_points) <= target_count:
        logger.info(f"[HierarchicalReduce] Key points ({len(key_points)}) <= target ({target_count}), returning as-is")
        return key_points
    
    if max_depth <= 0:
        logger.warning(f"[HierarchicalReduce] Max depth reached, doing final summarization")
        # 最后一轮强制汇总到目标数量
        return await _llm_summarize_key_points(key_points, target_count, model)
    
    logger.info(f"[HierarchicalReduce] Summarizing {len(key_points)} key points, target={target_count}, depth={max_depth}")
    
    # 分组策略：每组约 10-15 个，便于 LLM 处理
    # 每组汇总为 3-5 个，这样信息损失最小
    group_size = 12
    groups = [key_points[i:i + group_size] for i in range(0, len(key_points), group_size)]
    
    # 计算每组应该汇总成多少个
    # 目标是在一轮之后，总数量减少到约 1/3 - 1/4
    # 但每组至少保留 3 个，最多保留 5 个
    total_after_reduce = max(target_count, len(key_points) // 3)
    per_group_target = max(3, min(5, total_after_reduce // len(groups) + 1))
    
    logger.debug(f"[HierarchicalReduce] Split into {len(groups)} groups, per_group_target={per_group_target}")
    
    # 并发处理各组
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    
    async def process_group(group: List[KeyPoint], group_idx: int) -> List[KeyPoint]:
        async with semaphore:
            logger.debug(f"[HierarchicalReduce] Processing group {group_idx}: {len(group)} -> {per_group_target}")
            return await _llm_summarize_key_points(group, per_group_target, model)
    
    group_results = await asyncio.gather(*[process_group(g, i) for i, g in enumerate(groups)])
    
    # 合并结果
    reduced = []
    for result in group_results:
        reduced.extend(result)
    
    # 按时间戳排序
    reduced.sort(key=lambda kp: kp.timestamp)
    
    logger.info(f"[HierarchicalReduce] After this round: {len(reduced)} key points (reduced from {len(key_points)})")
    
    # 递归继续汇总
    return await _reduce_key_points_hierarchical(reduced, target_count, model, max_depth - 1)

