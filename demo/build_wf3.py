"""Build SignalFlow Demo #3: Content Pipeline (~28 nodes, Anthropic).

Flagship demo. Engineered to trip:
- Rule 2  (long node): 'Legacy Export API' >10s AND high bottleneck score AND
  on critical path
- Rules 36/37 (bottleneck score CRITICAL/HIGH): same node dominates duration
- Rule 17 (critical-path heavy): several nodes >10% of total duration
- Rule 31 (expensive AI in loop): 'Claude: Enrich Section' runs 6x (>5)
- Rule 7  (hardcoded delay): 'Rate Limit Wait' 5s round-number
- Rule 5  (sync waits / polling): 'Wait Before Poll' + repeated 'Poll Job Status'
- Rule 1  (sequential HTTP): legacy chain has 3+ consecutive HTTP calls
- Rule 18 (high-latency HTTP): delay/10 and delay/2 calls >2000ms
- Story: 3 merged branches show critical path != every slow node
"""
import os

WF_NAME = "SignalFlow Demo 3 — Content Pipeline"
WEBHOOK_PATH = "sf-demo-content-pipeline"
CLAUDE_HEADERS = {"parameters": [
    {"name": "anthropic-version", "value": "2023-06-01"},
    {"name": "Content-Type", "value": "application/json"},
]}


def _anthropic_cred():
    return {"httpHeaderAuth": {
        "id": os.environ.get("N8N_ANTHROPIC_CRED_ID", "YOUR_CREDENTIAL_ID"),
        "name": os.environ.get("N8N_ANTHROPIC_CRED_NAME", "anthropic-api-key"),
    }}


def node(name, ntype, tv, params, pos, **extra):
    return {"name": name, "type": ntype, "typeVersion": tv,
            "parameters": params, "position": pos, **extra}


def http(name, url, pos, method="GET", body=None, cred=None, headers=None):
    p = {"url": url, "options": {}}
    if method != "GET":
        p["method"] = method
    if body is not None:
        p.update({"sendBody": True, "specifyBody": "json", "jsonBody": body})
    if headers is not None:
        p.update({"sendHeaders": True, "headerParameters": headers})
    if cred:
        p.update({"authentication": "genericCredentialType",
                  "genericAuthType": "httpHeaderAuth"})
        p["options"] = {"timeout": 60000}
    n = node(name, "n8n-nodes-base.httpRequest", 4.2, p, pos)
    if cred:
        n["credentials"] = cred
    return n


BUILD_PROMPT = """\
const section = $json.section;
return [{ json: {
  model: 'claude-sonnet-4-5',
  max_tokens: 60,
  messages: [{
    role: 'user',
    content: `Write exactly one short sentence of marketing copy for the "${section}" section of a product page about an n8n workflow profiler.`,
  }],
} }];"""

SEO_PROMPT = """\
return [{ json: {
  model: 'claude-sonnet-4-5',
  max_tokens: 80,
  messages: [{
    role: 'user',
    content: 'Write a 150-character SEO meta description for a tool that profiles n8n workflow executions and finds bottlenecks. Return only the description.',
  }],
} }];"""


