import pytest

from dawnchat_sdk.host_capabilities import ASRCapability


class _FakeHandle:
    def __init__(self, result):
        self._result = result

    async def wait(self, timeout=120.0, poll_interval=0.5, on_progress=None):
        _ = (timeout, poll_interval)
        if on_progress:
            on_progress(1.0, "done")
        return self._result


class _FakeGateway:
    def __init__(self):
        self.last_submit = None

    async def submit(self, tool_name, arguments=None, timeout=120.0):
        self.last_submit = {"tool_name": tool_name, "arguments": arguments or {}, "timeout": timeout}
        return _FakeHandle({"code": 200, "message": "success", "data": {"segments": [], "speakers": []}})


class _FakeTools:
    def __init__(self):
        self.calls = []

    async def call(self, tool_name, arguments=None, timeout=120.0, on_progress=None):
        _ = (timeout, on_progress)
        self.calls.append((tool_name, arguments or {}))
        if tool_name == "dawnchat.asr.transcribe":
            return {
                "code": 200,
                "message": "success",
                "data": {"segments": [{"text": "hello", "start": 0.0, "end": 1.0}], "text": "hello"},
            }
        if tool_name == "plugin.com.dawnchat.diarization.merge_speakers":
            return {"code": 200, "message": "success", "data": {"segments": [{"text": "hello", "speaker": "SPEAKER_00"}]}}
        return {"code": 500, "message": "unexpected tool", "data": None}


class _FakeClient:
    def __init__(self):
        self.tools = _FakeTools()
        self.gateway = _FakeGateway()


@pytest.mark.asyncio
async def test_diarize_routes_to_plugin_gateway():
    client = _FakeClient()
    cap = ASRCapability(client)

    result = await cap.diarize("/tmp/audio.wav", num_speakers=2, timeout=30)

    assert result["code"] == 200
    assert client.gateway.last_submit is not None
    assert client.gateway.last_submit["tool_name"] == "plugin.com.dawnchat.diarization.diarize"
    assert client.gateway.last_submit["arguments"]["audio_path"] == "/tmp/audio.wav"
    assert client.gateway.last_submit["arguments"]["num_speakers"] == 2


@pytest.mark.asyncio
async def test_transcribe_with_speakers_uses_plugin_merge_tool():
    client = _FakeClient()
    cap = ASRCapability(client)

    result = await cap.transcribe_with_speakers("/tmp/audio.wav")

    assert result["code"] == 200
    called_tool_names = [name for name, _ in client.tools.calls]
    assert "dawnchat.asr.transcribe" in called_tool_names
    assert "plugin.com.dawnchat.diarization.merge_speakers" in called_tool_names
