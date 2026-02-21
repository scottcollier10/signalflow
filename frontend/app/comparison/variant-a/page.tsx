import { comparisonData, formatDuration, formatPct } from '../data';

export default function VariantA() {
  const { before, after, delta, top_improvements } = comparisonData;

  return (
    <div className="space-y-8">
      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* BEFORE Card */}
        <div className="neu-flat p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="badge-error">Before</span>
            <span className="text-neu-text-muted text-sm">#{before.execution_id}</span>
          </div>

          {/* Big Duration */}
          <div className="mb-6">
            <p className="text-6xl font-display font-bold text-neu-coral">
              {formatDuration(before.duration)}
            </p>
            <p className="text-neu-text-muted mt-1">Total Duration</p>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neu-text-muted">Bottlenecks</span>
              <span className="text-neu-coral font-semibold">
                {before.bottlenecks.total}
                <span className="text-sm ml-1">({before.bottlenecks.severe} severe)</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neu-text-muted">Recommendations</span>
              <span className="text-neu-orange font-semibold">{before.recommendations}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neu-text-muted">Nodes</span>
              <span className="text-neu-text">{before.node_count}</span>
            </div>
          </div>
        </div>

        {/* AFTER Card */}
        <div className="neu-flat p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="badge-success">After</span>
            <span className="text-neu-text-muted text-sm">#{after.execution_id}</span>
          </div>

          {/* Big Duration */}
          <div className="mb-6">
            <p className="text-6xl font-display font-bold text-neu-green">
              {formatDuration(after.duration)}
            </p>
            <p className="text-neu-text-muted mt-1">Total Duration</p>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neu-text-muted">Bottlenecks</span>
              <span className="text-neu-green font-semibold flex items-center gap-1">
                {after.bottlenecks.total}
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neu-text-muted">Recommendations</span>
              <span className="text-neu-green font-semibold flex items-center gap-1">
                {after.recommendations}
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neu-text-muted">Nodes</span>
              <span className="text-neu-text">{after.node_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delta Card */}
      <div className="card-neu bg-gradient-to-r from-neu-green/10 to-neu-teal/10 border border-neu-green/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-4xl font-display font-bold text-neu-green">
                ⬇️ {formatPct(delta.pct_improvement)}
              </p>
              <p className="text-neu-text-muted">Improvement</p>
            </div>
            <div className="h-12 w-px bg-neu-text-muted/20" />
            <div>
              <p className="text-2xl font-display font-semibold text-neu-green">
                {formatDuration(delta.duration_saved)}
              </p>
              <p className="text-neu-text-muted">Saved</p>
            </div>
            <div className="h-12 w-px bg-neu-text-muted/20" />
            <div>
              <p className="text-2xl font-display font-semibold text-neu-green">
                ✅ {delta.bottlenecks_resolved}
              </p>
              <p className="text-neu-text-muted">Bottlenecks Resolved</p>
            </div>
          </div>
          <div className="badge-success text-base px-4 py-2">
            {delta.verdict}
          </div>
        </div>
      </div>

      {/* Top Improvements */}
      <div>
        <h2 className="font-display text-xl font-semibold text-neu-text mb-4">
          Top Node Improvements
        </h2>
        <div className="space-y-3">
          {top_improvements.map((node) => (
            <div key={node.node_name} className="neu-flat p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-neu-text">{node.node_name}</span>
                <span className="text-neu-green font-semibold">
                  -{formatPct(node.pct_improvement)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-neu-coral">{formatDuration(node.before_duration)}</span>
                <span className="text-neu-text-muted">→</span>
                <span className="text-neu-green">{formatDuration(node.after_duration)}</span>
                <span className="text-neu-text-muted">•</span>
                <span className="text-neu-text-muted">{node.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
