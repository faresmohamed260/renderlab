import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon, RenderLabMark } from "./Icons";
import { studioApi } from "./studioApi";

const terminal = new Set(["completed", "failed", "cancelled"]);
const noop = () => {};

function useStudio() {
  const [workflows, setWorkflows] = useState([]);
  const [models, setModels] = useState([]);
  const [runtime, setRuntime] = useState(null);
  const [comfyWorkspace, setComfyWorkspace] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [library, setLibrary] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshSession = useCallback(async (id) => {
    if (!id) return;
    setSession(await studioApi.session(id));
  }, []);
  const refreshQueue = useCallback(async () => setQueue((await studioApi.queue()).jobs), []);
  const refreshLibrary = useCallback(async (query = "") => setLibrary(await studioApi.library(query)), []);
  const refreshCapabilities = useCallback(async () => {
    const [modelData, runtimeData, workspaceData] = await Promise.all([
      studioApi.models(), studioApi.runtime(), studioApi.workspace(),
    ]);
    setModels(modelData.items || []);
    setRuntime(runtimeData);
    setComfyWorkspace(workspaceData);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [workflowData, modelData, sessionData, runtimeData, workspaceData] = await Promise.all([
          studioApi.workflows(), studioApi.models(), studioApi.sessions(), studioApi.runtime(), studioApi.workspace(),
        ]);
        let active = sessionData.sessions[0];
        if (!active) active = await studioApi.createSession();
        const full = await studioApi.session(active.id);
        if (alive) {
          setWorkflows(workflowData.workflows);
          setModels(modelData.items || []);
          setRuntime(runtimeData);
          setComfyWorkspace(workspaceData);
          setSessions(sessionData.sessions);
          setSession(full);
          setError(workflowData.errors?.[0]?.error || "");
        }
      } catch (reason) {
        if (alive) setError(reason.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    refreshQueue();
    refreshLibrary();
    const source = new EventSource(studioApi.eventsUrl());
    source.addEventListener("queue", (event) => {
      const jobs = JSON.parse(event.data).jobs || [];
      setQueue(jobs);
      if (session?.id) {
        refreshSession(session.id).then(() => refreshLibrary()).catch(() => {});
      }
    });
    return () => source.close();
  }, [refreshLibrary, refreshQueue, refreshSession, session?.id]);

  return { workflows, models, runtime, comfyWorkspace, sessions, setSessions, session, setSession, queue, library, loading, error, setError, refreshSession, refreshLibrary, refreshCapabilities };
}

function NavButton({ icon, label, active, onClick }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}><Icon name={icon}/><span>{label}</span></button>;
}

function Sidebar({ page, setPage }) {
  return <aside className="sidebar">
    <div className="brand"><RenderLabMark/><span>RenderLab</span></div>
    <nav className="primary-nav" aria-label="Main navigation">
      <NavButton icon="create" label="Create" active={page === "create"} onClick={() => setPage("create")}/>
      <NavButton icon="image" label="Library" active={page === "library"} onClick={() => setPage("library")}/>
      <NavButton icon="folder" label="Projects" active={page === "projects"} onClick={() => setPage("projects")}/>
      <NavButton icon="workflow" label="Workflows" active={page === "workflows"} onClick={() => setPage("workflows")}/>
    </nav>
    <nav className="utility-nav" aria-label="Account navigation">
      <NavButton icon="settings" label="Settings" active={page === "settings"} onClick={() => setPage("settings")}/><NavButton icon="help" label="Help"/><NavButton icon="logout" label="Log out"/>
    </nav>
  </aside>;
}

function Topbar({ session, sessions, queue, runtime, onQueue, onRename, onSelectSession, onNewSession }) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState(session?.name || "Untitled exploration");
  useEffect(() => setName(session?.name || "Untitled exploration"), [session?.name]);
  const commit = () => { setEditing(false); if (name.trim() && name !== session.name) onRename(name.trim()); };
  return <header className="topbar">
    <div className="session-name">
      {editing ? <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onBlur={commit} onKeyDown={(event) => event.key === "Enter" && commit()} aria-label="Session name"/> : <button onClick={() => setMenu(!menu)}>{session?.name || "Untitled exploration"}<Icon name="chevron" size={16}/></button>}
      {menu && <div className="session-menu"><div><strong>Explorations</strong><button onClick={() => { onNewSession(); setMenu(false); }}>New exploration</button></div>{sessions.map((item) => <button className={item.id === session?.id ? "active" : ""} key={item.id} onClick={() => { onSelectSession(item.id); setMenu(false); }}>{item.name}</button>)}<button className="rename-action" onClick={() => { setMenu(false); setEditing(true); }}>Rename current</button></div>}
    </div>
    <div className="top-actions">
      <span className={`runtime-pill ${runtime?.configured ? "ready" : "offline"}`} title={runtime?.base_url || "The ComfyUI runtime is unavailable"}><i/>{runtime?.configured ? runtime.provider === "modal_comfyui" ? "Modal ready" : "Local dev ready" : "ComfyUI offline"}</span>
      <button className="queue-button" onClick={onQueue}><Icon name="queue" size={18}/>Queue <span>{queue.length}</span></button>
      <button className="icon-button" aria-label="Open settings"><Icon name="sliders"/></button>
      <button className="avatar" aria-label="Account menu">A</button>
    </div>
  </header>;
}

function EmptyCanvas() {
  return <div className="empty-state">
    <div className="empty-glyph" aria-hidden="true"><div className="glyph-image"><Icon name="image" size={30}/></div><div className="glyph-play">▷</div><div className="glyph-crop">⌗</div></div>
    <h1>What will you create?</h1>
    <p>Describe your idea, add a reference, and let RenderLab<br className="desktop-break"/> bring it to life.</p>
  </div>;
}

const previewUrl = (asset) => asset?.thumbnail_url || asset?.content_url || "";

export function GenerationCard({ item, onReuse, onView, onCancel }) {
  const outputs = item.outputs || [];
  return <article className={`generation-card status-${item.status}`}>
    <div className="generation-meta"><span>{item.workflow_id === "z-image-turbo" ? "Z-Image Turbo" : item.workflow_id}</span><time>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
    <p className="generation-prompt">{item.prompt}</p>
    {outputs.length ? <div className="result-grid" aria-label="Generation outputs">{outputs.map((output, index) => {
      const isVideo = output?.media_type === "video";
      return <button className="result-media" key={output.id || output.content_url || index} onClick={() => onView(output, item)} aria-label={`View ${isVideo ? "video" : "image"} output ${index + 1}`}>{isVideo ? <video src={output.content_url} muted preload="metadata"/> : <img src={previewUrl(output)} alt={item.prompt} loading="lazy" decoding="async"/>}<span>{isVideo ? "Video" : "Image"} {outputs.length > 1 ? index + 1 : ""}</span></button>;
    })}</div> : <div className="generation-progress"><div className="progress-orb"><Icon name={item.status === "failed" ? "help" : "sparkle"}/></div><strong>{item.phase}</strong><span>{item.error?.message || (item.status === "queued" ? "Waiting for an available generation worker." : "Your generation is being prepared.")}</span>{!terminal.has(item.status) && <button className="text-button" onClick={() => onCancel(item.id)}>Cancel</button>}</div>}
    <div className="generation-actions"><button onClick={() => onReuse(item)}>Reuse prompt & settings</button></div>
  </article>;
}

