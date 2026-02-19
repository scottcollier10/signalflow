export default function DesignSystemTest() {
  return (
    <div className="min-h-screen bg-neu-bg p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Typography Test */}
        <section className="neu-raised p-6">
          <h1 className="font-display text-4xl font-bold text-neu-text mb-4">
            Neumorphic Design System
          </h1>
          <p className="font-body text-neu-text-muted">
            Testing design tokens and component utilities
          </p>
        </section>

        {/* Button Test */}
        <section className="neu-raised p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Buttons
          </h2>
          <div className="flex gap-4">
            <button className="btn-primary">Primary Button</button>
            <button className="btn-secondary">Secondary Button</button>
            <button className="btn-tertiary">Tertiary Button</button>
            <button className="btn-icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </section>

        {/* Badge Test */}
        <section className="neu-raised p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Badges
          </h2>
          <div className="flex gap-3">
            <span className="badge-success">Success</span>
            <span className="badge-warning">Warning</span>
            <span className="badge-error">Error</span>
            <span className="badge-info">Info</span>
            <span className="badge-neutral">Neutral</span>
          </div>
        </section>

        {/* Card Test */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Cards
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="card-neu">
              <h3 className="font-display font-semibold text-lg text-neu-text mb-2">
                Raised Card
              </h3>
              <p className="text-sm text-neu-text-muted">
                Hovers to lift
              </p>
            </div>
            <div className="card-neu-flat">
              <h3 className="font-display font-semibold text-lg text-neu-text mb-2">
                Flat Card
              </h3>
              <p className="text-sm text-neu-text-muted">
                Subtle gradient
              </p>
            </div>
            <div className="card-metric">
              <p className="text-3xl font-display font-bold text-neu-accent mb-1">
                100%
              </p>
              <p className="text-sm text-neu-text-muted">
                Metric Card
              </p>
            </div>
          </div>
        </section>

        {/* Input Test */}
        <section className="neu-raised p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Inputs
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Text input..."
              className="input-neu w-full"
            />
            <select className="select-neu w-full">
              <option>Select option</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
            <textarea
              placeholder="Textarea..."
              className="textarea-neu w-full h-24"
            />
          </div>
        </section>

        {/* Shadow Variants Test */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Shadow Variants
          </h2>
          <div className="grid grid-cols-4 gap-6">
            <div className="neu-raised p-6 text-center">
              <p className="text-sm text-neu-text-muted">Raised</p>
            </div>
            <div className="neu-raised-sm p-6 text-center">
              <p className="text-sm text-neu-text-muted">Raised Small</p>
            </div>
            <div className="neu-inset p-6 text-center">
              <p className="text-sm text-neu-text-muted">Inset</p>
            </div>
            <div className="neu-flat p-6 text-center">
              <p className="text-sm text-neu-text-muted">Flat</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
