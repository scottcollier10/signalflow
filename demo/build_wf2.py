"""Build SignalFlow Demo #2: CRM Contact Sync (~16 nodes, HubSpot).

Engineered to trip:
- Rule 3  (batch loop): 'Loop Over Contacts' runs 25x (>20 with 'Loop' in name)
- Rule 21 (heavy compute in loop): 'Transform Contact Record' ~600ms x25
- Rule 26 (no rate-limit handling): HubSpot HTTP nodes execution_count>10
- Rule 4  (duplicate HTTP): 'HubSpot: Get Contact Props 1/2' share 20-char prefix
- Rule 8  (timeouts, CRITICAL): 9 timeout-worded errors on 'Check Sync Timeout'
- Rule 14 (high error rate): same node error_count>5
- Rule 10/11 (rate limit + network): varied errors on 'Validate Contact Email'
- Rule 15 (error cluster): >3 errors across 2 nodes, varied wording for
  the semantic-clustering showcase
- Rule 7  (hardcoded delay): 'Rate Limit Delay' 0.5s round-number in-loop wait
"""
from n8n_api import call

WF_NAME = "SignalFlow Demo 2 — CRM Contact Sync"
WEBHOOK_PATH = "sf-demo-crm-sync"
HUBSPOT_CRED = {"httpHeaderAuth": {"id": "cajclfnTNjb94L3J",
                                   "name": "Hubspot Campaign Auditor - Demo"}}


def node(name, ntype, tv, params, pos, **extra):
    return {"name": name, "type": ntype, "typeVersion": tv,
            "parameters": params, "position": pos, **extra}


TIMEOUT_CODE = """\
const i = $runIndex;
const msgs = [
  'Request timed out after 30000ms waiting for HubSpot response',
  'Connection timed out while contacting api.hubapi.com',
  'Sync operation timed out: upstream gateway timeout',
  'ETIMEDOUT: socket timed out after 30s',
];
if (i % 3 === 0) {
  throw new Error(msgs[Math.floor(i / 3) % msgs.length]);
}
return $input.all();"""

VALIDATE_CODE = """\
const i = $runIndex;
const msgs = [
  'ECONNREFUSED: connection refused by email validation service',
  'Connection reset by peer during email validation',
  '429 Too Many Requests: rate limit exceeded on validation API',
  'getaddrinfo ENOTFOUND: DNS lookup failed for validator host',
  'Network error: connection refused after 3 attempts',
];
if (i % 5 === 2) {
  throw new Error(msgs[Math.floor(i / 5) % msgs.length]);
}
return $input.all();"""

TRANSFORM_CODE = """\
// Simulate CPU-bound per-record enrichment scoring
const start = Date.now();
let acc = 0;
while (Date.now() - start < 600) { acc += Math.sqrt(acc + 1); }
const c = $json;
return [{ json: {
  id: c.id,
  email: c.properties?.email ?? null,
  name: `${c.properties?.firstname || ''} ${c.properties?.lastname || ''}`.trim(),
  score: Math.round(acc % 100),
} }];"""

