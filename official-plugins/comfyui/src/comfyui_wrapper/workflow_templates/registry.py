"""
Workflow Template Registry

Manages workflow templates and their metadata.
This wrapper code is part of DawnChat and is licensed under MIT.
ComfyUI itself is licensed under GPL-3.0.

Copyright (c) 2024 DawnChat Team
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class WorkflowTemplate:
    """Workflow template metadata."""
    id: str
    name: str
    description: str
    task_type: str  # text_to_image, image_to_image, inpaint, upscale, video_gen
    required_models: list[str]
    template_file: str
    input_schema: dict = field(default_factory=dict)
    preview_image: Optional[str] = None


# Built-in workflow templates
BUILTIN_WORKFLOWS: list[WorkflowTemplate] = [
    WorkflowTemplate(
        id="sdxl_t2i_basic",
        name="SDXL 文生图 (基础)",
        description="使用 SDXL 从文字描述生成高质量图片",
        task_type="text_to_image",
        required_models=["sdxl-base"],
        template_file="sdxl_t2i_basic.json",
        input_schema={
            "prompt": {"type": "string", "required": True, "description": "正向提示词"},
            "negative_prompt": {"type": "string", "default": "", "description": "负向提示词"},
            "width": {"type": "integer", "default": 1024, "min": 512, "max": 2048},
            "height": {"type": "integer", "default": 1024, "min": 512, "max": 2048},
            "steps": {"type": "integer", "default": 20, "min": 1, "max": 100},
            "cfg_scale": {"type": "number", "default": 7.0, "min": 1.0, "max": 20.0},
            "seed": {"type": "integer", "default": -1, "description": "-1 for random"},
        },
        preview_image="previews/sdxl_t2i.png"
    ),
    WorkflowTemplate(
        id="sdxl_i2i_basic",
        name="SDXL 图生图 (基础)",
        description="基于参考图片生成新图片",
        task_type="image_to_image",
        required_models=["sdxl-base"],
        template_file="sdxl_i2i_basic.json",
        input_schema={
            "image": {"type": "image", "required": True, "description": "参考图片"},
            "prompt": {"type": "string", "required": True, "description": "正向提示词"},
            "negative_prompt": {"type": "string", "default": ""},
            "strength": {"type": "number", "default": 0.7, "min": 0.0, "max": 1.0},
            "steps": {"type": "integer", "default": 20},
            "cfg_scale": {"type": "number", "default": 7.0},
        },
        preview_image="previews/sdxl_i2i.png"
    ),
    WorkflowTemplate(
        id="sdxl_inpaint_basic",
        name="SDXL 局部重绘",
        description="画出要修改的区域，输入描述进行局部替换",
        task_type="inpaint",
        required_models=["sdxl-inpaint"],
        template_file="sdxl_inpaint_basic.json",
        input_schema={
            "image": {"type": "image", "required": True, "description": "原始图片"},
            "mask": {"type": "image", "required": True, "description": "蒙版图片（白色区域将被重绘）"},
            "prompt": {"type": "string", "required": True, "description": "描述要生成的内容"},
            "negative_prompt": {"type": "string", "default": ""},
            "strength": {"type": "number", "default": 0.8, "min": 0.0, "max": 1.0},
            "steps": {"type": "integer", "default": 25},
        },
        preview_image="previews/sdxl_inpaint.png"
    ),
    WorkflowTemplate(
        id="upscale_4x",
        name="4x 超分辨率",
        description="将图片放大 4 倍并增强细节",
        task_type="upscale",
        required_models=["realesrgan-x4"],
        template_file="upscale_4x.json",
        input_schema={
            "image": {"type": "image", "required": True, "description": "要放大的图片"},
        },
        preview_image="previews/upscale_4x.png"
    ),
    WorkflowTemplate(
        id="lama_inpaint",
        name="LaMa 智能擦除",
        description="使用 LaMa 模型智能擦除图片中的内容",
        task_type="inpaint",
        required_models=["lama"],
        template_file="lama_inpaint.json",
        input_schema={
            "image": {"type": "image", "required": True},
            "mask": {"type": "image", "required": True},
        },
        preview_image="previews/lama_inpaint.png"
    ),
]


class WorkflowRegistry:
    """
    Registry for workflow templates.
    
    Manages loading, querying, and building workflows.
    """
    
    def __init__(self, templates_dir: Optional[Path] = None):
        self._templates_dir = templates_dir or Path(__file__).parent / "templates"
        self._workflows: dict[str, WorkflowTemplate] = {}
        self._load_builtin_workflows()
    
    def _load_builtin_workflows(self):
        """Load built-in workflow templates."""
        for wf in BUILTIN_WORKFLOWS:
            self._workflows[wf.id] = wf
    
    def get_workflow(self, workflow_id: str) -> Optional[WorkflowTemplate]:
        """Get a workflow template by ID."""
        return self._workflows.get(workflow_id)
    
    def list_workflows(self, task_type: Optional[str] = None) -> list[WorkflowTemplate]:
        """
        List all workflow templates.
        
        Args:
            task_type: Filter by task type (optional)
            
        Returns:
            List of workflow templates
        """
        workflows = list(self._workflows.values())
        
        if task_type:
            workflows = [wf for wf in workflows if wf.task_type == task_type]
        
        return workflows
    
    def get_workflows_for_model(self, model_id: str) -> list[WorkflowTemplate]:
        """Get all workflows that use a specific model."""
        return [
            wf for wf in self._workflows.values()
            if model_id in wf.required_models
        ]
    
    def load_template_json(self, workflow_id: str) -> Optional[dict]:
        """
        Load the JSON template for a workflow.
        
        Args:
            workflow_id: The workflow ID
            
        Returns:
            The workflow JSON dict, or None if not found
        """
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            return None
        
        template_path = self._templates_dir / workflow.template_file
        if not template_path.exists():
            return None
        
        with open(template_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def build_workflow(
        self, 
        workflow_id: str, 
        params: dict
    ) -> Optional[dict]:
        """
        Build a workflow with the given parameters.
        
        Args:
            workflow_id: The workflow ID
            params: Parameters to fill into the template
            
        Returns:
            The filled workflow JSON, or None if not found
        """
        template = self.load_template_json(workflow_id)
        if not template:
            return None
        
        # TODO: Implement parameter substitution based on input_schema
        # For now, return the template as-is
        return template

