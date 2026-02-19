'use client';

import { tokens } from 'confidant-design-tokens';

export function SpacingDemo() {
  return (
    <div className="ds-spacing-demo">
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Minimum touch target</h3>
        <p className="ds-demo-desc">
          Primary actions use at least <code>--touch-target-min</code> for height and width (WCAG).
        </p>
        <div className="ds-touch-target-visual">
          <div
            className="ds-touch-target-box"
            style={{
              minHeight: tokens.spacing.touchTargetMin,
              minWidth: tokens.spacing.touchTargetMin,
            }}
          >
            Min size
          </div>
        </div>
        <code className="ds-token-code">--touch-target-min: {tokens.spacing.touchTargetMin}</code>
      </div>
    </div>
  );
}
