'use client';

export function FormElementsDemo() {
  return (
    <div className="ds-form-demo">
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Text input</h3>
        <p className="ds-demo-desc">
          Background <code>--color-surface-input</code>, border <code>--color-border</code>. Focus
          uses <code>--color-primary</code>.
        </p>
        <div className="ds-form-row">
          <input
            type="text"
            className="ds-input"
            placeholder="Placeholder uses --color-placeholder"
            aria-label="Sample input"
          />
        </div>
      </div>
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Label + input</h3>
        <p className="ds-demo-desc">
          Labels use <code>--color-text-secondary</code> or <code>--color-text-muted</code>.
        </p>
        <div className="ds-form-row">
          <label htmlFor="ds-demo-label-input" className="ds-label">
            Field label
          </label>
          <input
            id="ds-demo-label-input"
            type="text"
            className="ds-input"
            placeholder="Enter value"
          />
        </div>
      </div>
    </div>
  );
}