def _build_nodes():
    cred = _anthropic_cred()
    return [
        node("Pipeline Webhook", "n8n-nodes-base.webhook", 2,
             {"httpMethod": "POST", "path": WEBHOOK_PATH, "responseMode": "onReceived"},
             [0, 0]),
        node("Load Pipeline Config", "n8n-nodes-base.set", 3.4,
             {"assignments": {"assignments": [
                 {"id": "p1", "name": "pipeline", "type": "string", "value": "product-page"},
                 {"id": "p2", "name": "requested_at", "type": "string", "value": "={{ $now.toISO() }}"},
             ]}},
             [200, 0]),
        # --- branch A: research ---
        http("Fetch Source Articles", "https://httpbin.org/delay/1", [400, -300]),
        http("Fetch Trend Data", "https://httpbin.org/delay/2", [600, -300]),
        node("Parse Research Notes", "n8n-nodes-base.code", 2,
             {"jsCode": "return [{ json: { research: 'parsed', sources: 2 } }];"},
             [800, -300]),
        # --- branch B: assets ---
        http("Fetch Brand Assets", "https://httpbin.org/delay/1", [400, 0]),
        node("Resize Hero Image", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "const start = Date.now();\n"
                 "let acc = 0;\n"
                 "while (Date.now() - start < 300) { acc += Math.sqrt(acc + 1); }\n"
                 "return [{ json: { asset: 'hero.png', width: 1200, checksum: Math.round(acc) } }];"
             )},
             [600, 0]),
        # --- branch C: legacy export chain (the critical path) ---
        http("Legacy Export API", "https://httpbin.org/delay/10", [400, 300]),
        node("Transform Legacy Payload", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "const start = Date.now();\n"
                 "let acc = 0;\n"
                 "while (Date.now() - start < 400) { acc += Math.sqrt(acc + 1); }\n"
                 "return [{ json: { legacy: 'transformed', rows: 1842 } }];"
             )},
             [600, 300]),
        node("Rate Limit Wait", "n8n-nodes-base.wait", 1.1,
             {"amount": 5},
             [800, 300], webhookId="sf-demo3-wait-a"),
        http("Submit Render Job", "https://httpbin.org/post", [1000, 300],
             method="POST", body='={{ JSON.stringify({job: "render", rows: $json.rows}) }}'),
        http("Poll Job Status", "https://httpbin.org/get?job=render-42", [1200, 300]),
        node("Check Render Status", "n8n-nodes-base.code", 2,
             {"jsCode": "return [{ json: { ...$json.args, complete: $runIndex >= 2 } }];"},
             [1400, 300]),
        node("Job Complete?", "n8n-nodes-base.if", 2.2,
             {"conditions": {
                 "options": {"caseSensitive": True, "typeValidation": "loose", "version": 2},
                 "combinator": "and",
                 "conditions": [{
                     "id": "j1",
                     "leftValue": "={{ $json.complete }}",
                     "rightValue": "true",
                     "operator": {"type": "boolean", "operation": "true", "singleValue": True},
                 }],
             }},
             [1600, 300]),
        node("Wait Before Poll", "n8n-nodes-base.wait", 1.1,
             {"amount": 2},
             [1600, 500], webhookId="sf-demo3-wait-b"),
        # --- merge ---
        node("Merge Pipeline Inputs", "n8n-nodes-base.merge", 3,
             {"numberInputs": 3},
             [1900, 0]),
        node("Plan Content Sections", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "const sections = ['intro','background','features','case-study','pricing','conclusion'];\n"
                 "return sections.map(s => ({ json: { section: s } }));"
             )},
             [2100, 0]),
        node("Loop Content Sections", "n8n-nodes-base.splitInBatches", 3,
             {"batchSize": 1, "options": {}},
             [2300, 0]),
        # --- loop body: Claude per section ---
        node("Build Claude Request", "n8n-nodes-base.code", 2,
             {"jsCode": BUILD_PROMPT},
             [2500, 200]),
        http("Claude: Enrich Section", "https://api.anthropic.com/v1/messages", [2700, 200],
             method="POST", body="={{ JSON.stringify($json) }}",
             cred=cred, headers=CLAUDE_HEADERS),
        node("Extract Section Copy", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "return [{ json: {\n"
                 "  section: $('Build Claude Request').item.json.messages[0].content.match(/\"([^\"]+)\"/)[1],\n"
                 "  copy: $json.content?.[0]?.text ?? '',\n"
                 "} }];"
             )},
             [2900, 200]),
        # --- post-loop assembly ---
        node("Assemble Draft Document", "n8n-nodes-base.code", 2,
             {"jsCode": (
                 "const parts = $input.all().map(i => `## ${i.json.section}\\n${i.json.copy}`);\n"
                 "return [{ json: { draft: parts.join('\\n\\n'), sections: parts.length } }];"
             )},
             [2500, -200]),
        node("Build SEO Request", "n8n-nodes-base.code", 2,
             {"jsCode": SEO_PROMPT},
             [2700, -200]),
        http("Claude: Generate SEO Meta", "https://api.anthropic.com/v1/messages", [2900, -200],
             method="POST", body="={{ JSON.stringify($json) }}",
             cred=cred, headers=CLAUDE_HEADERS),
        node("Format Publish Payload", "n8n-nodes-base.set", 3.4,
             {"assignments": {"assignments": [
                 {"id": "f1", "name": "meta_description", "type": "string",
                  "value": "={{ $json.content?.[0]?.text ?? '' }}"},
                 {"id": "f2", "name": "draft", "type": "string",
                  "value": "={{ $('Assemble Draft Document').item.json.draft }}"},
                 {"id": "f3", "name": "status", "type": "string", "value": "ready_for_review"},
             ]}},
             [3100, -200]),
        http("Publish To CMS", "https://httpbin.org/post", [3300, -200],
             method="POST", body="={{ JSON.stringify($json) }}"),
        http("Archive Pipeline Log", "https://httpbin.org/post", [3500, -200],
             method="POST",
             body='={{ JSON.stringify({pipeline: "product-page", published: true}) }}'),
        node("Notify Editorial Team", "n8n-nodes-base.noOp", 1, {}, [3700, -200]),
    ]


