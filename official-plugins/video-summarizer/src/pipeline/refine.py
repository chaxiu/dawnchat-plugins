"""
Refine Pipeline - ASR 后处理修正

使用 LLM 对 ASR 识别结果进行后处理，修正明显的错别字。
保持原始时间戳结构不变。
"""

import asyncio
import json
import logging
from typing import Optional, List

from dawnchat_sdk import host

from pipeline.transcribe import Segment

logger = logging.getLogger("video-summarizer.refine")


# 配置
BATCH_SIZE = 25  # 每批处理的segments数量
MAX_CONCURRENT_REQUESTS = 2

# Prompt 模板
REFINE_PROMPT = """你是一个专业的语音识别后处理助手。以下是语音识别(ASR)的输出结果，可能包含一些识别错误。

请仔细检查并修正明显的错别字和识别错误，但要注意：
1. 重点修正“同音词”，ASR 由于缺少 context，往往存在同音词错误，需要重点修正；
2. 保持语句通顺自然
3. 不要添加或删除内容
4. 保持JSON数组格式输出

输入格式：JSON数组，每个元素包含 index 和 text
输出格式：相同结构的JSON数组，只修正 text 字段

输入：
{input_json}

请直接输出修正后的JSON数组（不要包含其他说明文字）："""


async def refine_segments(
    segments: List[Segment],
    model: Optional[str] = None
) -> List[Segment]:
    """
    对ASR识别结果进行后处理修正
    
    Args:
        segments: ASR输出的原始segments
        model: 使用的LLM模型
        
    Returns:
        修正后的segments列表（保持原始时间戳）
    """
    if not segments:
        return segments
    
    logger.info(f"[Refine] Starting refinement: {len(segments)} segments, model={model}")
    
    # 将segments分批
    batches = _create_batches(segments, BATCH_SIZE)
    logger.info(f"[Refine] Created {len(batches)} batches")
    
    # 并发处理各批次
    refined_batches = await _process_batches(batches, model)
    
    # 合并结果
    refined_segments = []
    for batch in refined_batches:
        refined_segments.extend(batch)
    
    logger.info(f"[Refine] Refinement complete: {len(refined_segments)} segments")
    
    return refined_segments


def _create_batches(
    segments: List[Segment],
    batch_size: int
) -> List[List[Segment]]:
    """将segments分批"""
    batches = []
    for i in range(0, len(segments), batch_size):
        batch = segments[i:i + batch_size]
        batches.append(batch)
    return batches


async def _process_batches(
    batches: List[List[Segment]],
    model: Optional[str]
) -> List[List[Segment]]:
    """并发处理各批次"""
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    
    async def process_batch(batch_idx: int, batch: List[Segment]) -> List[Segment]:
        async with semaphore:
            return await _refine_batch(batch_idx, batch, model)
    
    tasks = [process_batch(i, batch) for i, batch in enumerate(batches)]
    results = await asyncio.gather(*tasks)
    
    return list(results)


async def _refine_batch(
    batch_idx: int,
    batch: List[Segment],
    model: Optional[str]
) -> List[Segment]:
    """
    处理单个批次的segments
    
    使用LLM修正文本，保持时间戳不变
    """
    logger.debug(f"[Refine] Processing batch {batch_idx}: {len(batch)} segments")
    
    # 构建输入JSON
    input_data = [
        {"index": i, "text": seg.text}
        for i, seg in enumerate(batch)
    ]
    input_json = json.dumps(input_data, ensure_ascii=False, indent=2)
    
    prompt = REFINE_PROMPT.format(input_json=input_json)
    
    try:
        response = await host.ai.chat(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            temperature=0.1  # 低温度保持准确性
        )
        
        content = response.get("content", "")
        logger.debug(f"[Refine] Batch {batch_idx} response: {len(content)} chars")
        
        # 解析LLM输出
        refined_texts = _parse_refined_output(content, len(batch))
        
        if refined_texts and len(refined_texts) == len(batch):
            # 应用修正后的文本，保持原始时间戳
            refined_batch = []
            for i, seg in enumerate(batch):
                refined_seg = Segment(
                    start=seg.start,
                    end=seg.end,
                    text=refined_texts[i],
                    speaker=seg.speaker
                )
                refined_batch.append(refined_seg)
            
            # 统计修正数量
            changed_count = sum(1 for i in range(len(batch)) if batch[i].text != refined_texts[i])
            logger.debug(f"[Refine] Batch {batch_idx}: {changed_count}/{len(batch)} segments refined")
            
            return refined_batch
        else:
            logger.warning(f"[Refine] Batch {batch_idx}: Parse failed, keeping original")
            return batch
            
    except Exception as e:
        logger.error(f"[Refine] Batch {batch_idx} failed: {e}")
        return batch  # 失败时返回原始数据


def _parse_refined_output(content: str, expected_count: int) -> Optional[List[str]]:
    """
    解析LLM输出的JSON数组
    
    Returns:
        修正后的文本列表，或None（如果解析失败）
    """
    try:
        # 尝试直接解析JSON
        content = content.strip()
        
        # 移除可能的markdown代码块标记
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            content = content.strip()
        
        data = json.loads(content)
        
        if not isinstance(data, list):
            logger.warning("[Refine] Output is not a list")
            return None
        
        if len(data) != expected_count:
            logger.warning(f"[Refine] Output count mismatch: expected {expected_count}, got {len(data)}")
            return None
        
        # 提取文本
        texts = []
        for i, item in enumerate(data):
            if isinstance(item, dict) and "text" in item:
                texts.append(item["text"])
            elif isinstance(item, str):
                texts.append(item)
            else:
                logger.warning(f"[Refine] Invalid item at index {i}")
                return None
        
        return texts
        
    except json.JSONDecodeError as e:
        logger.warning(f"[Refine] JSON parse error: {e}")
        return None
    except Exception as e:
        logger.warning(f"[Refine] Parse error: {e}")
        return None