function WorkflowPicker({ workflows, value, onChange, onClose }) {
  return <div className="popover workflow-popover" role="dialog" aria-label="Choose workflow">
    <div className="popover-heading"><div><strong>Choose a workflow</strong><span>Only healthy, executable workflows appear here.</span></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close"/></button></div>
    {workflows.map((workflow) => <button key={workflow.id} className={`workflow-option ${workflow.id === value ? "selected" : ""}`} onClick={() => { onChange(workflow.id); onClose(); }}>
      <span className="workflow-icon"><Icon name="image"/></span><span><strong>{workflow.display_name}</strong><small>{workflow.description}</small><em>{workflow.ui.speed} · {workflow.ui.quality}</em></span>{workflow.ui.recommended && <b>Recommended</b>}
    </button>)}
  </div>;
}

function optionValue(definition, rawValue) {
  const matched = definition.options?.find((option) => String(option) === rawValue);
  return matched === undefined ? rawValue : matched;
}

const ratioDimensions = (ratio) => {
  const [width, height] = String(ratio || "1:1").split(":").map(Number);
  return width > 0 && height > 0 ? [width, height] : [1, 1];
};

export function resolveFluxDimensions(parameters = {}, references = []) {
  const longestEdge = Number(parameters.resolution || 1024);
  const source = parameters.size_mode !== "custom"
    ? references.find((reference) => reference.role === "image" && reference.asset?.width && reference.asset?.height)?.asset
    : null;
  const [sourceWidth, sourceHeight] = source
    ? [Number(source.width), Number(source.height)]
    : ratioDimensions(parameters.aspect_ratio);
  const scale = longestEdge / Math.max(sourceWidth, sourceHeight);
  return {
    width: Math.max(64, Math.round((sourceWidth * scale) / 16) * 16),
    height: Math.max(64, Math.round((sourceHeight * scale) / 16) * 16),
  };
}

const ltxResolutionEdge = (value) => ({
  "480p": 480,
  "720p": 720,
  "1080p": 1080,
  "2K": 1440,
  "4K": 2160,
}[String(value || "480p")] || 480);

const roundVideoDimension = (value) => Math.max(32, Math.floor(value / 32) * 32);

const ltxRatioMeta = {
  auto: { label: "Auto", name: "Image size", ratio: "auto", preview: [3, 2] },
  "2:3": { label: "2:3", name: "Tall", ratio: "2:3", preview: [2, 3] },
  "3:2": { label: "3:2", name: "Wide", ratio: "3:2", preview: [3, 2] },
  "1:1": { label: "1:1", name: "Square", ratio: "1:1", preview: [1, 1] },
  "9:16": { label: "9:16", name: "Vertical", ratio: "9:16", preview: [9, 16] },
  "16:9": { label: "16:9", name: "Widescreen", ratio: "16:9", preview: [16, 9] },
};

export function resolveLtxDimensions(parameters = {}, references = []) {
  const longestEdge = ltxResolutionEdge(parameters.resolution);
  const source = parameters.aspect_ratio === "auto" || !parameters.aspect_ratio
    ? references.find((reference) => reference.role === "start_image" && reference.asset?.width && reference.asset?.height)?.asset
    : null;
  const [sourceWidth, sourceHeight] = source
    ? [Number(source.width), Number(source.height)]
    : ratioDimensions(parameters.aspect_ratio === "auto" ? "16:9" : parameters.aspect_ratio);
  const shortEdge = roundVideoDimension(longestEdge);
  if (sourceWidth <= sourceHeight) {
    return { width: shortEdge, height: roundVideoDimension(shortEdge * sourceHeight / sourceWidth) };
  }
  return { width: roundVideoDimension(shortEdge * sourceWidth / sourceHeight), height: shortEdge };
}

function Field({ definition, value, onChange, choices = [] }) {
  if (definition.type === "enum") return <label className="field"><span>{definition.label}</span><select value={value} onChange={(event) => onChange(optionValue(definition, event.target.value))}>{definition.options.map((option) => <option key={option} value={option}>{definition.control === "size_mode" ? String(option).replace(/^./, (letter) => letter.toUpperCase()) : option}</option>)}</select><small>{definition.help}</small></label>;
  if (definition.type === "boolean") return <label className="toggle-field"><span>{definition.label}</span><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)}/></label>;
  if (definition.type === "string" && choices.length) return <label className="field"><span>{definition.label}</span><select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>{choices.map((option) => <option key={option} value={option}>{option}</option>)}</select><small>{definition.help}</small></label>;
  if (definition.type === "string") return <label className="field"><span>{definition.label}</span><input type="text" value={value ?? ""} onChange={(event) => onChange(event.target.value)}/><small>{definition.help}</small></label>;
  return <label className="field"><span>{definition.label}</span><input type="number" min={definition.minimum} max={definition.maximum} step={definition.step || 1} value={value} onChange={(event) => onChange(definition.type === "integer" ? Number.parseInt(event.target.value, 10) : Number.parseFloat(event.target.value))}/><small>{definition.help}</small></label>;
}

function LtxQuickControls({ parameters, setParameters, dimensions }) {
  const [ratioOpen, setRatioOpen] = useState(false);
  const setValue = (id, value) => setParameters({ ...parameters, [id]: value });
  const selectedRatio = ltxRatioMeta[parameters.aspect_ratio || "auto"] || ltxRatioMeta.auto;
  return <>
    <div className="segmented-pills" aria-label="Resolution">
      {["480p", "720p", "1080p", "2K", "4K"].map((option) => <button key={option} className={parameters.resolution === option ? "selected" : ""} onClick={() => setValue("resolution", option)}>{option}</button>)}
    </div>
    <div className="segmented-pills compact" aria-label="Duration">
      {[6, 10].map((option) => <button key={option} className={Number(parameters.duration_seconds) === option ? "selected" : ""} onClick={() => setValue("duration_seconds", option)}>{option}s</button>)}
    </div>
    <button className={`audio-pill ${parameters.audio_enabled === false ? "muted" : ""}`} onClick={() => setValue("audio_enabled", parameters.audio_enabled === false)} aria-label={parameters.audio_enabled === false ? "Enable audio" : "Disable audio"}>{parameters.audio_enabled === false ? "No audio" : "Audio"}</button>
    <div className="ratio-control">
      <button className="ratio-trigger" onClick={() => setRatioOpen(!ratioOpen)} aria-expanded={ratioOpen} aria-label={`Aspect ratio ${selectedRatio.label}`}><span/>{selectedRatio.label}</button>
      {ratioOpen && <div className="ratio-popover" role="listbox" aria-label="Choose aspect ratio">
        <div className="ratio-preview-card"><div style={{ aspectRatio: `${selectedRatio.preview[0]} / ${selectedRatio.preview[1]}` }}/><span>{selectedRatio.name}</span><small>{dimensions.width} × {dimensions.height}</small></div>
        <div className="ratio-options">{Object.entries(ltxRatioMeta).map(([value, meta]) => <button key={value} className={value === (parameters.aspect_ratio || "auto") ? "selected" : ""} role="option" aria-selected={value === (parameters.aspect_ratio || "auto")} onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue("aspect_ratio", value); setRatioOpen(false); }}><strong>{meta.label}</strong><span>{meta.name}</span>{value === (parameters.aspect_ratio || "auto") && <em>✓</em>}</button>)}</div>
      </div>}
    </div>
  </>;
}

