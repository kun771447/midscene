import { useState } from 'react';
import type { NetworkRequest } from '../../types';
import './index.less';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`nr-copy-btn${copied ? ' nr-copy-btn-ok' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          role="img"
          aria-label="Copied"
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          role="img"
          aria-label="Copy"
        >
          <rect
            x="4"
            y="1"
            width="7"
            height="8"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <rect
            x="1"
            y="3"
            width="7"
            height="8"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="var(--nr-json-bg, #f7f7f7)"
          />
        </svg>
      )}
    </button>
  );
}

function statusColor(code?: number): string {
  if (!code) return '';
  if (code >= 500) return 'status-5xx';
  if (code >= 400) return 'status-4xx';
  if (code >= 300) return 'status-3xx';
  return 'status-2xx';
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + (u.search ? u.search : '');
  } catch {
    return url;
  }
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === undefined || value === null)
    return <span className="nr-null">null</span>;
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <pre className="nr-json">{text}</pre>;
}

function RequestCard({ req }: { req: NetworkRequest }) {
  const [open, setOpen] = useState(false);
  const method = (req.method || 'GET').toUpperCase();
  const hasBody =
    req.requestBody !== undefined || req.responseBody !== undefined;
  const short = shortUrl(req.url);

  return (
    <div className={`nr-card ${open ? 'nr-card-open' : ''}`}>
      <button
        type="button"
        className="nr-card-header"
        onClick={() => hasBody && setOpen((v) => !v)}
        style={{ cursor: hasBody ? 'pointer' : 'default' }}
      >
        <span className={`nr-method nr-method-${method.toLowerCase()}`}>
          {method}
        </span>
        <span className="nr-url" title={req.url}>
          {short}
        </span>
        <span className="nr-right">
          {req.statusCode && (
            <span className={`nr-status ${statusColor(req.statusCode)}`}>
              {req.statusCode}
            </span>
          )}
          {req.duration !== undefined && (
            <span className="nr-duration">{req.duration}ms</span>
          )}
          {hasBody && <span className="nr-chevron">{open ? '▲' : '▼'}</span>}
        </span>
      </button>

      {open && (
        <div className="nr-body">
          <div className="nr-full-url">{req.url}</div>
          {req.requestBody !== undefined && (
            <div className="nr-section">
              <div className="nr-section-label">Request Body</div>
              <div className="nr-json-wrap">
                <JsonBlock value={req.requestBody} />
                <CopyButton
                  text={
                    typeof req.requestBody === 'string'
                      ? req.requestBody
                      : JSON.stringify(req.requestBody, null, 2)
                  }
                />
              </div>
            </div>
          )}
          {req.responseBody !== undefined && (
            <div className="nr-section">
              <div className="nr-section-label">Response Body</div>
              <div className="nr-json-wrap">
                <JsonBlock value={req.responseBody} />
                <CopyButton
                  text={
                    typeof req.responseBody === 'string'
                      ? req.responseBody
                      : JSON.stringify(req.responseBody, null, 2)
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  requests: NetworkRequest[];
}

export function NetworkRequests({ requests }: Props) {
  if (requests.length === 0) {
    return (
      <div className="nr-empty">No network requests captured for this task</div>
    );
  }

  return (
    <div className="nr-list">
      {requests.map((req, i) => (
        <RequestCard key={i} req={req} />
      ))}
    </div>
  );
}