nodes = [
    node("Sync Webhook", "n8n-nodes-base.webhook", 2,
         {"httpMethod": "POST", "path": WEBHOOK_PATH, "responseMode": "onReceived"},
         [0, 0]),
    node("Load Sync Config", "n8n-nodes-base.set", 3.4,
         {"assignments": {"assignments": [
             {"id": "c1", "name": "sync_mode", "type": "string", "value": "full"},
             {"id": "c2", "name": "batch_size", "type": "number", "value": 1},
         ]}},
         [200, 0]),
    node("HubSpot: Fetch Contacts", "n8n-nodes-base.httpRequest", 4.2,
         {"url": "https://api.hubapi.com/crm/v3/objects/contacts",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth",
          "sendQuery": True,
          "queryParameters": {"parameters": [
              {"name": "limit", "value": "25"},
              {"name": "properties", "value": "firstname,lastname,email,lifecyclestage"},
          ]},
          "options": {}},
         [400, 0], credentials=HUBSPOT_CRED),
    node("Split Contact List", "n8n-nodes-base.code", 2,
         {"jsCode": "return ($json.results || []).map(r => ({ json: r }));"},
         [600, 0]),
    node("Loop Over Contacts", "n8n-nodes-base.splitInBatches", 3,
         {"batchSize": 1, "options": {}},
         [800, 0]),
    # ---- loop body ----
    node("Transform Contact Record", "n8n-nodes-base.code", 2,
         {"jsCode": TRANSFORM_CODE},
         [1000, 200]),
    node("HubSpot: Get Contact Props 1", "n8n-nodes-base.httpRequest", 4.2,
         {"url": "=https://api.hubapi.com/crm/v3/objects/contacts/{{ $json.id }}",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth",
          "sendQuery": True,
          "queryParameters": {"parameters": [
              {"name": "properties", "value": "email,firstname,lastname,lifecyclestage"},
          ]},
          "options": {}},
         [1200, 200], credentials=HUBSPOT_CRED),
    node("HubSpot: Get Contact Props 2", "n8n-nodes-base.httpRequest", 4.2,
         {"url": "=https://api.hubapi.com/crm/v3/objects/contacts/{{ $('Transform Contact Record').item.json.id }}",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth",
          "sendQuery": True,
          "queryParameters": {"parameters": [
              {"name": "properties", "value": "email,firstname,lastname,lifecyclestage"},
          ]},
          "options": {}},
         [1400, 200], credentials=HUBSPOT_CRED),
    node("Check Sync Timeout", "n8n-nodes-base.code", 2,
         {"jsCode": TIMEOUT_CODE},
         [1600, 200], onError="continueRegularOutput"),
    node("Validate Contact Email", "n8n-nodes-base.code", 2,
         {"jsCode": VALIDATE_CODE},
         [1800, 200], onError="continueRegularOutput"),
    node("Rate Limit Delay", "n8n-nodes-base.wait", 1.1,
         {"amount": 0.5},
         [2000, 200], webhookId="sf-demo2-wait"),
    # ---- post-loop ----
    node("Aggregate Sync Results", "n8n-nodes-base.code", 2,
         {"jsCode": (
             "const items = $input.all();\n"
             "return [{ json: { synced: items.length, finished_at: new Date().toISOString() } }];"
         )},
         [1000, -200]),
    node("Format Summary Report", "n8n-nodes-base.set", 3.4,
         {"assignments": {"assignments": [
             {"id": "s1", "name": "report", "type": "string",
              "value": "=Synced {{ $json.synced }} contacts at {{ $json.finished_at }}"},
         ]}},
         [1200, -200]),
    node("Archive Sync Log", "n8n-nodes-base.httpRequest", 4.2,
         {"method": "POST", "url": "https://httpbin.org/post",
          "sendBody": True, "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify($json) }}", "options": {}},
         [1400, -200]),
]

conn = lambda *targets: {"main": [
    [{"node": t, "type": "main", "index": 0}] for t in targets
]}

connections = {
    "Sync Webhook": conn("Load Sync Config"),
    "Load Sync Config": conn("HubSpot: Fetch Contacts"),
    "HubSpot: Fetch Contacts": conn("Split Contact List"),
    "Split Contact List": conn("Loop Over Contacts"),
    # splitInBatches: output 0 = done, output 1 = loop body
    "Loop Over Contacts": {"main": [
        [{"node": "Aggregate Sync Results", "type": "main", "index": 0}],
        [{"node": "Transform Contact Record", "type": "main", "index": 0}],
    ]},
    "Transform Contact Record": conn("HubSpot: Get Contact Props 1"),
    "HubSpot: Get Contact Props 1": conn("HubSpot: Get Contact Props 2"),
    "HubSpot: Get Contact Props 2": conn("Check Sync Timeout"),
    "Check Sync Timeout": conn("Validate Contact Email"),
    "Validate Contact Email": conn("Rate Limit Delay"),
    "Rate Limit Delay": conn("Loop Over Contacts"),
    "Aggregate Sync Results": conn("Format Summary Report"),
    "Format Summary Report": conn("Archive Sync Log"),
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
print(f"Activated. Webhook path: /webhook/{WEBHOOK_PATH}")