function ReferenceTray({ definitions, references, onChange, onError, onInsert }) {
  const inputs = useRef({});
  const [uploading, setUploading] = useState(false);
  const add = async (definition, files) => {
    const room = definition.multiplicity.maximum - references.filter((item) => item.role === definition.role).length;
    if (room <= 0) return onError(`${definition.label} accepts at most ${definition.multiplicity.maximum} file(s).`);
    setUploading(true);
    try {
      const added = [];
      for (const file of [...files].slice(0, room)) {
        if (definition.accepted_media.length && !definition.accepted_media.some((accepted) => file.type.startsWith(accepted.replace("*", "")))) throw new Error(`Unsupported file type: ${file.type || file.name}`);
        const asset = await studioApi.upload(file);
        const highestNumber = references.reduce((highest, item) => Math.max(highest, Number.parseInt(String(item.name || "").replace(/\D/g, ""), 10) || 0), 0);
        added.push({ asset_id: asset.id, role: definition.role, asset, name: `Image ${highestNumber + added.length + 1}` });
      }
      onChange([...references, ...added]);
    } catch (reason) { onError(reason.message); } finally { setUploading(false); if (inputs.current[definition.id]) inputs.current[definition.id].value = ""; }
  };
  return <div className="reference-tray" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); add(definitions[0], event.dataTransfer.files); }}>
    {references.map((reference, index) => <div className="reference-tile" key={reference.asset_id}><button className="reference-preview" onMouseDown={(event) => event.preventDefault()} onClick={() => onInsert?.(reference)} aria-label={`Mention ${reference.name || `Image ${index + 1}`}`}><img src={previewUrl(reference.asset)} alt={reference.asset.filename} loading="lazy" decoding="async"/><span>{reference.name || `Image ${index + 1}`}</span></button><button className="remove-reference" onClick={() => onChange(references.filter((item) => item.asset_id !== reference.asset_id))} aria-label={`Remove ${reference.name || `Image ${index + 1}`}`}><Icon name="close" size={14}/></button></div>)}
    {definitions.map((definition) => <span className="reference-input" key={definition.id}>
      <button className="add-reference" onClick={() => inputs.current[definition.id]?.click()} disabled={uploading || references.filter((item) => item.role === definition.role).length >= definition.multiplicity.maximum}><Icon name="image" size={18}/>{uploading ? "Uploading…" : `Add ${definition.label.toLowerCase()}`}</button>
      <input ref={(node) => { inputs.current[definition.id] = node; }} type="file" hidden accept={definition.accepted_media.join(",")} multiple={definition.multiplicity.maximum > 1} onChange={(event) => add(definition, event.target.files)}/>
    </span>)}
  </div>;
}

const tokenPattern = /(@Image \d+)/gi;
const tokenOnlyPattern = /^@Image \d+$/i;

