# SignalFlow User Guide

**AI-powered workflow intelligence for n8n**

SignalFlow analyzes your n8n workflow executions to identify bottlenecks, detect errors, and provide actionable optimization recommendations.

---

## 🚀 Quick Start

### 1. Import an Execution

**Option A: Fetch directly from n8n**
1. Go to **Import** in the sidebar
2. Select "Fetch from n8n" tab
3. Enter your n8n instance URL (e.g., `https://your-instance.app.n8n.cloud`)
4. Enter the Execution ID (found in the n8n execution URL)
5. Enter your n8n API key (Settings → API in n8n)
6. Click "Import Execution"

**Option B: Upload JSON file**
1. In n8n, go to Executions → click an execution → Export
2. In SignalFlow, go to **Import** → "Upload File"
3. Drag and drop or select your JSON file

**Option C: Paste JSON**
1. Copy execution JSON from n8n
2. In SignalFlow, go to **Import** → "Paste JSON"
3. Paste and click Import

### 2. View Your Dashboard

After importing, visit the **Dashboard** to see all your executions organized by workflow.

### 3. Analyze an Execution

Click "View Analysis" on any execution to see:
- **Overview** - Executive summary with key metrics
- **Playback** - Visual replay of execution flow
- **Critical Path** - The sequence determining total duration
- **Bottlenecks** - Nodes slowing down your workflow
- **Errors** - Clustered error patterns
- **Recommendations** - Actionable optimization suggestions

---

## 📊 Understanding Your Analysis

### Bottleneck Scores (0-100)

Each bottleneck is scored based on four factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Duration | 40 pts | Time taken relative to workflow total |
| Criticality | 30 pts | Impact on critical path |
| Frequency | 20 pts | How consistently it's slow |
| Variance | 10 pts | Performance predictability |

### Severity Levels

| Severity | Score Range | Action |
|----------|-------------|--------|
| 🔴 Severe | 90-100 | Immediate optimization needed |
| 🟠 High | 70-89 | Should optimize soon |
| 🟡 Medium | 50-69 | Consider optimization |
| ⚪ Low | 0-49 | Monitor, not urgent |

### Recommendation Categories

- **Performance** - Speed improvements and latency reduction
- **Reliability** - Error handling, retries, fault tolerance
- **Cost** - Resource optimization and efficiency

---

## 🤖 Optimize with Claude Code

SignalFlow can generate a prompt to help you implement fixes using Claude Code.

### How to Use:

1. Go to the **Recommendations** tab
2. Click the **Export** button (top right)
3. Choose **"Copy Prompt"** or click the download icon
4. Open Claude Code (or Claude.ai with computer use)
5. Paste the prompt
6. Optionally attach your workflow JSON for specific code changes

### What's Included:

- Workflow context (name, duration, node counts)
- Top bottlenecks with scores and timing
- All recommendations grouped by category
- Implementation guidelines
- Safety instructions (preserves your business logic)

---

## 🔍 Key Features

### Dashboard
- View all imported executions
- Group by workflow or date
- Filter by status (success/failed)
- Quick access to analysis
- Delete old executions

### Execution Playback
- Visual workflow graph
- Step-by-step execution replay
- Node timing visualization
- Critical path highlighting

### Bottleneck Analysis
- Severity-based tabs (Severe/High/Medium/Low)
- Score breakdowns
- Critical path indicators
- Duration comparisons

### Error Clustering
- Groups similar errors together
- Pattern detection (timeout, auth, rate limit, etc.)
- Affected node identification
- Sample error messages

### Smart Recommendations
- 40+ detection rules
- Priority scoring
- Estimated time savings
- Specific node targeting

---

## ⚙️ Settings (Coming Soon)

- **n8n Connection** - Save your instance URL and API key
- **Preferences** - Default views and display options
- **Export Settings** - Report format preferences
- **Notifications** - Alerts for workflow issues

---

## ❓ FAQ

**Q: How is this different from n8n's built-in execution view?**
A: SignalFlow provides deeper analysis including bottleneck scoring, error clustering, and actionable recommendations. It helps you understand *why* workflows are slow, not just *what* happened.

**Q: Does SignalFlow modify my n8n workflows?**
A: No. SignalFlow is read-only. It analyzes execution data but never changes your workflows. The Claude Code export helps you make changes yourself.

**Q: How accurate are the bottleneck scores?**
A: Scores are calculated deterministically based on actual execution timing data. They reflect real performance impact, not estimates.

**Q: Can I analyze multiple executions of the same workflow?**
A: Yes! Import multiple executions to see patterns over time. The Dashboard groups them by workflow automatically.

**Q: What if I have no recommendations?**
A: That's good news! It means your workflow is running efficiently with no detected issues.

---

## 🆘 Need Help?

- **Documentation** - Visit the Help page in SignalFlow
- **Issues** - Report bugs on GitHub
- **Feature Requests** - Open a discussion on GitHub

---

## 📋 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` then `D` | Go to Dashboard |
| `G` then `I` | Go to Import |
| `?` | Show keyboard shortcuts |

---

**Happy optimizing!** 🚀