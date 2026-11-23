from collections import Counter


def build_recommendations(events: list[dict]) -> list[dict]:
    snapshots = [event.get("metadata", {}) for event in events if event.get("event_type") == "vision_snapshot"]
    recent = snapshots[-24:]
    suggestions: list[dict] = []

    slouch_checks = [item for item in recent if item.get("posture") in {"slouching", "leaning"}]
    if len(slouch_checks) >= 3:
        suggestions.append({
            "title": "Try a comfortable posture reset",
            "message": "Several recent camera checks estimated a forward or leaning posture. If it feels useful, relax your shoulders and adjust your screen height.",
            "evidence": f"{len(slouch_checks)} of the last {len(recent)} saved checks showed a lean or slouch estimate.",
            "type": "posture",
            "confidence": "low · visual estimate"
        })

    latest = recent[-1] if recent else {}
    static_seconds = latest.get("static_seconds")
    if isinstance(static_seconds, (int, float)) and static_seconds >= 180:
        suggestions.append({
            "title": "Take a brief movement break",
            "message": "The camera has observed a mostly still posture for a few minutes. Consider standing, stretching, or taking a short walk if that suits you.",
            "evidence": f"The latest still-posture estimate is {int(static_seconds // 60)} minutes.",
            "type": "break",
            "confidence": "low · movement proxy"
        })

    phone_checks = [item for item in recent if item.get("phone_use_likely")]
    if len(phone_checks) >= 2:
        suggestions.append({
            "title": "A phone has been visible near your hands",
            "message": "If you did not mean to check it, placing it farther away may make it easier to stay with your current task.",
            "evidence": f"A phone near a hand was estimated in {len(phone_checks)} of the last {len(recent)} checks.",
            "type": "distraction",
            "confidence": "low · object and pose estimate"
        })

    facing_checks = [item for item in recent if isinstance(item.get("screen_facing"), bool)]
    if len(facing_checks) >= 5:
        facing_ratio = sum(item["screen_facing"] for item in facing_checks) / len(facing_checks)
        if facing_ratio < 0.4:
            suggestions.append({
                "title": "Check your screen and camera position",
                "message": "The face-facing estimate was low in recent checks. Your camera may be off to the side, or you may have been looking elsewhere; adjust your setup only if helpful.",
                "evidence": f"The face appeared camera-facing in {round(facing_ratio * 100)}% of checks with a visible face.",
                "type": "workspace",
                "confidence": "low · face direction proxy"
            })

    if not suggestions:
        if recent:
            suggestions.append({
                "title": "Your session is taking shape",
                "message": "Keep collecting observations to see movement and posture patterns. FLOWSTATE will keep uncertain signals clearly labeled.",
                "evidence": f"{len(recent)} recent visual checks are available.",
                "type": "baseline",
                "confidence": "observational"
            })
        else:
            counts = Counter(event["event_type"] for event in events)
            if counts.get("posture_proxy", 0) >= 3:
                suggestions.append({
                    "title": "Review your workspace posture",
                    "message": "Several posture observations were recorded. Consider changing position or adjusting your setup if it feels uncomfortable.",
                    "evidence": f"{counts['posture_proxy']} posture observations are available.",
                    "type": "posture",
                    "confidence": "low · visual estimate"
                })
            if not suggestions:
                suggestions.append({
                    "title": "Start with a short check-in",
                    "message": "A few short sessions can help you notice your own activity patterns. You can pause or stop camera analysis at any time.",
                    "evidence": f"{len(events)} structured observations are available.",
                    "type": "baseline",
                    "confidence": "observational"
                })

    return suggestions
