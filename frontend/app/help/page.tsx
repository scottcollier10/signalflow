'use client';

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
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t">
          {children}
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            Help & Documentation
          </h1>
          <p className="text-gray-500 mt-1">Learn how to get the most out of SignalFlow</p>
        </div>

        {/* Quick Start */}
        <section className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h2 className="text-xl font-semibold mb-2">Quick Start</h2>
          <p className="text-purple-100 mb-4">Get up and running in 3 simple steps:</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-2xl font-bold">1</div>
              <div className="font-medium">Import</div>
              <div className="text-sm text-purple-100">Upload execution JSON or fetch from n8n</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-2xl font-bold">2</div>
              <div className="font-medium">Analyze</div>
              <div className="text-sm text-purple-100">Review bottlenecks and recommendations</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-2xl font-bold">3</div>
              <div className="font-medium">Optimize</div>
              <div className="text-sm text-purple-100">Export to Claude Code for fixes</div>
            </div>
          </div>
        </section>

        {/* Documentation Sections */}
        <div className="space-y-4">

          <AccordionItem
            title="Importing Executions"
            icon={<Upload className="w-5 h-5 text-blue-500" />}
            defaultOpen={true}
          >
            <div className="space-y-4 text-sm">
              <p>SignalFlow supports three ways to import n8n execution data:</p>

              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="font-medium text-blue-900">Option 1: Fetch from n8n API</div>
                  <ol className="list-decimal list-inside text-blue-800 mt-2 space-y-1">
                    <li>Enter your n8n instance URL</li>
                    <li>Enter the Execution ID (from n8n URL)</li>
                    <li>Enter your API key (n8n → Settings → API)</li>
                    <li>Click &quot;Import Execution&quot;</li>
                  </ol>
                </div>

                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="font-medium">Option 2: Upload JSON File</div>
                  <ol className="list-decimal list-inside text-gray-600 mt-2 space-y-1">
                    <li>In n8n, go to Executions</li>
                    <li>Click on an execution → Export</li>
                    <li>In SignalFlow, drag and drop the file</li>
                  </ol>
                </div>

                <div className="bg-gray-50 border rounded-lg p-3">
                  <div className="font-medium">Option 3: Paste JSON</div>
                  <ol className="list-decimal list-inside text-gray-600 mt-2 space-y-1">
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
            icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          >
            <div className="space-y-4 text-sm">
              <p>Each bottleneck is scored on a 0-100 scale based on four factors:</p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-left">Factor</th>
                      <th className="border p-2 text-left">Weight</th>
                      <th className="border p-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2 font-medium">Duration</td>
                      <td className="border p-2">40 points</td>
                      <td className="border p-2">Time taken relative to total workflow</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-medium">Position</td>
                      <td className="border p-2">30 points</td>
                      <td className="border p-2">Impact on critical path (max if on critical path)</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-medium">Frequency</td>
                      <td className="border p-2">20 points</td>
                      <td className="border p-2">How consistently the node is slow</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-medium">Variance</td>
                      <td className="border p-2">10 points</td>
                      <td className="border p-2">Performance predictability</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Severe: 90-100</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">High: 70-89</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Medium: 50-69</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Low: 0-49</span>
                </div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Critical Path Analysis"
            icon={<Zap className="w-5 h-5 text-yellow-500" />}
          >
            <div className="space-y-4 text-sm">
              <p>The <strong>critical path</strong> is the longest sequence of dependent nodes that determines your workflow&apos;s total execution time.</p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="font-medium text-yellow-900 mb-2">Why It Matters</div>
                <ul className="list-disc list-inside text-yellow-800 space-y-1">
                  <li>Nodes ON the critical path directly impact total time</li>
                  <li>Optimizing critical path nodes = faster workflow</li>
                  <li>Nodes OFF the critical path have &quot;slack time&quot;</li>
                </ul>
              </div>

              <p>In the Playback view, critical path nodes are highlighted, and the Critical Path tab shows the full sequence with timing breakdown.</p>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Using Guided Fix"
            icon={<Target className="w-5 h-5 text-purple-500" />}
          >
            <div className="space-y-4 text-sm">
              <p>Guided Fix lets you click on any node in the Playback view to see its bottleneck details and get targeted optimization help.</p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <div className="font-medium">Go to Playback tab</div>
                    <div className="text-gray-600">Bottleneck nodes are highlighted by severity (red = severe)</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <div className="font-medium">Click a highlighted node</div>
                    <div className="text-gray-600">A panel opens showing score breakdown and recommendations</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <div className="font-medium">Click &quot;Copy Fix Prompt&quot;</div>
                    <div className="text-gray-600">Generates a targeted prompt for Claude Code</div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem
            title="Exporting to Claude Code"
            icon={<Code className="w-5 h-5 text-green-500" />}
          >
            <div className="space-y-4 text-sm">
              <p>SignalFlow can generate optimization prompts for Claude Code to help you implement fixes.</p>

              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="font-medium text-green-900">Workflow-Wide Export</div>
                  <ol className="list-decimal list-inside text-green-800 mt-2 space-y-1">
                    <li>Go to Recommendations tab</li>
                    <li>Click &quot;Export&quot; button</li>
                    <li>Choose &quot;Copy Prompt&quot; or download</li>
                    <li>Optionally download Workflow JSON</li>
                    <li>Paste into Claude Code</li>
                  </ol>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="font-medium text-purple-900">Node-Specific Export</div>
                  <ol className="list-decimal list-inside text-purple-800 mt-2 space-y-1">
                    <li>Go to Playback tab</li>
                    <li>Click on a bottleneck node</li>
                    <li>Click &quot;Copy Fix Prompt for Claude Code&quot;</li>
                    <li>Paste into Claude Code for targeted help</li>
                  </ol>
                </div>
              </div>

              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="font-medium">What&apos;s Included in Prompts:</div>
                <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
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
            icon={<Lightbulb className="w-5 h-5 text-amber-500" />}
          >
            <div className="space-y-4 text-sm">
              <p>Recommendations are grouped into three categories:</p>

              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 font-medium">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Performance
                  </div>
                  <p className="text-gray-600 mt-1">Speed improvements and latency reduction</p>
                  <ul className="list-disc list-inside text-gray-500 mt-2 text-xs">
                    <li>Parallelize sequential operations</li>
                    <li>Optimize slow nodes</li>
                    <li>Reduce data payload sizes</li>
                    <li>Add caching</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Reliability
                  </div>
                  <p className="text-gray-600 mt-1">Error handling and fault tolerance</p>
                  <ul className="list-disc list-inside text-gray-500 mt-2 text-xs">
                    <li>Add retry logic</li>
                    <li>Implement error handling</li>
                    <li>Set timeouts</li>
                    <li>Add fallback paths</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-green-500" />
                    Cost Optimization
                  </div>
                  <p className="text-gray-600 mt-1">Resource efficiency improvements</p>
                  <ul className="list-disc list-inside text-gray-500 mt-2 text-xs">
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
            icon={<Keyboard className="w-5 h-5 text-gray-500" />}
          >
            <div className="space-y-4 text-sm">
              <p>Navigate SignalFlow faster with keyboard shortcuts:</p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-left">Shortcut</th>
                      <th className="border p-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2"><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">G</kbd> then <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">D</kbd></td>
                      <td className="border p-2">Go to Dashboard</td>
                    </tr>
                    <tr>
                      <td className="border p-2"><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">G</kbd> then <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">I</kbd></td>
                      <td className="border p-2">Go to Import</td>
                    </tr>
                    <tr>
                      <td className="border p-2"><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">G</kbd> then <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">S</kbd></td>
                      <td className="border p-2">Go to Settings</td>
                    </tr>
                    <tr>
                      <td className="border p-2"><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">?</kbd></td>
                      <td className="border p-2">Show this help</td>
                    </tr>
                    <tr>
                      <td className="border p-2"><kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd></td>
                      <td className="border p-2">Close panels/modals</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-gray-500 text-xs">Note: Keyboard shortcuts are coming in a future update.</p>
            </div>
          </AccordionItem>

          <AccordionItem
            title="FAQ"
            icon={<BookOpen className="w-5 h-5 text-indigo-500" />}
          >
            <div className="space-y-4 text-sm">
              <div className="space-y-4">
                <div>
                  <div className="font-medium">How is this different from n8n&apos;s built-in execution view?</div>
                  <p className="text-gray-600 mt-1">SignalFlow provides deeper analysis including bottleneck scoring, error clustering, and actionable recommendations. It helps you understand <em>why</em> workflows are slow, not just <em>what</em> happened.</p>
                </div>

                <div>
                  <div className="font-medium">Does SignalFlow modify my n8n workflows?</div>
                  <p className="text-gray-600 mt-1">No. SignalFlow is read-only. It analyzes execution data but never changes your workflows. The Claude Code export helps you make changes yourself.</p>
                </div>

                <div>
                  <div className="font-medium">How accurate are the bottleneck scores?</div>
                  <p className="text-gray-600 mt-1">Scores are calculated deterministically based on actual execution timing data. They reflect real performance impact, not estimates.</p>
                </div>

                <div>
                  <div className="font-medium">Can I analyze multiple executions of the same workflow?</div>
                  <p className="text-gray-600 mt-1">Yes! Import multiple executions to see patterns over time. The Dashboard groups them by workflow automatically.</p>
                </div>

                <div>
                  <div className="font-medium">What if I have no recommendations?</div>
                  <p className="text-gray-600 mt-1">That&apos;s good news! It means your workflow is running efficiently with no detected issues.</p>
                </div>

                <div>
                  <div className="font-medium">Is my data secure?</div>
                  <p className="text-gray-600 mt-1">All data is stored locally in your browser and your connected database. When exporting workflow JSON, credentials are automatically redacted.</p>
                </div>
              </div>
            </div>
          </AccordionItem>

        </div>

        {/* External Links */}
        <section className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold mb-4">Additional Resources</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://docs.n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white border rounded-lg hover:border-purple-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
              <span>n8n Documentation</span>
            </a>
            <a
              href="https://community.n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white border rounded-lg hover:border-purple-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
              <span>n8n Community</span>
            </a>
          </div>
        </section>

        {/* Version Info */}
        <div className="text-center text-sm text-gray-400 py-4">
          SignalFlow v0.8 • Week 5 Build
        </div>
      </div>
    </AppLayout>
  );
}
