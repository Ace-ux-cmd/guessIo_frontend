import Icon from './Icon';

// Template status classes (error-pages.html): info = 404, bad = 500, warn = offline, vio = maintenance.
const STATUS = { info: 'status-404', bad: 'status-500', danger: 'status-500', warn: 'status-offline', mute: 'status-offline', vio: 'status-maintenance' };

/** A button in the template's error-card action row. `kind` is primary, secondary or solo. */
export function ErrorAction({ kind = 'primary', ...props }) {
  return <button type="button" className={`action error-pages-variant ${kind}`} {...props} />;
}

/**
 * Full-screen state from error-pages.html: a coloured code (`glyph`), headline,
 * a line of copy, optional note and an action row. `icon` is still accepted for
 * callers that have no glyph.
 */
export default function ErrorScreen({ tone = 'info', glyph, icon, title, body, note, detail, extra, actions }) {
  return (
    <main className="app" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="content" style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <section className={`error-card ${STATUS[tone] || STATUS.info}`} aria-labelledby="error-title">
          {glyph ? (
            <div className="error-code" aria-hidden="true">{glyph}</div>
          ) : (
            <div className="error-code" aria-hidden="true"><Icon name={icon} className="h-12 w-12" /></div>
          )}
          <h1 id="error-title" style={{ margin: '0.7rem 0 0', fontSize: '1.05rem' }}>{title}</h1>
          <p>{body}</p>
          {detail && <p role="status">{detail}</p>}
          {extra}
          {note && <div className="offline-note" style={{ display: 'block' }}>{note}</div>}
          <div className="actions error-pages-variant">{actions}</div>
        </section>
      </div>
    </main>
  );
}