function ReferencePromptEditor({ value, onChange, references, placeholder, onSubmit, insertRequest }) {
  const editor = useRef(null);
  const skipDomSync = useRef(false);
  const [mention, setMention] = useState(null);
  const [activeMention, setActiveMention] = useState(0);
  const namedReferences = references.map((reference, index) => ({ ...reference, name: reference.name || `Image ${index + 1}` }));
  const visibleReferences = mention
    ? namedReferences.filter((reference) => reference.name.toLowerCase().includes(mention.query.toLowerCase()))
    : [];

  const textFromEditor = useCallback(() => {
    const node = editor.current;
    if (!node) return value;
    let text = "";
    node.childNodes.forEach((child) => {
      text += child.nodeType === Node.ELEMENT_NODE && child.dataset?.token ? child.dataset.token : child.textContent || "";
    });
    return text.replace(/\u00a0/g, " ");
  }, [value]);

  const caretOffset = useCallback(() => {
    const node = editor.current;
    const selection = window.getSelection();
    if (!node || !selection?.rangeCount) return value.length;
    const range = selection.getRangeAt(0);
    if (!node.contains(range.startContainer)) return value.length;
    let offset = 0;
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    while (walk.nextNode()) {
      const current = walk.currentNode;
      if (current === range.startContainer) return offset + range.startOffset;
      if (current.nodeType === Node.ELEMENT_NODE && current.dataset?.token) {
        if (current === range.startContainer || current.contains(range.startContainer)) return offset;
        offset += current.dataset.token.length;
        continue;
      }
      if (current.nodeType === Node.TEXT_NODE && current.parentElement?.dataset?.token) continue;
      if (current.nodeType === Node.TEXT_NODE) offset += current.textContent.length;
    }
    return offset;
  }, [value.length]);

  const setCaret = useCallback((targetOffset) => {
    const node = editor.current;
    if (!node) return;
    const range = document.createRange();
    let remaining = targetOffset;
    for (const child of node.childNodes) {
      const token = child.nodeType === Node.ELEMENT_NODE ? child.dataset?.token : "";
      const text = token || child.textContent || "";
      if (remaining <= text.length) {
        if (token) remaining <= 0 ? range.setStartBefore(child) : range.setStartAfter(child);
        else range.setStart(child, remaining);
        range.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= text.length;
    }
    range.selectNodeContents(node);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const syncMention = useCallback((text = textFromEditor(), cursor = caretOffset()) => {
    const start = text.lastIndexOf("@", cursor);
    if (!references.length || start < 0) return setMention(null);
    const query = text.slice(start + 1, cursor);
    const active = text.slice(start, cursor);
    if (query.includes("\n") || query.length > 24 || /\s/.test(query) || tokenOnlyPattern.test(active)) return setMention(null);
    const selectedRange = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0) : null;
    let rect = selectedRange?.getBoundingClientRect ? selectedRange.getBoundingClientRect() : null;
    if (selectedRange && (!rect || (rect.left === 0 && rect.top === 0 && rect.width === 0 && rect.height === 0))) {
      const marker = document.createElement("span");
      marker.textContent = "\u200b";
      const probe = selectedRange.cloneRange();
      probe.insertNode(marker);
      rect = marker.getBoundingClientRect();
      marker.remove();
      setCaret(cursor);
    }
    const host = editor.current?.getBoundingClientRect();
    setActiveMention(0);
    setMention({
      start,
      end: cursor,
      query,
      x: rect && host ? Math.min(Math.max(rect.left - host.left, 0), Math.max(host.width - 240, 0)) : 4,
      y: rect && host ? Math.min(rect.bottom - host.top + 8, host.height - 8) : 44,
    });
  }, [caretOffset, references.length, textFromEditor]);

  const renderEditorValue = useCallback((nextValue) => {
    const node = editor.current;
    if (!node) return;
    node.replaceChildren();
    nextValue.split(tokenPattern).forEach((part) => {
      if (!part) return;
      if (tokenOnlyPattern.test(part)) {
        const token = document.createElement("span");
        token.className = "prompt-token";
        token.contentEditable = "false";
        token.dataset.token = part;
        token.textContent = part;
        node.appendChild(token);
      } else {
        node.appendChild(document.createTextNode(part));
      }
    });
  }, []);

  useLayoutEffect(() => {
    if (skipDomSync.current) {
      skipDomSync.current = false;
      return;
    }
    const cursor = caretOffset();
    renderEditorValue(value);
    setCaret(Math.min(cursor, value.length));
  }, [caretOffset, renderEditorValue, setCaret, value]);

  const commitValue = () => {
    const next = textFromEditor();
    skipDomSync.current = true;
    onChange(next);
    syncMention(next, caretOffset());
  };

  const insert = (reference) => {
    const text = textFromEditor();
    const cursor = caretOffset();
    const start = mention?.start ?? cursor;
    const name = reference.name || "Image";
    const next = `${text.slice(0, start)}@${name} ${text.slice(cursor)}`;
    onChange(next);
    setMention(null);
    requestAnimationFrame(() => {
      renderEditorValue(next);
      editor.current?.focus();
      setCaret(start + name.length + 2);
    });
  };

  useEffect(() => {
    if (insertRequest?.reference) insert(insertRequest.reference);
  }, [insertRequest?.sequence]);

  return <div className="prompt-editor">
    <div
      ref={editor}
      className="prompt-rich-input"
      contentEditable
      role="textbox"
      aria-label="Prompt"
      aria-multiline="true"
      data-placeholder={placeholder}
      data-empty={!value}
      onInput={commitValue}
      onClick={() => syncMention()}
      onKeyUp={(event) => {
        if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) syncMention();
      }}
      onKeyDown={(event) => {
        if (mention && ["ArrowDown", "ArrowUp", "Enter", "Tab"].includes(event.key)) {
          event.preventDefault();
          if (event.key === "ArrowDown") setActiveMention((index) => Math.min(index + 1, visibleReferences.length - 1));
          if (event.key === "ArrowUp") setActiveMention((index) => Math.max(index - 1, 0));
          if ((event.key === "Enter" || event.key === "Tab") && visibleReferences[activeMention]) insert(visibleReferences[activeMention]);
          return;
        }
        if (event.key === "Escape") setMention(null);
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSubmit();
      }}
    />
    {mention && visibleReferences.length > 0 && <div className="mention-menu" role="listbox" aria-label="Reference images" style={{ left: mention.x, top: mention.y }}>{visibleReferences.map((reference, index) => <button key={reference.asset_id} className={index === activeMention ? "active" : ""} role="option" aria-selected={index === activeMention} onMouseDown={(event) => { event.preventDefault(); insert(reference); }}><img src={previewUrl(reference.asset)} alt="" loading="lazy" decoding="async"/><span>{reference.name}</span></button>)}</div>}
  </div>;
}

export function Composer({ workflows, models = [], runtime = null, session, initial, onGenerated, onError }) {
  const [workflowId, setWorkflowId] = useState(initial?.workflow_id || "");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [parameters, setParameters] = useState({});
  const [picker, setPicker] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [references, setReferences] = useState([]);
  const [insertRequest, setInsertRequest] = useState(null);
  const [parentGenerationId, setParentGenerationId] = useState("");
  const sequence = useRef(0);

  useEffect(() => {
    if (!workflowId && workflows[0]) setWorkflowId(workflows[0].id);
  }, [workflowId, workflows]);
  const workflow = workflows.find((item) => item.id === workflowId) || workflows[0];
  useEffect(() => {
    if (workflow) { setParameters(workflow.defaults); setReferences([]); setNegativePrompt(""); }
  }, [workflow?.id]);
  useEffect(() => {
    if (initial && initial.sequence !== sequence.current) {
      sequence.current = initial.sequence;
      setWorkflowId(initial.workflow_id);
      setPrompt(initial.prompt);
      setNegativePrompt(initial.negative_prompt || "");
      setParameters(initial.parameters || {});
      setParentGenerationId(initial.id || "");
    }
  }, [initial]);
  const quick = workflow?.parameters.filter((item) => item.section === "quick") || [];
  const detail = workflow?.parameters.filter((item) => item.section === "advanced") || [];
  const isFluxKlein = workflow?.id === "flux2-klein-9b";
  const isLtxVideo = workflow?.id === "ltx-video";
  const supportsReferenceMentions = Boolean(workflow?.capabilities?.includes("reference_mentions") || isFluxKlein);
  const fluxSize = isFluxKlein ? resolveFluxDimensions(parameters, references) : null;
  const fluxAutoSource = isFluxKlein && parameters.size_mode !== "custom" && references.some((reference) => reference.role === "image");
  const ltxSize = isLtxVideo ? resolveLtxDimensions(parameters, references) : null;
  const ltxAutoSource = isLtxVideo && (parameters.aspect_ratio || "auto") === "auto" && references.some((reference) => reference.role === "start_image" && reference.asset?.width && reference.asset?.height);
  const promptInput = useRef(null);
  const referenceDefinitions = workflow?.inputs.filter((item) => item.type === "asset") || [];
  const negative = workflow?.inputs.find((item) => item.id === "negative_prompt");
  const promptRequired = workflow?.inputs.find((item) => item.id === "prompt")?.required !== false;
  const referencesReady = referenceDefinitions.every((definition) => references.filter((item) => item.role === definition.role).length >= definition.multiplicity.minimum);
  const workflowStatus = runtime?.workflows?.find((item) => item.workflow_id === workflow?.id);
  const executable = runtime ? Boolean(runtime.configured && workflowStatus?.ready !== false) : true;
  const canSubmit = Boolean(workflow && session && executable && referencesReady && (!promptRequired || prompt.trim()));
  const choicesFor = (definition) => {
    if (!["model", "lora"].includes(definition.control)) return [];
    const allowedKinds = definition.control === "lora" ? new Set(["loras"]) : new Set(["checkpoints", "diffusion_models", "unet"]);
    const familyAliases = {
      "qwen-image-edit": ["qwen-image-edit"],
      "flux2-klein": ["flux-klein"],
      "ltx-video": ["ltx-video"],
      "z-image-turbo": ["z-image"],
      reactor: ["reactor"],
    }[workflow?.model_family] || [workflow?.model_family].filter(Boolean);
    const compatible = models.filter((item) => allowedKinds.has(String(item.kind).toLowerCase()) && item.model_families?.some((family) => familyAliases.includes(family))).map((item) => item.name);
    return [...new Set([definition.default, ...compatible].filter(Boolean))];
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); onError("");
    try {
      const submittedParameters = isFluxKlein
        ? { ...parameters, width: fluxSize.width, height: fluxSize.height }
        : isLtxVideo
          ? { ...parameters, width: ltxSize.width, height: ltxSize.height }
          : parameters;
      const generation = await studioApi.generate({ session_id: session.id, workflow_id: workflow.id, prompt: prompt.trim(), negative_prompt: negativePrompt.trim(), parameters: submittedParameters, references: references.map(({ asset_id, role }) => ({ asset_id, role })), parent_generation_id: parentGenerationId, operation: parentGenerationId ? "remix" : "generate" });
      onGenerated(generation);
    } catch (reason) { onError(reason.message); } finally { setSubmitting(false); }
  };
  const insertReferenceMention = (reference) => setInsertRequest({ reference, sequence: Date.now() });

  return <div className="composer-wrap">
    <section className="composer" aria-label="Generation composer">
      <div className="composer-top"><div className="composer-context"><div className="mode-tabs"><button className="selected"><Icon name={workflow?.category === "video" ? "play" : "image"} size={18}/>{workflow?.category === "video" ? "Video" : workflow?.capabilities?.includes("image_edit") ? "Edit" : "Image"}</button></div><span className={`workflow-state ${executable ? "ready" : "blocked"}`}><i/>{executable ? "Ready" : "Needs setup"}</span></div><button className="workflow-trigger" onClick={() => setPicker(!picker)}><Icon name="workflow" size={18}/>{workflow?.display_name || "Choose workflow"}<Icon name="chevron" size={16}/></button></div>
      {!executable && <div className="preflight-warning"><Icon name="help" size={17}/><span><strong>This workflow is not ready.</strong>{workflowStatus?.issues?.[0]?.message || runtime?.message || "Connect a generation runtime before continuing."}</span></div>}
      {supportsReferenceMentions ? <ReferencePromptEditor value={prompt} onChange={setPrompt} references={references} onSubmit={submit} insertRequest={insertRequest} placeholder={references.length ? "Describe the shot — type @ to reference an image…" : workflow?.category === "video" ? "Describe the motion and add references…" : "Describe an image or add references…"}/> : <textarea ref={promptInput} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={workflow?.category === "video" ? "Describe the motion and shot…" : workflow?.capabilities?.includes("image_edit") ? "Describe the edit…" : "Describe an image…"} aria-label="Prompt" onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit(); }}/>} 
      {referenceDefinitions.length > 0 && <ReferenceTray definitions={referenceDefinitions} references={references} onChange={setReferences} onError={onError} onInsert={supportsReferenceMentions ? insertReferenceMention : undefined}/>} 
      <div className="composer-bottom">
        <span className="composer-spacer" aria-hidden="true"/>
        <div className="quick-controls">{isLtxVideo ? <LtxQuickControls parameters={parameters} setParameters={setParameters} dimensions={ltxSize}/> : quick.map((definition) => <label className="quick-select" key={definition.id}><span className="sr-only">{definition.label}</span><select value={parameters[definition.id] ?? definition.default} onChange={(event) => setParameters({ ...parameters, [definition.id]: definition.options?.length ? optionValue(definition, event.target.value) : definition.type === "integer" ? Number(event.target.value) : event.target.value })}>{definition.options?.length ? definition.options.map((option) => <option key={option} value={option}>{option}</option>) : Array.from({ length: (definition.maximum || 1) - (definition.minimum || 1) + 1 }, (_, index) => index + (definition.minimum || 1)).map((option) => <option key={option} value={option}>{option} {definition.id === "output_count" ? (option === 1 ? "output" : "outputs") : ""}</option>)}</select></label>)}
          {isFluxKlein && <button className="size-pill" onClick={() => setAdvanced(true)} aria-label={`Output size ${fluxSize.width} by ${fluxSize.height}`}><Icon name="image" size={15}/><span>{parameters.size_mode === "custom" ? "Custom" : "Auto"}</span><b>{fluxSize.width}×{fluxSize.height}</b></button>}
          <button className={`icon-button settings-trigger ${advanced ? "active" : ""}`} onClick={() => setAdvanced(!advanced)} aria-label="Advanced settings"><Icon name="sliders"/></button>
          <button className="generate-button" onClick={submit} disabled={!canSubmit || submitting}><Icon name="sparkle" size={18}/>{submitting ? "Queueing…" : "Generate"}</button>
        </div>
      </div>
      {picker && <WorkflowPicker workflows={workflows} value={workflowId} onChange={setWorkflowId} onClose={() => setPicker(false)}/>} 
    </section>
    {advanced && <aside className="advanced-panel">
      <div className="panel-heading"><div><span>Advanced settings</span><strong>{workflow?.display_name}</strong></div><button className="icon-button" onClick={() => setAdvanced(false)} aria-label="Close advanced settings"><Icon name="close"/></button></div>
      {isFluxKlein && <div className="auto-size-card"><div><Icon name="image" size={17}/><span><strong>{fluxSize.width} × {fluxSize.height}</strong><small>{fluxAutoSource ? "Matched to your edit image" : parameters.size_mode === "custom" ? "Custom canvas" : "Automatic canvas"}</small></span></div><em>{parameters.size_mode === "custom" ? parameters.aspect_ratio : fluxAutoSource ? "Source ratio" : parameters.aspect_ratio}</em></div>}
      {isLtxVideo && <div className="auto-size-card"><div><Icon name="image" size={17}/><span><strong>{ltxSize.width} × {ltxSize.height}</strong><small>{ltxAutoSource ? "Matched to the first reference image" : parameters.aspect_ratio === "auto" ? "Automatic video canvas" : "Selected video ratio"}</small></span></div><em>{parameters.aspect_ratio === "auto" ? "Auto" : parameters.aspect_ratio}</em></div>}
      {negative && <label className="field"><span>{negative.label}</span><textarea value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} placeholder="What should the model avoid?"/><small>{negative.help}</small></label>}
      {detail.filter((definition) => !(isFluxKlein && definition.id === "aspect_ratio" && parameters.size_mode !== "custom")).map((definition) => <Field key={definition.id} definition={definition} value={parameters[definition.id] ?? definition.default} choices={choicesFor(definition)} onChange={(value) => setParameters({ ...parameters, [definition.id]: value })}/>)}
      <button className="reset-button" onClick={() => { setParameters(workflow.defaults); setNegativePrompt(""); }}>Reset to defaults</button>
    </aside>}
  </div>;
}