conn = lambda *targets: {"main": [
    [{"node": t, "type": "main", "index": 0}] for t in targets
]}

connections = {
    "Pipeline Webhook": conn("Load Pipeline Config"),
    # fan out to 3 branches
    "Load Pipeline Config": {"main": [[
        {"node": "Fetch Source Articles", "type": "main", "index": 0},
        {"node": "Fetch Brand Assets", "type": "main", "index": 0},
        {"node": "Legacy Export API", "type": "main", "index": 0},
    ]]},
    # branch A
    "Fetch Source Articles": conn("Fetch Trend Data"),
    "Fetch Trend Data": conn("Parse Research Notes"),
    "Parse Research Notes": {"main": [[{"node": "Merge Pipeline Inputs", "type": "main", "index": 0}]]},
    # branch B
    "Fetch Brand Assets": conn("Resize Hero Image"),
    "Resize Hero Image": {"main": [[{"node": "Merge Pipeline Inputs", "type": "main", "index": 1}]]},
    # branch C with polling loop
    "Legacy Export API": conn("Transform Legacy Payload"),
    "Transform Legacy Payload": conn("Rate Limit Wait"),
    "Rate Limit Wait": conn("Submit Render Job"),
    "Submit Render Job": conn("Poll Job Status"),
    "Poll Job Status": conn("Check Render Status"),
    "Check Render Status": conn("Job Complete?"),
    "Job Complete?": {"main": [
        [{"node": "Merge Pipeline Inputs", "type": "main", "index": 2}],  # true
        [{"node": "Wait Before Poll", "type": "main", "index": 0}],       # false
    ]},
    "Wait Before Poll": conn("Poll Job Status"),
    # merge -> Claude loop
    "Merge Pipeline Inputs": conn("Plan Content Sections"),
    "Plan Content Sections": conn("Loop Content Sections"),
    "Loop Content Sections": {"main": [
        [{"node": "Assemble Draft Document", "type": "main", "index": 0}],  # done
        [{"node": "Build Claude Request", "type": "main", "index": 0}],      # loop
    ]},
    "Build Claude Request": conn("Claude: Enrich Section"),
    "Claude: Enrich Section": conn("Extract Section Copy"),
    "Extract Section Copy": conn("Loop Content Sections"),
    # post-loop
    "Assemble Draft Document": conn("Build SEO Request"),
    "Build SEO Request": conn("Claude: Generate SEO Meta"),
    "Claude: Generate SEO Meta": conn("Format Publish Payload"),
    "Format Publish Payload": conn("Publish To CMS"),
    "Publish To CMS": conn("Archive Pipeline Log"),
    "Archive Pipeline Log": conn("Notify Editorial Team"),
}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Demo 3: Content Pipeline")
    parser.add_argument("--apply", action="store_true", help="Create the workflow on n8n")
    parser.add_argument("--activate", action="store_true", help="Activate after creation (requires --apply)")
    args = parser.parse_args()

    if args.activate and not args.apply:
        parser.error("--activate requires --apply")

    print(f"Workflow: {WF_NAME}")
    print(f"  Nodes: 28")
    print(f"  Webhook path: /webhook/{WEBHOOK_PATH}")

    if not args.apply:
        print("\nDry run. Pass --apply to create, --activate to also activate.")
        return

    from n8n_api import call
    built_nodes = _build_nodes()
    payload = {
        "name": WF_NAME,
        "nodes": built_nodes,
        "connections": connections,
        "settings": {"executionOrder": "v1", "saveDataSuccessExecution": "all",
                     "saveDataErrorExecution": "all"},
    }
    wf = call("POST", "/workflows", payload)
    print(f"Created: {wf['id']}  ({wf['name']}, {len(wf['nodes'])} nodes)")

    if args.activate:
        call("POST", f"/workflows/{wf['id']}/activate")
        print(f"Activated. Webhook path: /webhook/{WEBHOOK_PATH}")
    else:
        print("Not activated. Pass --activate to activate.")

    return wf


if __name__ == "__main__":
    main()
