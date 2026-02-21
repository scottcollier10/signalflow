import { comparisonData, formatDuration, formatPct } from '../data';

export default function VariantB() {
  const { before, after, delta, top_improvements } = comparisonData;

  // Calculate bar widths (before is 100%, after is proportional)
  const afterWidth = (after.duration / before.duration) * 100;

  return (
    <div className="space-y-8">
      {/* Hero Metrics */}
      <div className="neu-flat p-6">
        <div className="flex items-center justify-center gap-12">
          <div className="text-center">
            <p className="text-5xl font-display font-bold text-neu-green">
              ⬇️ {formatPct(delta.pct_improvement)}
            </p>
            <p className="text-neu-text-muted mt-1">Faster</p>
          </div>
          <div className="h-16 w-px bg-neu-text-muted/20" />
          <div className="text-center">
            <p className="text-4xl font-display font-bold text-neu-green">
              {formatDuration(delta.duration_saved)}
            </p>
            <p className="text-neu-text-muted mt-1">Saved</p>
          </div>
          <div className="h-16 w-px bg-neu-text-muted/20" />
          <div className="text-center">
            <p className="text-4xl font-display font-bold text-neu-green">
              ✅ {delta.bottlenecks_resolved}
            </p>
            <p className="text-neu-text-muted mt-1">Resolved</p>
          </div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="neu-flat p-6">
        <h2 className="font-display text-lg font-semibold text-neu-text mb-6">
          Duration Comparison
        </h2>

        <div className="space-y-6">
          {/* Before Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-neu-text-muted text-sm">Before (#{before.execution_id})</span>
              <span className="text-neu-coral font-semibold">{formatDuration(before.duration)}</span>
            </div>
            <div className="h-12 rounded-lg overflow-hidden bg-neu-bg">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-4"
                style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #f08b7a 0%, #f0956a 100%)',
                }}
              >
                <span className="text-neu-bg font-semibold text-sm">
                  {before.bottlenecks.total} bottlenecks
                </span>
              </div>
            </div>
          </div>

          {/* After Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-neu-text-muted text-sm">After (#{after.execution_id})</span>
              <span className="text-neu-green font-semibold">{formatDuration(after.duration)}</span>
            </div>
            <div className="h-12 rounded-lg overflow-hidden bg-neu-bg">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-4"
                style={{
                  width: `${afterWidth}%`,
                  background: 'linear-gradient(90deg, #4dc9b0 0%, #5ed4a0 100%)',
                }}
              >
                <span className="text-neu-bg font-semibold text-sm">✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scale Reference */}
        <div className="flex justify-between mt-4 text-xs text-neu-text-muted">
          <span>0s</span>
          <span>5s</span>
          <span>10s</span>
          <span>15s</span>
        </div>
      </div>

      {/* Critical Path Comparison */}
      <div className="neu-flat p-6">
        <h2 className="font-display text-lg font-semibold text-neu-text mb-4">
          Critical Path
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 rounded-lg bg-neu-coral/10 border border-neu-coral/20">
            <p className="text-neu-coral text-2xl font-bold">{formatDuration(before.critical_path.duration)}</p>
            <p className="text-neu-text-muted text-sm">{before.critical_path.nodes} nodes • {before.critical_path.coverage}% coverage</p>
          </div>
          <div className="p-4 rounded-lg bg-neu-green/10 border border-neu-green/20">
            <p className="text-neu-green text-2xl font-bold">{formatDuration(after.critical_path.duration)}</p>
            <p className="text-neu-text-muted text-sm">{after.critical_path.nodes} nodes • {after.critical_path.coverage}% coverage</p>
          </div>
        </div>
      </div>

      {/* Node Breakdown Table */}
      <div className="neu-flat p-6">
        <h2 className="font-display text-lg font-semibold text-neu-text mb-4">
          Node Breakdown
        </h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-neu-text-muted text-sm border-b border-neu-text-muted/20">
              <th className="pb-3">Node</th>
              <th className="pb-3 text-right">Before</th>
              <th className="pb-3 text-right">After</th>
              <th className="pb-3 text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {top_improvements.map((node) => (
              <tr key={node.node_name} className="border-b border-neu-text-muted/10">
                <td className="py-3 font-mono text-sm text-neu-text">{node.node_name}</td>
                <td className="py-3 text-right text-neu-coral">{formatDuration(node.before_duration)}</td>
                <td className="py-3 text-right text-neu-green">{formatDuration(node.after_duration)}</td>
                <td className="py-3 text-right">
                  <span className="text-neu-green font-semibold">-{formatPct(node.pct_improvement)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