function QueueDrawer({ jobs, onClose, onCancel }) {
  return <aside className="drawer queue-drawer">
    <div className="panel-heading"><div><span>Queue</span><strong>{jobs.length ? `${jobs.length} active` : "All clear"}</strong></div><button className="icon-button" onClick={onClose} aria-label="Close queue"><Icon name="close"/></button></div>
    {!jobs.length ? <div className="drawer-empty"><Icon name="queue" size={28}/><strong>No active generations</strong><span>New jobs will appear here.</span></div> : jobs.map((job, index) => <article className="queue-job" key={job.id}><span className="queue-index">{index + 1}</span><div><strong>{job.phase}</strong><p>{job.prompt}</p><small>{job.workflow_id}</small></div><button onClick={() => onCancel(job.id)}>Cancel</button></article>)}
  </aside>;
}

function Viewer({ asset, generation, onClose, onFavorite }) {
  if (!asset) return null;
  return <div className="viewer" role="dialog" aria-modal="true" aria-label="Generation detail">
    <div className="viewer-bar"><button className="viewer-back" onClick={onClose}><Icon name="back"/>Back to session</button><div><button className="icon-button" onClick={() => onFavorite(asset)} aria-label="Favorite"><Icon name="heart"/></button><a className="icon-button" href={asset.content_url} download={asset.filename} aria-label="Download"><Icon name="download"/></a><button className="icon-button" aria-label="More actions"><Icon name="more"/></button></div></div>
    <div className="viewer-body"><div className="viewer-stage">{asset.media_type === "video" ? <video src={asset.content_url} controls autoPlay/> : <img src={asset.content_url} alt={generation?.prompt || asset.filename}/>}</div><aside><span>Generation details</span><h2>{generation?.prompt}</h2><dl><div><dt>Workflow</dt><dd>{generation?.workflow_id}</dd></div><div><dt>Seed</dt><dd>{generation?.seed}</dd></div>{asset.media_type === "image" && <div><dt>Size</dt><dd>{asset.width} × {asset.height}</dd></div>}<div><dt>Created</dt><dd>{new Date(asset.created_at).toLocaleString()}</dd></div></dl></aside></div>
  </div>;
}

