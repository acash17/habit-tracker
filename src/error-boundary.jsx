import React from 'react';

// Catches render-time errors so one bad component shows a recovery card instead
// of unmounting the whole app to a blank screen.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[Pacely] render error:', error, info?.componentStack);
  }
  reset = () => {
    this.setState({ error: null });
  };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 9999,
        background: 'var(--paper, #F6F1E8)', color: 'var(--ink, #1F1B16)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 28, textAlign: 'center', fontFamily: 'var(--sans, system-ui)',
      }}>
        <div style={{
          fontFamily: 'var(--serif, Georgia, serif)', fontSize: 26, marginBottom: 8, letterSpacing: -0.3,
        }}>Something hiccupped.</div>
        <div style={{ fontSize: 13.5, color: 'rgba(31,27,22,0.6)', maxWidth: 300, lineHeight: 1.5, marginBottom: 20 }}>
          A screen failed to render. Your data is safe on this device — nothing was lost.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={this.reset} style={{
            padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'var(--ink, #1F1B16)', color: 'var(--paper, #F6F1E8)',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500,
          }}>Try again</button>
          <button onClick={() => { try { location.reload(); } catch {} }} style={{
            padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
            background: 'transparent', border: '0.5px solid rgba(31,27,22,0.2)',
            color: 'var(--ink, #1F1B16)', fontFamily: 'inherit', fontSize: 13.5,
          }}>Reload</button>
        </div>
        {this.state.error?.message && (
          <pre style={{
            marginTop: 22, maxWidth: 320, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: 'var(--mono, monospace)', fontSize: 10.5, color: 'rgba(31,27,22,0.4)',
          }}>{String(this.state.error.message).slice(0, 200)}</pre>
        )}
      </div>
    );
  }
}
