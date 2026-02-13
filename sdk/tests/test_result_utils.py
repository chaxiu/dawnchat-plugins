from dawnchat_sdk.result_utils import extract_result_data, normalize_tool_result


def test_normalize_tool_result_unwraps_nested_envelope():
    raw = {
        "code": 200,
        "message": "success",
        "data": {
            "code": 200,
            "message": "success",
            "data": {"segments": [{"speaker": "SPEAKER_00"}]},
        },
    }
    normalized = normalize_tool_result(raw)
    assert normalized["code"] == 200
    assert normalized["data"]["segments"][0]["speaker"] == "SPEAKER_00"


def test_normalize_tool_result_parses_mcp_content_text():
    raw = [
        {
            "type": "text",
            "text": '{"code":200,"message":"success","data":{"code":200,"message":"success","data":{"count":1}}}',
        }
    ]
    normalized = normalize_tool_result(raw)
    assert normalized["code"] == 200
    assert normalized["data"]["count"] == 1


def test_extract_result_data_returns_dict_data():
    raw = {
        "code": 200,
        "message": "success",
        "data": {"code": 200, "message": "success", "data": {"output_path": "/tmp/a.wav"}},
    }
    data = extract_result_data(raw)
    assert data["output_path"] == "/tmp/a.wav"