function Library({ library, onView, onFavorite, onRefresh }) {
  const [favorites, setFavorites] = useState(false);
  useEffect(() => { onRefresh(favorites ? "?favorites=true" : ""); }, [favorites, onRefresh]);
  return <div className="library-page"><div className="page-heading"><div><h1>Library</h1><p>Everything you create in Studio, in one place.</p></div><button className={`filter-button ${favorites ? "active" : ""}`} onClick={() => setFavorites(!favorites)}><Icon name="heart" size={17}/>Favorites</button></div>
    {!library.items.length ? <div className="library-empty"><Icon name="image" size={34}/><h2>{favorites ? "No favorites yet" : "Your library is ready"}</h2><p>{favorites ? "Favorite an output to keep it close." : "Completed generations will collect here automatically."}</p></div> : <div className="library-grid">{library.items.map((asset) => <article key={asset.id}><button onClick={() => onView(asset, null)}><img src={previewUrl(asset)} alt={asset.filename} loading="lazy" decoding="async"/></button><div><span>{asset.metadata.workflow_id || "Studio output"}</span><button onClick={() => onFavorite(asset)} aria-label={asset.favorite ? "Remove favorite" : "Favorite"}><Icon name="heart" className={asset.favorite ? "filled" : ""}/></button></div></article>)}</div>}
  </div>;
}

function PlaceholderPage({ name, icon }) { return <div className="placeholder-page"><Icon name={icon} size={36}/><h1>{name}</h1><p>This space is capability-gated and ready for its first connected source.</p></div>; }

const workflowKinds = [
  { id: "all", label: "All" },
  { id: "image", label: "Image" },
  { id: "edit", label: "Edit" },
  { id: "video", label: "Video" },
  { id: "controlnet", label: "ControlNet" },
  { id: "face_swap", label: "Face swap" },
];

const supportsKind = (workflow, kind) => {
  if (kind === "all") return true;
  if (kind === "image") return workflow.category === "image";
  if (kind === "edit") return workflow.capabilities?.includes("image_edit");
  if (kind === "video") return workflow.category === "video";
  return workflow.capabilities?.includes(kind);
};

export function WorkflowsPage({ workflows, models, runtime, workspace, onUse }) {
  const [kind, setKind] = useState("all");
  const visible = workflows.filter((workflow) => supportsKind(workflow, kind));
  const installed = models.filter((model) => model.status === "installed").length;
  const partials = workspace?.partial_download_count || models.filter((model) => model.status !== "installed").length;
  const readiness = new Map((runtime?.workflows || []).map((item) => [item.workflow_id, item]));
  const statusFor = (workflow) => readiness.get(workflow.id) || { ready: runtime?.configured !== false, issues: [] };
  const readyCount = workflows.filter((workflow) => statusFor(workflow).ready).length;
  return <div className="workflows-page">
    <div className="page-heading"><div><h1>Workflows</h1><p>Choose a production image or video generation tool.</p></div><button className="primary-page-action" onClick={() => onUse(workflows[0])}><Icon name="create" size={17}/>Create now</button></div>
    <section className="runtime-overview" aria-label="Production generation readiness">
      <div className={runtime?.configured ? "ready" : "offline"}><span className="status-orb"><i/></span><span><small>{runtime?.provider === "modal_comfyui" ? "Modal runtime" : "Local development"}</small><strong>{runtime?.configured ? "Ready" : "Offline"}</strong></span><em>{runtime?.gpu_type ? `${runtime.gpu_type} · production workspace` : runtime?.base_url || "Connect Modal to generate"}</em></div>
      <div><Icon name="workflow"/><span><small>Executable tools</small><strong>{readyCount}/{workflows.length} ready</strong></span><em>{runtime?.node_count ? `${runtime.node_count.toLocaleString()} nodes discovered` : "Checking nodes"}</em></div>
      <div><Icon name="image"/><span><small>Model library</small><strong>{installed} installed</strong></span><em>{partials ? `${partials} partial downloads can resume` : "All downloads complete"}</em></div>
      <div className={runtime?.reactor_available ? "ready" : "offline"}><Icon name="sparkle"/><span><small>Face swap</small><strong>{runtime?.reactor_available ? "ReActor ready" : "ReActor unavailable"}</strong></span><em>{runtime?.provider === "modal_comfyui" ? "Modified source deployed to Modal" : workspace?.reactor?.version ? `Development ${workspace.reactor.version}` : "Development node unavailable"}</em></div>
    </section>
    <div className="workflow-filters" role="toolbar" aria-label="Filter workflows">{workflowKinds.map((item) => <button key={item.id} className={kind === item.id ? "active" : ""} onClick={() => setKind(item.id)}>{item.label}<span>{workflows.filter((workflow) => supportsKind(workflow, item.id)).length}</span></button>)}</div>
    <section className="workflow-list" aria-live="polite">
      {visible.map((workflow) => {
        const assets = workflow.inputs?.filter((input) => input.type === "asset") || [];
        const status = statusFor(workflow);
        return <article className={`workflow-row ${status.ready ? "is-ready" : "needs-setup"}`} key={workflow.id}>
          <span className="workflow-row-icon"><Icon name={workflow.category === "video" ? "play" : workflow.ui?.icon || "image"}/></span>
          <div className="workflow-row-copy"><div><h2>{workflow.display_name}</h2>{workflow.ui?.recommended && <b>Recommended</b>}<span>{workflow.category}</span><em className={status.ready ? "ready" : "blocked"}><i/>{status.ready ? "Ready" : "Needs setup"}</em></div><p>{status.ready ? workflow.description : status.issues?.[0]?.message || workflow.description}</p><small>{workflow.model_family} · {workflow.ui?.speed || "Local"} · {workflow.ui?.quality || "Production"}</small></div>
          <div className="capability-list">{workflow.capabilities?.slice(0, 4).map((capability) => <span key={capability}>{capability.replaceAll("_", " ")}</span>)}{assets.length > 0 && <span>{assets.length} reference {assets.length === 1 ? "input" : "inputs"}</span>}</div>
          <button className="use-workflow" disabled={!status.ready} onClick={() => onUse(workflow)}>{status.ready ? "Use workflow" : "Needs setup"}<Icon name="chevron" size={15}/></button>
        </article>;
      })}
      {!visible.length && <div className="workflow-empty"><Icon name="workflow" size={28}/><strong>No matching workflows</strong><span>This capability will appear as soon as a healthy manifest is added.</span></div>}
    </section>
  </div>;
}

