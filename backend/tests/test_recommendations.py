from app.services.recommendations import build_recommendations

def test_empty_events_returns_baseline():
    result = build_recommendations([])
    assert result and "baseline" in result[0]["type"]

def test_posture_events_trigger_explanation():
    result = build_recommendations([{"event_type":"posture_proxy"} for _ in range(3)])
    assert any(r["type"] == "ergonomics" for r in result)
