'use client';

/**
 * Help & Documentation Page
 * Learn how to use SignalFlow
 * With neumorphic design
 */

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import {
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Upload,
  Zap,
  AlertTriangle,
  Lightbulb,
  Code,
  Keyboard,
  ExternalLink,
  BookOpen,
  Target,
  Clock,
  TrendingUp
} from 'lucide-react';

interface AccordionItemProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, icon, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="neu-raised overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-neu-shadow-light/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-neu-text">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-neu-text-muted" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neu-text-muted" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-neu-shadow-light/20">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-neu-text flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            Help & Documentation
          </h1>
          <p className="text-neu-text-muted mt-1 font-body">Learn how to get the most out of SignalFlow</p>
        </div>

        {/* Quick Start */}
        <section className="neu-raised p-6 border-l-4 border-neu-accent">
          <h2 className="font-display text-xl font-semibold text-neu-text mb-2">Quick Start</h2>
          <p className="text-neu-text-muted mb-4">Get up and running in 3 simple steps:</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="neu-inset rounded-lg p-4">
              <div className="text-2xl font-display font-bold text-neu-accent">1</div>
              <div className="font-medium text-neu-text">Import</div>
              <div className="text-sm text-neu-text-muted">Upload execution JSON or fetch from n8n</div>
            </div>
            <div className="neu-inset rounded-lg p-4">
              <div className="text-2xl font-display font-bold text-neu-accent">2</div>
              <div className="font-medium text-neu-text">Analyze</div>
              <div className="text-sm text-neu-text-muted">Review bottlenecks and recommendations</div>
            </div>
            <div className="neu-inset rounded-lg p-4">
              <div className="text-2xl font-display font-bold text-neu-accent">3</div>
              <div className="font-medium text-neu-text">Optimize</div>
              <div className="text-sm text-neu-text-muted">Export to Claude Code for fixes</div>
            </div>
          </div>
        </section>

        {/* Documentation Sections */}
        <div className="space-y-4">

          <AccordionItem
            title="Importing Executions"
            icon={<Upload className="w-5 h-5 text-neu-accent" />}
            defaultOpen={true}
          >
            <div className="space-y-4 text-sm">
              <p className="text-neu-text">SignalFlow supports three ways to import n8n execution data:</p>

              <div className="space-y-3">
                <div className="neu-inset p-3 border-l-4 border-neu-accent">
                  <div className="font-medium text-neu-text">Option 1: Fetch from n8n API</div>
                  <ol className="list-decimal list-inside text-neu-text-muted mt-2 space-y-1">
                    <li>Enter your n8n instance URL</li>
                    <li>Enter the Execution ID (from n8n URL)</li>
                    <li>Enter your API key (n8n → Settings → API)</li>
                    <li>Click &quot;Import Execution&quot;</li>
                  </ol>
                </div>

                <div className="neu-inset p-3">
                  <div className="font-medium text-neu-text">Option 2: Upload JSON File</div>
                  <ol className="list-decimal list-inside text-neu-text-muted mt-2 space-y-1">
                    <li>In n8n, go to Executions</li>
                    <li>Click on an execution → Export</li>
                    <li>In SignalFlow, drag and drop the file</li>
                  </ol>
                </div>

                <div className="neu-inset p-3">
                  <div className="font-medium text-neu-text">Option 3: Paste JSON</div>
                  <ol className="list-decimal list-inside text-neu-text-muted mt-2 space-y-1">
                    <li>Copy execution JSON from n8n</li>
                    <li>Go to Import → Paste JSON tab</li>
                    <li>Paste and click Import</li>
                  </ol>
                </div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Understanding Bottleneck Scores"
            icon={<AlertTriangle className="w-5 h-5 text-neu-orange" />}
          >
            <div className="space-y-4 text-sm">
              <p className="text-neu-text">Each bottleneck is scored on a 0-100 scale based on four factors:</p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-neu-shadow-dark/30">
                      <th className="border border-neu-shadow-light/30 p-2 text-left text-neu-text">Factor</th>
                      <th className="border border-neu-shadow-light/30 p-2 text-left text-neu-text">Weight</th>
                      <th className="border border-neu-shadow-light/30 p-2 text-left text-neu-text">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2 font-medium text-neu-text">Duration</td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">40 points</td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">Time taken relative to total workflow</td>
                    </tr>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2 font-medium text-neu-text">Position</td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">30 points</td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">Impact on critical path (max if on critical path)</td>
                    </tr>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2 font-medium text-neu-text">Frequency</td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">20 points</td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">How consistently the node is slow</td>
                    </tr>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2 font-medium text-neu-text">Variance</td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">10 points</td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">Performance predictability</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div className="flex items-center gap-2 p-2 neu-inset rounded border-l-4 border-neu-coral">
                  <div className="w-3 h-3 bg-neu-coral rounded-full"></div>
                  <span className="text-sm text-neu-text">Severe: 90-100</span>
                </div>
                <div className="flex items-center gap-2 p-2 neu-inset rounded border-l-4 border-neu-orange">
                  <div className="w-3 h-3 bg-neu-orange rounded-full"></div>
                  <span className="text-sm text-neu-text">High: 70-89</span>
                </div>
                <div className="flex items-center gap-2 p-2 neu-inset rounded border-l-4 border-neu-yellow">
                  <div className="w-3 h-3 bg-neu-yellow rounded-full"></div>
                  <span className="text-sm text-neu-text">Medium: 50-69</span>
                </div>
                <div className="flex items-center gap-2 p-2 neu-inset rounded border-l-4 border-neu-text-muted">
                  <div className="w-3 h-3 bg-neu-text-muted rounded-full"></div>
                  <span className="text-sm text-neu-text">Low: 0-49</span>
                </div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Critical Path Analysis"
            icon={<Zap className="w-5 h-5 text-neu-yellow" />}
          >
            <div className="space-y-4 text-sm">
              <p className="text-neu-text">The <strong>critical path</strong> is the longest sequence of dependent nodes that determines your workflow&apos;s total execution time.</p>

              <div className="neu-inset p-4 border-l-4 border-neu-yellow">
                <div className="font-medium text-neu-yellow mb-2">Why It Matters</div>
                <ul className="list-disc list-inside text-neu-text-muted space-y-1">
                  <li>Nodes ON the critical path directly impact total time</li>
                  <li>Optimizing critical path nodes = faster workflow</li>
                  <li>Nodes OFF the critical path have &quot;slack time&quot;</li>
                </ul>
              </div>

              <p className="text-neu-text-muted">In the Playback view, critical path nodes are highlighted, and the Critical Path tab shows the full sequence with timing breakdown.</p>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Using Guided Fix"
            icon={<Target className="w-5 h-5 text-neu-accent" />}
          >
            <div className="space-y-4 text-sm">
              <p className="text-neu-text">Guided Fix lets you click on any node in the Playback view to see its bottleneck details and get targeted optimization help.</p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-neu-accent/20 text-neu-accent flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <div className="font-medium text-neu-text">Go to Playback tab</div>
                    <div className="text-neu-text-muted">Bottleneck nodes are highlighted by severity (red = severe)</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-neu-accent/20 text-neu-accent flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <div className="font-medium text-neu-text">Click a highlighted node</div>
                    <div className="text-neu-text-muted">A panel opens showing score breakdown and recommendations</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-neu-accent/20 text-neu-accent flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <div className="font-medium text-neu-text">Click &quot;Copy Fix Prompt&quot;</div>
                    <div className="text-neu-text-muted">Generates a targeted prompt for Claude Code</div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Exporting to Claude Code"
            icon={<Code className="w-5 h-5 text-neu-green" />}
          >
            <div className="space-y-4 text-sm">
              <p className="text-neu-text">SignalFlow can generate optimization prompts for Claude Code to help you implement fixes.</p>

              <div className="space-y-3">
                <div className="neu-inset p-3 border-l-4 border-neu-green">
                  <div className="font-medium text-neu-green">Workflow-Wide Export</div>
                  <ol className="list-decimal list-inside text-neu-text-muted mt-2 space-y-1">
                    <li>Go to Recommendations tab</li>
                    <li>Click &quot;Export&quot; button</li>
                    <li>Choose &quot;Copy Prompt&quot; or download</li>
                    <li>Optionally download Workflow JSON</li>
                    <li>Paste into Claude Code</li>
                  </ol>
                </div>

                <div className="neu-inset p-3 border-l-4 border-neu-accent">
                  <div className="font-medium text-neu-accent">Node-Specific Export</div>
                  <ol className="list-decimal list-inside text-neu-text-muted mt-2 space-y-1">
                    <li>Go to Playback tab</li>
                    <li>Click on a bottleneck node</li>
                    <li>Click &quot;Copy Fix Prompt for Claude Code&quot;</li>
                    <li>Paste into Claude Code for targeted help</li>
                  </ol>
                </div>
              </div>

              <div className="neu-inset p-3">
                <div className="font-medium text-neu-text">What&apos;s Included in Prompts:</div>
                <ul className="list-disc list-inside text-neu-text-muted mt-2 space-y-1">
                  <li>Workflow context (name, duration, node counts)</li>
                  <li>Bottleneck details with score breakdowns</li>
                  <li>Specific recommendations</li>
                  <li>Safety instructions (preserve business logic)</li>
                </ul>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Recommendation Categories"
            icon={<Lightbulb className="w-5 h-5 text-neu-yellow" />}
          >
            <div className="space-y-4 text-sm">
              <p className="text-neu-text">Recommendations are grouped into three categories:</p>

              <div className="space-y-3">
                <div className="neu-inset p-3 border-l-4 border-neu-teal">
                  <div className="flex items-center gap-2 font-medium text-neu-teal">
                    <TrendingUp className="w-4 h-4" />
                    Performance
                  </div>
                  <p className="text-neu-text-muted mt-1">Speed improvements and latency reduction</p>
                  <ul className="list-disc list-inside text-neu-text-muted/70 mt-2 text-xs">
                    <li>Parallelize sequential operations</li>
                    <li>Optimize slow nodes</li>
                    <li>Reduce data payload sizes</li>
                    <li>Add caching</li>
                  </ul>
                </div>

                <div className="neu-inset p-3 border-l-4 border-neu-orange">
                  <div className="flex items-center gap-2 font-medium text-neu-orange">
                    <AlertTriangle className="w-4 h-4" />
                    Reliability
                  </div>
                  <p className="text-neu-text-muted mt-1">Error handling and fault tolerance</p>
                  <ul className="list-disc list-inside text-neu-text-muted/70 mt-2 text-xs">
                    <li>Add retry logic</li>
                    <li>Implement error handling</li>
                    <li>Set timeouts</li>
                    <li>Add fallback paths</li>
                  </ul>
                </div>

                <div className="neu-inset p-3 border-l-4 border-neu-green">
                  <div className="flex items-center gap-2 font-medium text-neu-green">
                    <Clock className="w-4 h-4" />
                    Cost Optimization
                  </div>
                  <p className="text-neu-text-muted mt-1">Resource efficiency improvements</p>
                  <ul className="list-disc list-inside text-neu-text-muted/70 mt-2 text-xs">
                    <li>Reduce API calls</li>
                    <li>Batch operations</li>
                    <li>Optimize data storage</li>
                  </ul>
                </div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Keyboard Shortcuts"
            icon={<Keyboard className="w-5 h-5 text-neu-text-muted" />}
          >
            <div className="space-y-4 text-sm">
              <p className="text-neu-text">Navigate SignalFlow faster with keyboard shortcuts:</p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-neu-shadow-dark/30">
                      <th className="border border-neu-shadow-light/30 p-2 text-left text-neu-text">Shortcut</th>
                      <th className="border border-neu-shadow-light/30 p-2 text-left text-neu-text">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2">
                        <kbd className="px-2 py-1 bg-neu-shadow-dark/50 text-neu-text rounded text-xs">G</kbd>
                        {' then '}
                        <kbd className="px-2 py-1 bg-neu-shadow-dark/50 text-neu-text rounded text-xs">D</kbd>
                      </td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">Go to Dashboard</td>
                    </tr>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2">
                        <kbd className="px-2 py-1 bg-neu-shadow-dark/50 text-neu-text rounded text-xs">G</kbd>
                        {' then '}
                        <kbd className="px-2 py-1 bg-neu-shadow-dark/50 text-neu-text rounded text-xs">I</kbd>
                      </td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">Go to Import</td>
                    </tr>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2">
                        <kbd className="px-2 py-1 bg-neu-shadow-dark/50 text-neu-text rounded text-xs">G</kbd>
                        {' then '}
                        <kbd className="px-2 py-1 bg-neu-shadow-dark/50 text-neu-text rounded text-xs">S</kbd>
                      </td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">Go to Settings</td>
                    </tr>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2">
                        <kbd className="px-2 py-1 bg-neu-shadow-dark/50 text-neu-text rounded text-xs">?</kbd>
                      </td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">Show this help</td>
                    </tr>
                    <tr>
                      <td className="border border-neu-shadow-light/30 p-2">
                        <kbd className="px-2 py-1 bg-neu-shadow-dark/50 text-neu-text rounded text-xs">Esc</kbd>
                      </td>
                      <td className="border border-neu-shadow-light/30 p-2 text-neu-text-muted">Close panels/modals</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-neu-text-muted text-xs">Note: Keyboard shortcuts are coming in a future update.</p>
            </div>
          </AccordionItem>

          <AccordionItem
            title="FAQ"
            icon={<BookOpen className="w-5 h-5 text-neu-accent" />}
          >
            <div className="space-y-4 text-sm">
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-neu-text">How is this different from n8n&apos;s built-in execution view?</div>
                  <p className="text-neu-text-muted mt-1">SignalFlow provides deeper analysis including bottleneck scoring, error clustering, and actionable recommendations. It helps you understand <em>why</em> workflows are slow, not just <em>what</em> happened.</p>
                </div>

                <div>
                  <div className="font-medium text-neu-text">Does SignalFlow modify my n8n workflows?</div>
                  <p className="text-neu-text-muted mt-1">No. SignalFlow is read-only. It analyzes execution data but never changes your workflows. The Claude Code export helps you make changes yourself.</p>
                </div>

                <div>
                  <div className="font-medium text-neu-text">How accurate are the bottleneck scores?</div>
                  <p className="text-neu-text-muted mt-1">Scores are calculated deterministically based on actual execution timing data. They reflect real performance impact, not estimates.</p>
                </div>

                <div>
                  <div className="font-medium text-neu-text">Can I analyze multiple executions of the same workflow?</div>
                  <p className="text-neu-text-muted mt-1">Yes! Import multiple executions to see patterns over time. The Dashboard groups them by workflow automatically.</p>
                </div>

                <div>
                  <div className="font-medium text-neu-text">What if I have no recommendations?</div>
                  <p className="text-neu-text-muted mt-1">That&apos;s good news! It means your workflow is running efficiently with no detected issues.</p>
                </div>

                <div>
                  <div className="font-medium text-neu-text">Is my data secure?</div>
                  <p className="text-neu-text-muted mt-1">All data is stored locally in your browser and your connected database. When exporting workflow JSON, credentials are automatically redacted.</p>
                </div>
              </div>
            </div>
          </AccordionItem>

        </div>

        {/* External Links */}
        <section className="neu-flat p-6">
          <h3 className="font-semibold text-neu-text mb-4">Additional Resources</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://docs.n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 neu-raised rounded-lg hover:bg-neu-shadow-light/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-neu-text-muted" />
              <span className="text-neu-text">n8n Documentation</span>
            </a>
            <a
              href="https://community.n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 neu-raised rounded-lg hover:bg-neu-shadow-light/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-neu-text-muted" />
              <span className="text-neu-text">n8n Community</span>
            </a>
          </div>
        </section>

        {/* Version Info */}
        <div className="text-center text-sm text-neu-text-muted py-4">
          SignalFlow v0.8 • Week 5 Build
        </div>
      </div>
    </AppLayout>
  );
}
