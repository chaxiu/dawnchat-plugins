"""
Course management module.
"""

from .models import Course, Segment, SegmentStatus, WordScore
from .segmenter import SubtitleSegmenter

# Lazy import to avoid dawnchat_sdk dependency at import time
def get_course_importer():
    from .importer import CourseImporter
    return CourseImporter

__all__ = [
    "Course",
    "Segment",
    "SegmentStatus",
    "WordScore",
    "get_course_importer",
    "SubtitleSegmenter",
]

