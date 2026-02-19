'use client';

import { tokens } from 'confidant-design-tokens';

export function TypographyDemo() {
  return (
    <div className="ds-typography-demo">
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Font family</h3>
        <p className="ds-typography-sample" style={{ fontFamily: tokens.font.family }}>
          The quick brown fox jumps over the lazy dog. 0123456789
        </p>
        <code className="ds-token-code">font-family: {tokens.font.family}</code>
      </div>
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Line height</h3>
        <p className="ds-typography-sample" style={{ lineHeight: tokens.font.lineHeight }}>
          Body text uses line-height {tokens.font.lineHeight} for readability. Multiple lines wrap and
          maintain consistent spacing.
        </p>
        <code className="ds-token-code">line-height: {tokens.font.lineHeight}</code>
      </div>
      <div className="ds-demo-group">
        <h3 className="ds-demo-group-title">Weights</h3>
        <div className="ds-typography-weights">
          <p style={{ fontWeight: tokens.font.weightRegular }}>
            <strong>Regular (400):</strong> Body text, default UI.
          </p>
          <p style={{ fontWeight: tokens.font.weightMedium }}>
            <strong>Medium (500):</strong> Labels, emphasis, buttons.
          </p>
        </div>
        <code className="ds-token-code">400 (regular), 500 (medium)</code>
      </div>
    </div>
  );
}
