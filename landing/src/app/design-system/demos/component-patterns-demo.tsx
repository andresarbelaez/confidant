'use client';

export function ComponentPatternsDemo() {
  return (
    <div className="ds-patterns-demo">
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Card / panel</h3>
        <p className="ds-demo-desc">
          <code>--color-surface</code> or <code>--color-surface-subtle</code>, border{' '}
          <code>--color-border-subtle</code>.
        </p>
        <div className="ds-pattern-card">
          <p className="ds-pattern-card-title">Card title</p>
          <p className="ds-pattern-card-body">Card content uses the surface token. Border radius 8px.</p>
        </div>
      </div>
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">List with dividers</h3>
        <p className="ds-demo-desc">
          Dividers <code>--color-border-subtle</code>; selected/hover <code>--color-surface-subtle</code>.
        </p>
        <ul className="ds-pattern-list">
          <li className="ds-pattern-list-item">List item one</li>
          <li className="ds-pattern-list-item">List item two</li>
          <li className="ds-pattern-list-item">List item three</li>
        </ul>
      </div>
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Modal / overlay</h3>
        <p className="ds-demo-desc">
          Overlay <code>--color-overlay</code> or <code>--color-overlay-strong</code>; content uses{' '}
          <code>--color-surface</code>, <code>--color-border</code>.
        </p>
        <div className="ds-pattern-overlay-mock">
          <div className="ds-pattern-overlay-backdrop" />
          <div className="ds-pattern-modal-mock">
            <p className="ds-pattern-modal-title">Modal title</p>
            <p className="ds-pattern-modal-body">Modal content area.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
