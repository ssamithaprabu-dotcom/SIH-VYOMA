import httpx
import json
from typing import Dict, Any, Optional, List
from ai_backend.config import settings
from ai_backend.llm.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

class OllamaClient:
    """
    Async client for local Ollama LLM inference.
    Handles HTTP API calls, timeout, retry once, JSON parsing, and fallback.
    """
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.LLM_MODEL
        self.temperature = settings.LLM_TEMPERATURE
        self.max_tokens = settings.LLM_MAX_TOKENS
        self.timeout = settings.LLM_TIMEOUT_SECONDS
        self.allowed_actions = settings.load_yaml_config("config/actions.yaml").get("allowed_actions", [])
        self.allowed_action_ids = [a["id"] for a in self.allowed_actions]

    async def warm_up(self):
        """Warm up model on startup to reduce initial call latency."""
        try:
            async with httpx.AsyncClient(timeout=0.5) as client:
                await client.post(
                    f"{self.base_url}/api/generate",
                    json={"model": self.model, "prompt": "warmup", "keep_alive": settings.LLM_KEEP_ALIVE}
                )
        except Exception:
            pass

    async def generate_analysis(self, sensor: str, parameter: str, current_value: str, unit: str,
                                flight_phase: str, fault: str, severity: str, measured_evidence: str,
                                context_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        
        context_str = "\n\n".join([f"--- Chunk from {c.get('source', 'doc')} ---\n{c.get('content', '')}" for c in context_chunks])
        if not context_str.strip():
            context_str = "No specific knowledge base documents retrieved for this fault."

        allowed_actions_str = json.dumps(self.allowed_action_ids)
        system_msg = SYSTEM_PROMPT.format(allowed_actions_json=allowed_actions_str)
        user_msg = USER_PROMPT_TEMPLATE.format(
            sensor=sensor,
            parameter=parameter,
            current_value=current_value,
            unit=unit,
            flight_phase=flight_phase,
            fault=fault,
            severity=severity,
            measured_evidence=measured_evidence,
            context=context_str
        )

        payload = {
            "model": self.model,
            "prompt": f"{system_msg}\n\n{user_msg}",
            "stream": False,
            "format": "json",
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens
            },
            "keep_alive": settings.LLM_KEEP_ALIVE
        }

        # Call Ollama API with retry logic
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(f"{self.base_url}/api/generate", json=payload)
                    if response.status_code == 200:
                        raw_res = response.json().get("response", "")
                        parsed = json.loads(raw_res)
                        if isinstance(parsed, dict):
                            parsed = {k.strip(): v for k, v in parsed.items()}
                        else:
                            parsed = {}
                        
                        # Validate suggested_action_id against whitelist
                        suggested_id = parsed.get("suggested_action_id")
                        if suggested_id and suggested_id not in self.allowed_action_ids:
                            parsed["suggested_action_id"] = None

                        return {
                            "possible_causes": parsed.get("possible_causes", ["Potential telemetry anomaly (AI inference)"]),
                            "recommended_action": parsed.get("recommended_action", "Cross-check sensor telemetry on ground display."),
                            "suggested_action_id": parsed.get("suggested_action_id"),
                            "ai_status": "COMPLETE"
                        }
            except Exception as e:
                print(f"[OllamaClient] Attempt {attempt+1} failed: {e}")

        # Fallback response if Ollama fails or is unavailable
        return {
            "possible_causes": ["System anomaly detected (Rule-based detection)"],
            "recommended_action": "Follow standard operating procedures for detected fault.",
            "suggested_action_id": None,
            "ai_status": "FALLBACK"
        }
