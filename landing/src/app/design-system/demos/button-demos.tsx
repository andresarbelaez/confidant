'use client';

export function ButtonDemos() {
  return (
    <div className="ds-buttons-demo">
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Primary</h3>
        <p className="ds-demo-desc">
          Solid <code>--color-primary</code>, hover <code>--color-primary-hover</code>. Min size{' '}
          <code>--touch-target-min</code>.
        </p>
        <div className="ds-button-row">
          <button type="button" className="ds-btn ds-btn-primary">
            Primary
          </button>
        </div>
      </div>
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Secondary</h3>
        <p className="ds-demo-desc">
          Background <code>--color-surface</code>, border <code>--color-border</code>. Secondary
          actions.
        </p>
        <div className="ds-button-row">
          <button type="button" className="ds-btn ds-btn-secondary">
            Secondary
          </button>
        </div>
      </div>
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Danger</h3>
        <p className="ds-demo-desc">
          <code>--color-danger-bg</code> for destructive actions (e.g. delete, remove).
        </p>
        <div className="ds-button-row">
          <button type="button" className="ds-btn ds-btn-danger">
            Danger
          </button>
        </div>
      </div>
    </div>
  );
}
