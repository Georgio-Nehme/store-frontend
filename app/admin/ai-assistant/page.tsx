'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  adminCreateAiCredential,
  adminGetAiAssistant,
  adminRevokeAiConnection,
  adminUpdateAiAssistant,
  adminUpdateAiConnection,
} from '@/lib/api';
import { AiAssistant, AiConnection, AiSection } from '@/lib/types';

type Level = 'none' | 'read' | 'write';
type Tab = 'chatgpt' | 'claude' | 'claude-code' | 'other';

const LEVEL_LABELS: Record<Level, string> = { none: 'No access', read: 'View', write: 'Edit' };

// Scopes are "<section>:read" / "<section>:write"; edit includes view.
function levelOf(scopes: string[], key: string): Level {
  if (scopes.includes(`${key}:write`)) return 'write';
  if (scopes.includes(`${key}:read`)) return 'read';
  return 'none';
}

function withLevel(scopes: string[], key: string, level: Level): string[] {
  const rest = scopes.filter(s => !s.startsWith(`${key}:`));
  if (level === 'read') return [...rest, `${key}:read`];
  if (level === 'write') return [...rest, `${key}:read`, `${key}:write`];
  return rest;
}

function levelsFor(section: AiSection, allowed: string[]): Level[] {
  if (allowed.includes(`${section.key}:write`)) return ['none', 'read', 'write'];
  if (allowed.includes(`${section.key}:read`)) return ['none', 'read'];
  return ['none'];
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'store';
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never';
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked (e.g. non-HTTPS): the value is selectable
        }
      }}
      className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2 border rounded-lg bg-gray-50 pl-3">
        <code className="flex-1 min-w-0 text-sm text-gray-800 py-2 overflow-x-auto whitespace-nowrap">{value}</code>
        <CopyButton text={value} />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Snippet({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 pr-16 overflow-x-auto whitespace-pre">{code}</pre>
      <div className="absolute top-1.5 right-1.5 bg-white rounded">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function LevelPicker({
  label, value, levels, onChange, disabled,
}: {
  label: string;
  value: Level;
  levels: Level[];
  onChange: (level: Level) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5 shrink-0" role="radiogroup" aria-label={label}>
      {levels.map(level => (
        <button
          key={level}
          type="button"
          role="radio"
          aria-checked={value === level}
          disabled={disabled}
          onClick={() => onChange(level)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-60 ${
            value === level ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {LEVEL_LABELS[level]}
        </button>
      ))}
    </div>
  );
}

/** One row per section with a No access / View / Edit picker, limited to what the store allows. */
function SectionAccess({
  sections, allowed, scopes, onChange, disabled, showDescriptions,
}: {
  sections: AiSection[];
  allowed: string[];
  scopes: string[];
  onChange: (scopes: string[]) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
}) {
  return (
    <div className="divide-y border rounded-lg">
      {sections.map(section => (
        <div key={section.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">{section.label}</p>
            {showDescriptions && (
              <p className="text-xs text-gray-500">
                View: {section.read}{section.write ? ` · Edit: ${section.write}` : ''}
              </p>
            )}
          </div>
          <LevelPicker
            label={section.label}
            value={levelOf(scopes, section.key)}
            levels={levelsFor(section, allowed)}
            disabled={disabled}
            onChange={level => onChange(withLevel(scopes, section.key, level))}
          />
        </div>
      ))}
    </div>
  );
}

const ALL_SCOPES = (sections: AiSection[]) =>
  sections.flatMap(s => (s.write ? [`${s.key}:read`, `${s.key}:write`] : [`${s.key}:read`]));

/** One-click presets: everything `allowed` permits, view-only of it, or nothing. */
function Presets({ allowed, onPick, disabled }: { allowed: string[]; onPick: (scopes: string[]) => void; disabled?: boolean }) {
  const presets: [string, string[]][] = [
    ['Everything', allowed],
    ['View only', allowed.filter(s => s.endsWith(':read'))],
    ['Nothing', []],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-xs text-gray-500">Quick set:</span>
      {presets.map(([label, scopes]) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(scopes)}
          className="text-xs font-medium px-3 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function AiAssistantPage() {
  const [data, setData] = useState<AiAssistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('chatgpt');

  const [credName, setCredName] = useState('');
  const [credScopes, setCredScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ name: string; clientId: string; secret: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    adminGetAiAssistant()
      .then(d => {
        setData(d);
        setCredScopes(d.allowed_scopes.filter(s => s.endsWith(':read')));
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const scopeLabels = useMemo(() => {
    const map: Record<string, string> = {};
    data?.sections.forEach(s => {
      map[`${s.key}:read`] = `${s.label}: view`;
      map[`${s.key}:write`] = `${s.label}: edit`;
    });
    return map;
  }, [data]);

  async function saveStore(update: { enabled?: boolean; allowed_scopes?: string[] }) {
    setSaving(true);
    setError(null);
    try {
      const updated = await adminUpdateAiAssistant(update);
      setData(updated);
      setCredScopes(scopes => scopes.filter(s => updated.allowed_scopes.includes(s)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function createCredential(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await adminCreateAiCredential({ name: credName.trim(), scopes: credScopes });
      setCreated({ name: res.connection.name, clientId: res.client_id, secret: res.client_secret });
      setData(d => d && { ...d, connections: [res.connection, ...d.connections] });
      setCredName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create credential');
    } finally {
      setCreating(false);
    }
  }

  async function updateConnection(c: AiConnection, scopes: string[]) {
    setError(null);
    try {
      const updated = await adminUpdateAiConnection(c.id, scopes);
      setData(d => d && { ...d, connections: d.connections.map(x => (x.id === c.id ? updated : x)) });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update access');
    }
  }

  async function revoke(c: AiConnection) {
    const what = c.kind === 'credential' ? `Delete the credential "${c.name}"` : `Disconnect "${c.name}"`;
    if (!confirm(`${what}? Anything using it loses access immediately.`)) return;
    try {
      await adminRevokeAiConnection(c.id);
      setData(d => d && { ...d, connections: d.connections.filter(x => x.id !== c.id) });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  const serverName = data ? slugify(data.store_name) : 'store';
  const clientId = created?.clientId ?? '<CLIENT_ID>';
  const secret = created?.secret ?? '<CLIENT_SECRET>';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">AI Assistant</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-3xl">
        Connect ChatGPT, Claude or other AI tools to manage your store by chatting. Create a credential with the access
        you want, then enter the <b>server address</b>, <b>Client ID</b> and <b>Client Secret</b> in the AI tool.
      </p>

      {error && <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg max-w-3xl">{error}</p>}

      {loading ? <p className="text-gray-500">Loading...</p> : data && (
        <div className="flex flex-col gap-6 max-w-3xl">
          {/* 1. Switch + store-wide maximum */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-5">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Allow AI assistants</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Off blocks every credential and connection without deleting them.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={data.enabled}
                disabled={saving}
                onClick={() => saveStore({ enabled: !data.enabled })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 ${data.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${data.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </label>

            <div>
              <p className="text-sm font-medium text-gray-700">Maximum access by section</p>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                No credential can go above this. Lowering a section applies immediately to everything connected.
              </p>
              <Presets allowed={ALL_SCOPES(data.sections)} disabled={saving} onPick={scopes => saveStore({ allowed_scopes: scopes })} />
              <SectionAccess
                sections={data.sections}
                allowed={ALL_SCOPES(data.sections)}
                scopes={data.allowed_scopes}
                disabled={saving}
                showDescriptions
                onChange={scopes => saveStore({ allowed_scopes: scopes })}
              />
            </div>
          </div>

          {/* 2. Create a credential */}
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm font-medium text-gray-700">Create a credential</p>
            <p className="text-xs text-gray-500 mt-0.5 mb-4">
              One per AI tool, so you can see and cut off each one separately.
            </p>

            {created && (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4 mb-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-green-800">
                  &quot;{created.name}&quot; is ready. Copy the Client Secret now: it won&apos;t be shown again.
                </p>
                <Field label="Server address" value={data.server_url} />
                <Field label="Client ID" value={created.clientId} />
                <Field label="Client Secret" value={created.secret} />
                <p className="text-xs text-green-800">The instructions below now include these values.</p>
                <button type="button" onClick={() => setCreated(null)} className="self-start text-xs text-gray-600 hover:underline">
                  I&apos;ve saved it
                </button>
              </div>
            )}

            <form onSubmit={createCredential} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={credName}
                  onChange={e => setCredName(e.target.value)}
                  placeholder="e.g. ChatGPT, Claude, Cursor on my laptop"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Presets allowed={data.allowed_scopes} onPick={setCredScopes} />
                <SectionAccess sections={data.sections} allowed={data.allowed_scopes} scopes={credScopes} onChange={setCredScopes} />
              </div>
              <button
                type="submit"
                disabled={creating || !credName.trim() || credScopes.length === 0}
                className="self-start bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Create credential'}
              </button>
            </form>
          </div>

          {/* 3. How to connect */}
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm font-medium text-gray-700 mb-3">How to connect</p>
            {!data.enabled && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 mb-3">
                Turn on &quot;Allow AI assistants&quot; above first, or connecting will be refused.
              </p>
            )}
            <div className="flex gap-1 border-b mb-4 overflow-x-auto">
              {([
                ['chatgpt', 'ChatGPT'],
                ['claude', 'Claude'],
                ['claude-code', 'Claude Code'],
                ['other', 'Other tools'],
              ] as [Tab, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    tab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'chatgpt' && (
              <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                <li>Create a credential above (e.g. named &quot;ChatGPT&quot;).</li>
                <li>In ChatGPT, open <b>Settings › Apps &amp; Connectors › Advanced settings</b> and turn on <b>Developer mode</b>.</li>
                <li>In <b>Apps &amp; Connectors</b>, click <b>Create</b> and name it <b>{data.store_name}</b>.</li>
                <li><b>MCP Server URL</b>: <code className="bg-gray-100 px-1 rounded break-all">{data.server_url}</code></li>
                <li><b>Authentication</b>: <b>OAuth</b>. In the OAuth settings enter the <b>Client ID</b> <code className="bg-gray-100 px-1 rounded break-all">{clientId}</code> and the <b>Client Secret</b>.</li>
                <li>Tick that you trust the app and click <b>Create</b>. It connects straight away, with no extra sign-in.</li>
                <li>In a chat, turn it on from the <b>+</b> menu and ask, e.g. <i>&quot;Which products are low on stock?&quot;</i></li>
              </ol>
            )}
            {tab === 'claude' && (
              <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                <li>Create a credential above (e.g. named &quot;Claude&quot;).</li>
                <li>On claude.ai or the Claude desktop app, open <b>Settings › Connectors</b> and click <b>Add custom connector</b>.</li>
                <li>Name it <b>{data.store_name}</b>. <b>Remote MCP server URL</b>: <code className="bg-gray-100 px-1 rounded break-all">{data.server_url}</code></li>
                <li>Open <b>Advanced settings</b> and enter the <b>OAuth Client ID</b> <code className="bg-gray-100 px-1 rounded break-all">{clientId}</code> and the <b>OAuth Client Secret</b>.</li>
                <li>Click <b>Add</b>, then <b>Connect</b>. It connects straight away, with no extra sign-in.</li>
                <li>In a chat, enable it from the tools menu and ask, e.g. <i>&quot;Show me this week&apos;s orders.&quot;</i></li>
              </ol>
            )}
            {tab === 'claude-code' && (
              <div className="space-y-3 text-sm text-gray-700">
                <p>Create a credential above, then run (the Client Secret works as the key):</p>
                <Snippet code={`claude mcp add --transport http ${serverName} ${data.server_url} --header "Authorization: Bearer ${secret}"`} />
              </div>
            )}
            {tab === 'other' && (
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  Any MCP tool that supports OAuth: enter the server address, Client ID and Client Secret. Tools that only
                  take headers can send the <b>Client Secret</b> as a bearer token:
                </p>
                <p className="font-medium">Cursor, Windsurf and similar (<code>mcp.json</code>):</p>
                <Snippet code={JSON.stringify({ mcpServers: { [serverName]: { url: data.server_url, headers: { Authorization: `Bearer ${secret}` } } } }, null, 2)} />
                <p className="font-medium">Claude Desktop config file (<code>claude_desktop_config.json</code>, needs Node.js):</p>
                <Snippet code={JSON.stringify({ mcpServers: { [serverName]: { command: 'npx', args: ['-y', 'mcp-remote', data.server_url, '--header', `Authorization: Bearer ${secret}`] } } }, null, 2)} />
                <p className="font-medium">Scripts / automations (OAuth client credentials):</p>
                <Snippet code={`curl -X POST ${data.oauth.token_url} \\\n  -d grant_type=client_credentials \\\n  -d client_id=${clientId} \\\n  -d client_secret=${secret}`} />
              </div>
            )}
          </div>

          {/* 4. Reference details */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <p className="text-sm font-medium text-gray-700">Connection details</p>
            <Field label="Server address" value={data.server_url} hint="The same for every store: the Client ID tells it which store." />
            <Field label="Store ID" value={data.store_id} />
            <details>
              <summary className="text-sm text-blue-600 cursor-pointer select-none">Advanced</summary>
              <div className="flex flex-col gap-3 mt-3">
                <Field label="Authorization URL" value={data.oauth.authorization_url} />
                <Field label="Token URL" value={data.oauth.token_url} />
                <Field label="Resource metadata URL" value={data.oauth.metadata_url} />
                <Field
                  label="This store's own address"
                  value={data.store_url}
                  hint="Alternative without a credential: the AI tool registers itself and a store admin signs in to approve it."
                />
              </div>
            </details>
          </div>

          {/* 5. Credentials and connected apps */}
          <div className="bg-white rounded-xl shadow">
            <div className="px-6 pt-5 pb-3">
              <p className="text-sm font-medium text-gray-700">Credentials and connected apps</p>
            </div>
            {data.connections.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-gray-500">Nothing yet.</p>
            ) : (
              <ul className="divide-y border-t">
                {data.connections.map(c => (
                  <li key={c.id} className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">
                          {c.name}
                          <span className={`ml-2 align-middle text-xs px-2 py-0.5 rounded-full ${c.kind === 'credential' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.kind === 'credential' ? 'Credential' : 'Signed-in app'}
                          </span>
                        </p>
                        {c.client_id && (
                          <p className="text-xs text-gray-500 mt-1 break-all">Client ID: <code>{c.client_id}</code></p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.scopes
                            .filter(s => !(s.endsWith(':read') && c.scopes.includes(s.replace(':read', ':write'))))
                            .map(s => (
                              <span key={s} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded whitespace-nowrap">{scopeLabels[s] ?? s}</span>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Created {formatDate(c.created_at)}{c.approved_by ? ` by ${c.approved_by}` : ''} · Last used {formatDate(c.last_used_at)}
                        </p>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <button type="button" onClick={() => setEditing(editing === c.id ? null : c.id)} className="text-sm text-blue-600 hover:text-blue-800">
                          {editing === c.id ? 'Done' : 'Edit access'}
                        </button>
                        <button type="button" onClick={() => revoke(c)} className="text-sm text-red-600 hover:text-red-800">
                          {c.kind === 'credential' ? 'Delete' : 'Disconnect'}
                        </button>
                      </div>
                    </div>
                    {editing === c.id && (
                      <div className="mt-3">
                        <SectionAccess
                          sections={data.sections}
                          allowed={data.allowed_scopes}
                          scopes={c.scopes}
                          onChange={scopes => (scopes.length ? updateConnection(c, scopes) : setError('Keep at least one section, or delete it instead.'))}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
