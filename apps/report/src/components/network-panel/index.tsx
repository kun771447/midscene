import type { ExecutionTask } from '@midscene/core';
import { useState } from 'react';
import { useAllNetworkRequests } from '../../hooks/useNetworkRequests';
import type { NetworkRequest } from '../../types';
import './index.less';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`np-copy-btn${copied ? ' np-copy-btn-ok' : ''}`}
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
            fill="var(--np-json-bg, #f7f7f7)"
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
    return u.pathname + (u.search || '');
  } catch {
    return url;
  }
}

const jsonTokenPattern =
  /"(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?|[{}\[\],:]/g;

function tryFormatStructuredJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return null;
    }

    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return null;
    }
  }

  return JSON.stringify(value, null, 2);
}

function renderHighlightedJson(text: string) {
  const parts: Array<string | JSX.Element> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  jsonTokenPattern.lastIndex = 0;
  match = jsonTokenPattern.exec(text);

  while (match !== null) {
    const token = match[0];
    const start = match.index;
    const end = start + token.length;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    let className = 'np-json-punct';

    if (token.startsWith('"')) {
      className = /^\s*:/.test(text.slice(end))
        ? 'np-json-key'
        : 'np-json-string';
    } else if (/^(true|false)$/.test(token)) {
      className = 'np-json-boolean';
    } else if (token === 'null') {
      className = 'np-json-null';
    } else if (/^-?\d/.test(token)) {
      className = 'np-json-number';
    }

    parts.push(
      <span className={className} key={`${start}-${token}`}>
        {token}
      </span>,
    );

    lastIndex = end;
    match = jsonTokenPattern.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <pre className="np-json np-json-empty">null</pre>;
  }

  const structuredText = tryFormatStructuredJson(value);

  if (structuredText) {
    return (
      <pre className="np-json np-json-structured">
        {renderHighlightedJson(structuredText)}
      </pre>
    );
  }

  return <pre className="np-json np-json-plain">{String(value)}</pre>;
}

function matchesTask(req: NetworkRequest, task: ExecutionTask): boolean {
  if (task.taskId && req.taskId) return req.taskId === task.taskId;
  const start = task.timing?.start;
  const end = task.timing?.end;
  if (start && end && req.timestamp) {
    return req.timestamp >= start && req.timestamp <= end;
  }
  return false;
}

function RowMeta({
  req,
  highlighted,
}: {
  req: NetworkRequest;
  highlighted: boolean;
}) {
  const method = (req.method || 'GET').toUpperCase();
  return (
    <>
      <span className={`np-method np-method-${method.toLowerCase()}`}>
        {method}
      </span>
      <span className="np-url" title={req.url}>
        {shortUrl(req.url)}
      </span>
      <span className="np-meta">
        {req.statusCode && (
          <span className={`np-status ${statusColor(req.statusCode)}`}>
            {req.statusCode}
          </span>
        )}
        {req.duration !== undefined && (
          <span className="np-duration">{req.duration}ms</span>
        )}
        {highlighted && <span className="np-match-chip">In step</span>}
      </span>
    </>
  );
}

function RowBody({ req }: { req: NetworkRequest }) {
  return (
    <div className="np-body">
      <div className="np-full-url">{req.url}</div>
      {req.requestBody !== undefined && (
        <div className="np-section">
          <div className="np-section-label">Request Body</div>
          <div className="np-json-wrap">
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
        <div className="np-section">
          <div className="np-section-label">Response Body</div>
          <div className="np-json-wrap">
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
  );
}

function RequestRow({
  req,
  highlighted,
}: {
  req: NetworkRequest;
  highlighted: boolean;
}) {
  const hasBody =
    req.requestBody !== undefined || req.responseBody !== undefined;

  if (hasBody) {
    return (
      <details className="np-row">
        <summary className="np-row-summary">
          <RowMeta req={req} highlighted={highlighted} />
        </summary>
        <RowBody req={req} />
      </details>
    );
  }

  return (
    <div className="np-row np-row-plain">
      <RowMeta req={req} highlighted={highlighted} />
    </div>
  );
}

interface Props {
  activeTask: ExecutionTask | null;
  collapsed: boolean;
  onToggle: () => void;
}

export function NetworkPanel({ activeTask, collapsed, onToggle }: Props) {
  const state = useAllNetworkRequests();
  const [inputValue, setInputValue] = useState('');
  const [keyword, setKeyword] = useState('');

  if (state.status === 'unavailable') return null;

  const requests = state.status === 'ready' ? state.requests : [];

  const filtered = keyword
    ? requests.filter((r) =>
        r.url.toLowerCase().includes(keyword.toLowerCase()),
      )
    : requests;

  const activeCount = activeTask
    ? filtered.filter((r) => matchesTask(r, activeTask)).length
    : 0;

  if (collapsed) {
    return (
      <button
        type="button"
        className="np-collapsed-tab"
        onClick={onToggle}
        title="Expand Network panel"
      >
        <span className="np-collapsed-label">
          Network
          {requests.length > 0 && (
            <span className="np-collapsed-count">{requests.length}</span>
          )}
        </span>
        <span className="np-collapsed-arrow">›</span>
      </button>
    );
  }

  return (
    <div className="network-panel">
      <div className="np-header">
        <div className="np-header-main">
          <span className="np-header-title">
            Network
            {requests.length > 0 && (
              <span className="np-total-badge">
                {keyword && filtered.length !== requests.length
                  ? `${filtered.length}/${requests.length}`
                  : requests.length}
              </span>
            )}
          </span>
          {activeCount > 0 && (
            <span className="np-active-badge">
              <span className="np-active-badge-dot" aria-hidden="true" />
              <span>{activeCount} requests in current step</span>
            </span>
          )}
        </div>
        <button
          type="button"
          className="np-close-btn"
          onClick={onToggle}
          title="Collapse panel"
        >
          ›
        </button>
      </div>

      <div className="np-search-bar">
        <svg
          className="np-search-icon"
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          role="img"
          aria-label="Search"
        >
          <circle
            cx="5.5"
            cy="5.5"
            r="4"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M9 9l2.5 2.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        <input
          className="np-search-input"
          type="text"
          placeholder="Filter by URL"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setKeyword(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setKeyword(inputValue);
            if (e.key === 'Escape') {
              setInputValue('');
              setKeyword('');
            }
          }}
        />
        {inputValue && (
          <button
            type="button"
            className="np-search-clear"
            onClick={() => {
              setInputValue('');
              setKeyword('');
            }}
            title="Clear"
          >
            ×
          </button>
        )}
      </div>

      <div className="np-content">
        {state.status === 'loading' && (
          <div className="np-loading">Loading...</div>
        )}
        {state.status === 'ready' && requests.length === 0 && (
          <div className="np-empty">No network requests recorded</div>
        )}
        {state.status === 'ready' &&
          requests.length > 0 &&
          filtered.length === 0 && (
            <div className="np-empty">No results for "{keyword}"</div>
          )}
        {state.status === 'ready' && filtered.length > 0 && (
          <div className="np-list">
            {filtered.map((req, i) => (
              <RequestRow
                key={i}
                req={req}
                highlighted={!!activeTask && matchesTask(req, activeTask)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