export function ProviderSettings({ onModelsChanged = noop }) {
  const [providers, setProviders] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [downloads, setDownloads] = useState([]);
  const [models, setModels] = useState([]);
  const completedDownloads = useRef(new Set());
  const [downloadForm, setDownloadForm] = useState({ provider: "huggingface", source_url: "", destination_kind: "loras", filename: "", model_family: "ltx-video", trigger_words: "", recommended_strength: 1, notes: "" });
  useEffect(() => { studioApi.providerSettings().then((data) => setProviders(data.providers)).catch((error) => setMessage(error.message)); }, []);
  const refreshModels = useCallback(() => studioApi.models().then((data) => setModels(data.items || [])).catch((error) => setMessage(error.message)), []);
  useEffect(() => { refreshModels(); }, [refreshModels]);
  useEffect(() => {
    let alive = true;
    const refresh = () => studioApi.modelDownloads().then((data) => {
      if (!alive) return;
      setDownloads(data.jobs);
      const newlyCompleted = data.jobs.filter((job) => job.status === "completed" && !completedDownloads.current.has(job.id));
      if (newlyCompleted.length) {
        newlyCompleted.forEach((job) => completedDownloads.current.add(job.id));
        refreshModels();
        onModelsChanged();
      }
    }).catch((error) => { if (alive) setMessage(error.message); });
    refresh(); const timer = window.setInterval(refresh, 1800);
    return () => { alive = false; window.clearInterval(timer); };
  }, [onModelsChanged, refreshModels]);
  const save = async (provider) => {
    const value = String(drafts[provider.id] || "").trim();
    if (!value) return setMessage(`Enter a ${provider.name} API key first.`);
    setBusy(provider.id); setMessage("");
    try {
      const updated = await studioApi.saveProviderKey(provider.id, value);
      setProviders((current) => current.map((item) => item.id === provider.id ? updated : item));
      setDrafts((current) => ({ ...current, [provider.id]: "" }));
      setMessage(`${provider.name} key saved to the system credential vault.`);
    } catch (error) { setMessage(error.message); } finally { setBusy(""); }
  };
  const remove = async (provider) => {
    setBusy(provider.id); setMessage("");
    try {
      const updated = await studioApi.removeProviderKey(provider.id);
      setProviders((current) => current.map((item) => item.id === provider.id ? updated : item));
      setMessage(`${provider.name} key removed.`);
    } catch (error) { setMessage(error.message); } finally { setBusy(""); }
  };
  const startDownload = async () => {
    if (!downloadForm.source_url.trim()) return setMessage("Paste a model file or model-version URL first.");
    if (!downloadForm.filename.trim()) return setMessage("Enter the exact filename to use in the Modal model volume.");
    setBusy("download"); setMessage("");
    try {
      const metadata = {
        model_families: downloadForm.model_family ? [downloadForm.model_family] : [],
        trigger_words: downloadForm.trigger_words.split(",").map((item) => item.trim()).filter(Boolean),
        recommended_strength: Number(downloadForm.recommended_strength || 1),
        notes: downloadForm.notes.trim(),
      };
      const created = await studioApi.startModelDownload({ ...downloadForm, source_url: downloadForm.source_url.trim(), filename: downloadForm.filename.trim(), metadata });
      setDownloads((current) => [created, ...current]);
      setDownloadForm((current) => ({ ...current, source_url: "", filename: "", trigger_words: "", notes: "" }));
    } catch (error) { setMessage(error.message); } finally { setBusy(""); }
  };
  const downloadAction = async (job, action) => {
    try {
      const updated = action === "cancel" ? await studioApi.cancelModelDownload(job.id) : await studioApi.retryModelDownload(job.id);
      setDownloads((current) => current.map((item) => item.id === job.id ? updated : item));
    } catch (error) { setMessage(error.message); }
  };
  const loras = models.filter((model) => String(model.kind).toLowerCase() === "loras");
  const prepareLoraDownload = () => {
    setDownloadForm({ ...downloadForm, provider: "civitai", destination_kind: "loras", model_family: "ltx-video", filename: "", source_url: "", recommended_strength: 1 });
    setMessage("LoRA download form is ready. Paste a Civitai or Hugging Face LoRA file URL.");
  };
  return <div className="settings-page">
    <div className="page-heading"><div><h1>Settings</h1><p>Connect model sources and manage RenderLab production resources.</p></div></div>
    <section className="settings-section"><div className="settings-intro"><h2>Model providers</h2><p>Keys stay in your operating system credential vault. Studio only reports whether each provider is connected.</p></div>
      <div className="provider-list">{providers.map((provider) => <article className="provider-row" key={provider.id}>
        <div><strong>{provider.name}</strong><span className={provider.configured ? "connected" : ""}>{provider.configured ? `Connected via ${provider.source === "environment" ? "environment" : "credential vault"}` : "Not connected"}</span></div>
        <label><span className="sr-only">{provider.name} API key</span><input type="password" autoComplete="off" value={drafts[provider.id] || ""} placeholder={provider.configured ? "Replace saved key" : "Paste API key"} onChange={(event) => setDrafts({ ...drafts, [provider.id]: event.target.value })}/></label>
        <button className="settings-save" disabled={busy === provider.id} onClick={() => save(provider)}>{busy === provider.id ? "Saving…" : "Save key"}</button>
        {provider.configured && provider.source !== "environment" ? <button className="settings-remove" disabled={busy === provider.id} onClick={() => remove(provider)}>Remove</button> : null}
      </article>)}</div>
      {message && <p className="settings-message" role="status">{message}</p>}
    </section>
    <section className="settings-section download-section"><div className="settings-intro"><h2>Modal model volume</h2><p>Paste a Hugging Face file URL or Civitai model-version URL. Modal downloads it directly into the persistent production volume; no model bytes pass through this machine.</p></div>
      <div className="download-form">
        <label><span>Provider</span><select value={downloadForm.provider} onChange={(event) => setDownloadForm({ ...downloadForm, provider: event.target.value })}><option value="huggingface">Hugging Face</option><option value="civitai">Civitai</option></select></label>
        <label className="download-url"><span>Model URL</span><input value={downloadForm.source_url} placeholder={downloadForm.provider === "huggingface" ? "https://huggingface.co/owner/repo/blob/main/model.safetensors" : "https://civitai.com/models/…?modelVersionId=…"} onChange={(event) => setDownloadForm({ ...downloadForm, source_url: event.target.value })}/></label>
        <label><span>Destination</span><select value={downloadForm.destination_kind} onChange={(event) => setDownloadForm({ ...downloadForm, destination_kind: event.target.value })}><option value="checkpoints">Checkpoints</option><option value="diffusion_models">Diffusion models</option><option value="loras">LoRAs</option><option value="controlnet">ControlNet</option><option value="text_encoders">Text encoders</option><option value="vae">VAE</option><option value="model_patches">Model patches</option></select></label>
        <label><span>Filename</span><input value={downloadForm.filename} required placeholder="model.safetensors" onChange={(event) => setDownloadForm({ ...downloadForm, filename: event.target.value })}/></label>
        <label><span>Family metadata</span><select value={downloadForm.model_family} onChange={(event) => setDownloadForm({ ...downloadForm, model_family: event.target.value })}><option value="ltx-video">LTX Video</option><option value="flux-klein">FLUX Klein</option><option value="qwen-image-edit">Qwen Image Edit</option><option value="z-image">Z-Image</option></select></label>
        <label><span>Recommended strength</span><input type="number" min="-2" max="2" step="0.05" value={downloadForm.recommended_strength} onChange={(event) => setDownloadForm({ ...downloadForm, recommended_strength: event.target.value })}/></label>
        <label className="download-url"><span>Trigger words <em>comma separated</em></span><input value={downloadForm.trigger_words} placeholder="optional, e.g. paper cutout, cinematic" onChange={(event) => setDownloadForm({ ...downloadForm, trigger_words: event.target.value })}/></label>
        <label className="download-url"><span>Notes</span><input value={downloadForm.notes} placeholder="What this model/LoRA is best for" onChange={(event) => setDownloadForm({ ...downloadForm, notes: event.target.value })}/></label>
        <button className="settings-save download-button" disabled={busy === "download" || !downloadForm.filename.trim()} onClick={startDownload}>{busy === "download" ? "Starting…" : "Download to Modal"}</button>
      </div>
      <div className="download-list">{downloads.length ? downloads.map((job) => {
        const progress = job.bytes_total ? Math.min(100, Math.round(job.bytes_downloaded / job.bytes_total * 100)) : 0;
        const cancellable = job.status === "queued" || (job.runtime === "local" && ["running", "cancelling"].includes(job.status));
        return <article className="download-row" key={job.id}><div className="download-copy"><strong>{job.filename || "Resolving model file…"}</strong><span>{job.provider} · {job.destination_kind.replaceAll("_", " ")} · {job.runtime === "local" ? "development" : "Modal volume"}</span>{job.error ? <small>{job.error}</small> : null}</div><div className="download-progress"><span style={{ width: `${progress}%` }}/></div><b>{job.status === "running" && job.bytes_total ? `${progress}%` : job.status}</b>{cancellable ? <button onClick={() => downloadAction(job, "cancel")}>Cancel</button> : null}{["failed", "cancelled"].includes(job.status) ? <button onClick={() => downloadAction(job, "retry")}>Retry</button> : null}</article>;
      }) : <p className="downloads-empty">No model downloads started from Studio yet.</p>}</div>
    </section>
    <section className="settings-section lora-gallery-section"><div className="settings-intro"><h2>LoRA gallery</h2><p>Installed LoRAs from the Modal volume. Use metadata to keep LoRAs discoverable and compatible with generation workflows.</p></div>
      <div className="gallery-toolbar"><button className="primary-page-action" onClick={prepareLoraDownload}>Download LoRA</button><span>{loras.length} installed</span></div>
      <div className="lora-gallery">{loras.length ? loras.map((model) => {
        const metadata = model.metadata || {};
        const families = model.model_families?.length ? model.model_families : metadata.model_families || [];
        return <article className="lora-card" key={`${model.kind}-${model.name}`}>
          <div><strong>{model.name}</strong><span>{families.length ? families.join(" · ") : "Uncategorized"}</span></div>
          <p>{metadata.notes || "No notes configured yet."}</p>
          <footer><span>Strength {metadata.recommended_strength ?? 1}</span>{metadata.trigger_words?.length ? <em>{metadata.trigger_words.join(", ")}</em> : <em>No trigger words</em>}</footer>
        </article>;
      }) : <p className="downloads-empty">No LoRAs installed yet. Click Download LoRA to add one to the Modal volume.</p>}</div>
    </section>
  </div>;
}

