"""Build SignalFlow Demo #1: Lead Intake & Enrichment (~10 nodes, keyless).

Engineered to trip:
- Rule 1  (parallelize): 3 consecutive HTTP nodes on the critical path
- Rule 18 (high-latency HTTP): each enrichment call >2000ms (httpbin /delay/2)
- Rule 7  (hardcoded delay): 'Wait For Rate Limit' 3s round-number wait
- Rule 5  (sync wait): 'wait' in node name
- Rule 17 (critical-path heavy): each delay node >10% of total duration
"""
from n8n_api import call

WF_NAME = "SignalFlow Demo 1 — Lead Intake & Enrichment"
WEBHOOK_PATH = "sf-demo-lead-intake"


def node(name, ntype, tv, params, pos, **extra):
    return {"name": name, "type": ntype, "typeVersion": tv,
            "parameters": params, "position": pos, **extra}


nodes = [
    node("Lead Webhook", "n8n-nodes-base.webhook", 2,
         {"httpMethod": "POST", "path": WEBHOOK_PATH, "responseMode": "onReceived"},
         [0, 0]),
    node("Normalize Lead", "n8n-nodes-base.set", 3.4,
         {"assignments": {"assignments": [
             {"id": "a1", "name": "email", "type": "string",
              "value": "={{ $json.body?.email || 'demo@example.com' }}"},
             {"id": "a2", "name": "company", "type": "string",
              "value": "={{ $json.body?.company || 'Acme Corp' }}"},
             {"id": "a3", "name": "source", "type": "string", "value": "webform"},
         ]}},
         [200, 0]),
    node("Enrich: Company Data", "n8n-nodes-base.httpRequest", 4.2,
         {"url": "https://httpbin.org/delay/2", "options": {}},
         [400, 0]),
    node("Enrich: Geo Lookup", "n8n-nodes-base.httpRequest", 4.2,
         {"url": "https://httpbin.org/delay/2", "options": {}},
         [600, 0]),
    node("Enrich: Social Profile", "n8n-nodes-base.httpRequest", 4.2,
         {"url": "https://httpbin.org/delay/2", "options": {}},
         [800, 0]),
    node("Wait For Rate Limit", "n8n-nodes-base.wait", 1.1,
         {"amount": 3},
         [1000, 0], webhookId="sf-demo1-wait"),
    node("Score Lead", "n8n-nodes-base.code", 2,
         {"jsCode": (
             "const email = $('Normalize Lead').first().json.email || '';\n"
             "const domain = email.split('@')[1] || '';\n"
             "let score = 50;\n"
             "if (!['gmail.com','yahoo.com','hotmail.com'].includes(domain)) score += 25;\n"
             "if ($('Normalize Lead').first().json.company !== 'Unknown') score += 15;\n"
             "return [{ json: { email, domain, score, grade: score >= 75 ? 'A' : 'B' } }];"
         )},
         [1200, 0]),
    node("Format CRM Payload", "n8n-nodes-base.set", 3.4,
         {"assignments": {"assignments": [
             {"id": "b1", "name": "properties.email", "type": "string", "value": "={{ $json.email }}"},
             {"id": "b2", "name": "properties.lead_score", "type": "number", "value": "={{ $json.score }}"},
             {"id": "b3", "name": "properties.lifecycle_stage", "type": "string", "value": "lead"},
         ]}},
         [1400, 0]),
    node("Post To CRM Endpoint", "n8n-nodes-base.httpRequest", 4.2,
         {"method": "POST", "url": "https://httpbin.org/post",
          "sendBody": True, "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify($json) }}", "options": {}},
         [1600, 0]),
]

order = [n["name"] for n in nodes]
connections = {
    a: {"main": [[{"node": b, "type": "main", "index": 0}]]}
    for a, b in zip(order, order[1:])
}

wf = call("POST", "/workflows", {
    "name": WF_NAME,
    "nodes": nodes,
    "connections": connections,
    "settings": {"executionOrder": "v1", "saveDataSuccessExecution": "all",
                 "saveDataErrorExecution": "all"},
})
print(f"Created: {wf['id']}  ({wf['name']}, {len(wf['nodes'])} nodes)")

call("POST", f"/workflows/{wf['id']}/activate")
print(f"Activated. Webhook: {call.__module__} -> /webhook/{WEBHOOK_PATH}")
