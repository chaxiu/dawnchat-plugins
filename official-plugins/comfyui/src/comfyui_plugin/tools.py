import asyncio
import json
import logging
import random
import re
import tempfile
import uuid
from pathlib import Path
from typing import Any

from comfyui_wrapper.workflow_templates.registry import WorkflowRegistry

from dawnchat_sdk import report_task_progress

from .client import get_comfy_client
from .manager import ComfyUIManager

logger = logging.getLogger("comfyui_tools")


class ComfyUITools:
    def __init__(self, base_dir: Path):
        self._manager = ComfyUIManager(base_dir)
        self._client = get_comfy_client()
        self._workflow_registry = WorkflowRegistry(base_dir / "comfyui_wrapper" / "workflow_templates" / "templates")

    async def status(self) -> dict[str, Any]:
        ready = await self._manager.is_ready()
        running = self._manager.is_running()
        return {"ready": ready, "running": running, "base_url": self._manager.base_url if running else None}

    async def list_workflows(self, task_type: str | None = None) -> dict[str, Any]:
        workflows = self._workflow_registry.list_workflows(task_type=task_type)
        data = [
            {
                "id": wf.id,
                "name": wf.name,
                "description": wf.description,
                "task_type": wf.task_type,
                "required_models": wf.required_models,
                "input_schema": wf.input_schema,
            }
            for wf in workflows
        ]
        return {"workflows": data, "total": len(data)}

    async def text_to_image(self, args: dict[str, Any]) -> dict[str, Any]:
        args = dict(args)
        args.setdefault("workflow_id", "sdxl_t2i_basic")
        return await self._execute_workflow(args["workflow_id"], args)

    async def image_to_image(self, args: dict[str, Any]) -> dict[str, Any]:
        args = dict(args)
        args.setdefault("workflow_id", "sdxl_i2i_basic")
        return await self._execute_workflow(args["workflow_id"], args)

    async def inpaint(self, args: dict[str, Any]) -> dict[str, Any]:
        args = dict(args)
        args.setdefault("workflow_id", "sdxl_inpaint_basic")
        return await self._execute_workflow(args["workflow_id"], args)

    async def upscale(self, args: dict[str, Any]) -> dict[str, Any]:
        args = dict(args)
        args.setdefault("workflow_id", "upscale_4x")
        return await self._execute_workflow(args["workflow_id"], args)

    async def _execute_workflow(self, workflow_id: str, params: dict[str, Any]) -> dict[str, Any]:
        await report_task_progress(0.05, "checking ComfyUI service")
        started = await self._manager.ensure_running()
        if not started:
            return {"code": 503, "message": "comfyui_start_failed", "data": None}

        await report_task_progress(0.12, "loading workflow template")
        template = self._workflow_registry.load_template_json(workflow_id)
        if not template:
            return {"code": 404, "message": f"workflow_not_found: {workflow_id}", "data": None}
        template = self._strip_meta(template)

        if params.get("seed", -1) == -1:
            params["seed"] = random.randint(0, 18446744073709551615)

        workflow = self._fill_template(template, params)
        self._client.set_base_url(self._manager.base_url)

        image_path = params.get("image_path")
        if image_path:
            await report_task_progress(0.2, "uploading source image")
            uploaded = await self._upload_if_exists(image_path)
            if uploaded:
                params["image_path"] = uploaded
                workflow = self._fill_template(template, params)

        mask_path = params.get("mask_path")
        if mask_path:
            await report_task_progress(0.25, "uploading mask image")
            uploaded = await self._upload_if_exists(mask_path)
            if uploaded:
                params["mask_path"] = uploaded
                workflow = self._fill_template(template, params)

        try:
            await report_task_progress(0.35, "queueing workflow")
            prompt_id = await self._client.queue_prompt(workflow)

            def on_progress(progress: float, message: str) -> None:
                mapped_progress = 0.4 + (max(0.0, min(1.0, float(progress))) * 0.5)
                asyncio.create_task(report_task_progress(mapped_progress, f"generating: {message}"))

            result = await self._client.wait_for_completion(prompt_id, on_progress=on_progress)
            await report_task_progress(0.92, "collecting output images")
            images = await self._client.get_output_images(result)
            await report_task_progress(0.97, "saving output images")
            image_paths = self._save_images(images)
            await report_task_progress(1.0, "workflow completed")
            return {
                "code": 200,
                "message": "success",
                "data": {"images": image_paths, "prompt_id": prompt_id},
            }
        except Exception as exc:
            logger.error("ComfyUI execution failed: %s", exc, exc_info=True)
            return {"code": 500, "message": str(exc), "data": None}

    async def _upload_if_exists(self, path: str) -> str | None:
        file_path = Path(path).expanduser()
        if not file_path.exists():
            return None
        with open(file_path, "rb") as f:
            image_data = f.read()
        response = await self._client.upload_image(image_data, file_path.name)
        return response.get("name")

    def _save_images(self, images: list[bytes]) -> list[str]:
        temp_dir = Path(tempfile.gettempdir()) / "zenmind_comfyui"
        temp_dir.mkdir(parents=True, exist_ok=True)
        image_paths = []
        for img_bytes in images:
            filename = f"{uuid.uuid4()}.png"
            file_path = temp_dir / filename
            with open(file_path, "wb") as out_file:
                out_file.write(img_bytes)
            image_paths.append(str(file_path))
        return image_paths

    def _fill_template(self, template: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
        def replace_value(value: Any) -> Any:
            if isinstance(value, str):
                exact = re.fullmatch(r"\{\{(\w+)\}\}", value)
                if exact:
                    key = exact.group(1)
                    return params.get(key, value)
                return re.sub(r"\{\{(\w+)\}\}", lambda m: str(params.get(m.group(1), m.group(0))), value)
            if isinstance(value, list):
                return [replace_value(item) for item in value]
            if isinstance(value, dict):
                return {k: replace_value(v) for k, v in value.items()}
            return value

        return json.loads(json.dumps(replace_value(template)))

    def _strip_meta(self, template: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in template.items() if not k.startswith("_") and not k.startswith("#")}