export function StudioApp() {
  const studio = useStudio();
  const [page, setPage] = useState("create");
  const [queueOpen, setQueueOpen] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [reuse, setReuse] = useState(null);
  const rename = async (name) => studio.setSession({ ...studio.session, name: (await studioApi.renameSession(studio.session.id, name)).name });
  const selectSession = async (id) => studio.setSession(await studioApi.session(id));
  const newSession = async () => { const created = await studioApi.createSession(); studio.setSessions([created, ...studio.sessions]); studio.setSession({ ...created, generations: [] }); };
  const cancel = async (id) => { await studioApi.cancel(id); await studio.refreshSession(studio.session.id); };
  const favorite = async (asset) => { await studioApi.favorite(asset.id, !asset.favorite); await studio.refreshLibrary(); if (viewer) setViewer({ ...viewer, asset: { ...asset, favorite: !asset.favorite } }); };
  const generated = async () => { await studio.refreshSession(studio.session.id); };

  if (studio.loading) return <div className="boot-screen"><RenderLabMark/><span>Opening RenderLab…</span></div>;
  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage}/>
    <main className="workspace">
      <Topbar session={studio.session} sessions={studio.sessions} queue={studio.queue} runtime={studio.runtime} onQueue={() => setQueueOpen(true)} onRename={rename} onSelectSession={selectSession} onNewSession={newSession}/>
      {studio.error && <div className="error-banner" role="alert">{studio.error}<button onClick={() => studio.setError("")}><Icon name="close" size={16}/></button></div>}
      {page === "create" && <div className="create-page"><div className="feed">{studio.session?.generations?.length ? studio.session.generations.map((item) => <GenerationCard key={item.id} item={item} onReuse={(generation) => setReuse({ ...generation, sequence: Date.now() })} onView={(asset, generation) => setViewer({ asset, generation })} onCancel={cancel}/>) : <EmptyCanvas/>}</div><Composer workflows={studio.workflows} models={studio.models} runtime={studio.runtime} session={studio.session} initial={reuse} onGenerated={generated} onError={studio.setError}/></div>}
      {page === "library" && <Library library={studio.library} onView={(asset, generation) => setViewer({ asset, generation })} onFavorite={favorite} onRefresh={studio.refreshLibrary}/>} 
      {page === "projects" && <PlaceholderPage name="Projects" icon="folder"/>}
      {page === "workflows" && <WorkflowsPage workflows={studio.workflows} models={studio.models} runtime={studio.runtime} workspace={studio.comfyWorkspace} onUse={(workflow) => { if (!workflow) return; setReuse({ workflow_id: workflow.id, prompt: "", parameters: workflow.defaults, sequence: Date.now() }); setPage("create"); }}/>} 
      {page === "settings" && <ProviderSettings onModelsChanged={studio.refreshCapabilities}/>} 
    </main>
    {queueOpen && <><button className="scrim" onClick={() => setQueueOpen(false)} aria-label="Close queue"/><QueueDrawer jobs={studio.queue} onClose={() => setQueueOpen(false)} onCancel={cancel}/></>}
    {viewer && <Viewer {...viewer} onClose={() => setViewer(null)} onFavorite={favorite}/>} 
  </div>;
}
