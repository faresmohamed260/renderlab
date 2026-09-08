from pathlib import Path

OUT = Path("design/penpot")
OUT.mkdir(parents=True, exist_ok=True)

DEFS = r'''
  <defs>
    <radialGradient id="bg" cx="58%" cy="6%" r="90%"><stop offset="0" stop-color="#25194d"/><stop offset=".34" stop-color="#0c0b16"/><stop offset="1" stop-color="#06070a"/></radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".09"/><stop offset="1" stop-color="#ffffff" stop-opacity=".025"/></linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#aa8cff"/><stop offset=".54" stop-color="#717dff"/><stop offset="1" stop-color="#58d3ff"/></linearGradient>
    <linearGradient id="cyan" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#68dcff"/><stop offset="1" stop-color="#6f7cff"/></linearGradient>
    <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffba7a"/><stop offset="1" stop-color="#ff718a"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="20"/></filter>
    <filter id="soft"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity=".46"/></filter>
    <style>
      text{font-family:Inter,ui-sans-serif,system-ui,sans-serif;fill:#f7f7fb}.muted{fill:#9b9dae}.dim{fill:#6f7282}.title{font-size:30px;font-weight:650}.hero{font-size:56px;font-weight:680;letter-spacing:-.035em}.h2{font-size:22px;font-weight:640}.h3{font-size:16px;font-weight:650}.body{font-size:13px}.small{font-size:11px}.label{font-size:11px;font-weight:720;letter-spacing:.09em}.chip{font-size:11px;font-weight:640}.micro{font-size:9px;font-weight:630;letter-spacing:.06em}
    </style>
  </defs>
'''

def shell(width=1280, height=760, active=""):
    nav = [("Create", 96), ("Library", 142)]
    bottom = [("Activity", height-82), ("Settings", height-48)]
    s = [f'<rect width="{width}" height="{height}" rx="28" fill="url(#bg)" stroke="#fff" stroke-opacity=".10"/>',
         f'<ellipse cx="{width*0.58:.0f}" cy="58" rx="350" ry="105" fill="#7555ff" opacity=".10" filter="url(#glow)"/>',
         f'<rect x="18" y="18" width="176" height="{height-36}" rx="24" fill="url(#glass)" stroke="#fff" stroke-opacity=".10"/>',
         '<text x="40" y="58" class="label">RENDERLAB</text>']
    for label,y in nav:
        on = label.lower()==active.lower()
        if on:
            s.append(f'<rect x="32" y="{y-26}" width="148" height="42" rx="13" fill="#937cff" opacity=".16" stroke="#b69fff" stroke-opacity=".28"/>')
            s.append(f'<circle cx="46" cy="{y-5}" r="4" fill="#b79fff"/>')
        s.append(f'<text x="64" y="{y}" class="body {"" if on else "muted"}">{label}</text>')
    for label,y in bottom:
        on = label.lower()==active.lower()
        if on:
            s.append(f'<rect x="32" y="{y-27}" width="148" height="38" rx="12" fill="#937cff" opacity=".13"/>')
            s.append(f'<circle cx="46" cy="{y-8}" r="3.5" fill="#b79fff"/>')
        s.append(f'<text x="64" y="{y}" class="small {"" if on else "muted"}">{label}</text>')
    s += [f'<rect x="216" y="18" width="{width-234}" height="58" rx="20" fill="url(#glass)" stroke="#fff" stroke-opacity=".09"/>',
          '<text x="242" y="52" class="small muted">Kinetic Precision workspace</text>',
          f'<text x="{width-88}" y="52" class="small muted">Fares</text>']
    return "\n".join(s)

def write(name, content):
    (OUT / name).write_text(content)

activity = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1900" height="1740" viewBox="0 0 1900 1740">
{DEFS}
<rect width="1900" height="1740" fill="#050609"/>
<text x="44" y="52" class="title">Phase 22 — Activity Kinetic Lifecycle v0.1</text>
<text x="44" y="78" class="body muted">Design checkpoint · stronger lifecycle hierarchy without changing server-owned truth, ordering, pagination, Retry / Run again / Cancel contracts</text>
<g transform="translate(44 110)">
{shell(1280,760,"Activity")}
<g transform="translate(240 104)">
  <text x="0" y="32" class="title">Activity</text><text x="0" y="58" class="body muted">Generation lifecycle across this account.</text>
  <g transform="translate(0 92)" filter="url(#soft)">
    <rect width="994" height="150" rx="22" fill="#11131c" stroke="#a48fff" stroke-opacity=".28"/>
    <rect width="4" height="150" rx="2" fill="url(#accent)"/>
    <circle cx="34" cy="34" r="8" fill="#766eff"/><circle cx="34" cy="34" r="15" fill="#766eff" opacity=".13"/>
    <text x="56" y="39" class="label">RUNNING</text><text x="56" y="69" class="h3">Create image</text><text x="56" y="94" class="body muted">Cobalt architectural study with glass light wells</text>
    <text x="56" y="123" class="small dim">Updated moments ago · job accepted and active</text>
    <rect x="858" y="52" width="108" height="42" rx="13" fill="#fff" opacity=".035" stroke="#ff8da1" stroke-opacity=".28"/><text x="890" y="78" class="chip">Cancel</text>
  </g>
  <g transform="translate(0 260)">
    <rect width="994" height="138" rx="20" fill="#0d0f16" stroke="#fff" stroke-opacity=".08"/>
    <circle cx="34" cy="32" r="9" fill="#62d7ad" opacity=".9"/><path d="M29 32 l4 4 7-9" fill="none" stroke="#07120d" stroke-width="2"/>
    <text x="56" y="37" class="label">SUCCEEDED</text><text x="56" y="68" class="h3">Create video</text><text x="56" y="93" class="body muted">Slow camera through a moss-covered atrium</text><text x="56" y="118" class="small dim">Today · durable result saved</text>
    <rect x="736" y="48" width="104" height="42" rx="13" fill="#fff" opacity=".045"/><text x="756" y="74" class="chip">Run again</text>
    <rect x="852" y="48" width="114" height="42" rx="13" fill="url(#accent)" opacity=".20" stroke="#baa7ff" stroke-opacity=".28"/><text x="875" y="74" class="chip">View result</text>
  </g>
  <g transform="translate(0 416)">
    <rect width="486" height="146" rx="20" fill="#0d0f16" stroke="#ff947f" stroke-opacity=".16"/>
    <circle cx="34" cy="32" r="9" fill="#ff977e" opacity=".9"/><path d="M30 28 l8 8 M38 28 l-8 8" stroke="#24100d" stroke-width="2"/>
    <text x="56" y="37" class="label">FAILED</text><text x="56" y="68" class="h3">Edit image</text><text x="56" y="94" class="body muted">Generation could not be completed.</text><text x="56" y="119" class="small dim">Sanitized product error · history preserved</text>
    <rect x="374" y="48" width="84" height="40" rx="12" fill="#fff" opacity=".045"/><text x="397" y="73" class="chip">Retry</text>
    <rect x="508" y="0" width="486" height="146" rx="20" fill="#0d0f16" stroke="#fff" stroke-opacity=".075"/>
    <circle cx="542" cy="32" r="9" fill="#777b89"/><path d="M537 32 h10" stroke="#14151a" stroke-width="2"/>
    <text x="564" y="37" class="label muted">CANCELLED</text><text x="564" y="68" class="h3">Animate image</text><text x="564" y="94" class="body muted">Stopped before durable persistence.</text><text x="564" y="119" class="small dim">Yesterday · terminal history</text>
  </g>
  <g transform="translate(0 594)"><text x="0" y="22" class="small muted">Newer</text><text x="925" y="22" class="small muted">Older</text><rect x="455" y="4" width="82" height="28" rx="10" fill="#fff" opacity=".035"/><text x="476" y="23" class="micro muted">20 / PAGE</text></g>
</g>
</g>
<text x="56" y="902" class="label muted">DESKTOP · active work earns one restrained spectral rail; terminal history settles to quiet surfaces; no percentage, ETA, provider stage or queue claim</text>

<g transform="translate(1370 110)">
  <rect width="390" height="760" rx="30" fill="url(#bg)" stroke="#fff" stroke-opacity=".10"/>
  <ellipse cx="210" cy="64" rx="160" ry="82" fill="#7555ff" opacity=".10" filter="url(#glow)"/>
  <text x="20" y="44" class="label">ACTIVITY</text><text x="20" y="91" class="h2">Activity</text><text x="20" y="114" class="small muted">Generation lifecycle across this account.</text>
  <g transform="translate(20 142)"><rect width="350" height="166" rx="18" fill="#11131c" stroke="#a48fff" stroke-opacity=".28"/><rect width="4" height="166" rx="2" fill="url(#accent)"/><circle cx="24" cy="27" r="7" fill="#766eff"/><text x="42" y="31" class="micro">RUNNING</text><text x="18" y="65" class="h3">Create image</text><text x="18" y="90" class="small muted">Cobalt architectural study with glass light wells</text><text x="18" y="118" class="small dim">Updated moments ago</text><rect x="248" y="116" width="84" height="34" rx="11" fill="#fff" opacity=".035" stroke="#ff8da1" stroke-opacity=".28"/><text x="272" y="138" class="small">Cancel</text></g>
  <g transform="translate(20 324)"><rect width="350" height="158" rx="18" fill="#0d0f16" stroke="#fff" stroke-opacity=".08"/><circle cx="24" cy="26" r="8" fill="#62d7ad"/><text x="42" y="30" class="micro">SUCCEEDED</text><text x="18" y="62" class="h3">Create video</text><text x="18" y="87" class="small muted">Slow camera through a moss-covered atrium</text><rect x="126" y="110" width="96" height="34" rx="11" fill="#fff" opacity=".04"/><text x="143" y="132" class="small">Run again</text><rect x="230" y="110" width="102" height="34" rx="11" fill="url(#accent)" opacity=".20"/><text x="248" y="132" class="small">View result</text></g>
  <g transform="translate(20 498)"><rect width="350" height="138" rx="18" fill="#0d0f16" stroke="#ff947f" stroke-opacity=".16"/><circle cx="24" cy="26" r="8" fill="#ff977e"/><text x="42" y="30" class="micro">FAILED</text><text x="18" y="62" class="h3">Edit image</text><text x="18" y="87" class="small muted">Generation could not be completed.</text><rect x="258" y="88" width="74" height="34" rx="11" fill="#fff" opacity=".045"/><text x="278" y="110" class="small">Retry</text></g>
  <rect x="20" y="658" width="350" height="48" rx="15" fill="#0a0c12" stroke="#fff" stroke-opacity=".07"/><text x="40" y="688" class="small muted">Newer</text><text x="307" y="688" class="small muted">Older</text>
</g>
<text x="1382" y="902" class="label muted">390PX · actions wrap inside their owning row; active meaning survives without hover</text>

<g transform="translate(44 980)">
  <rect width="1716" height="660" rx="28" fill="#090a0f" stroke="#fff" stroke-opacity=".08"/>
  <text x="30" y="48" class="h2">Lifecycle motion + accessibility contract</text>
  <text x="30" y="78" class="body muted">Motion clarifies real state; it never creates new state.</text>
  <g transform="translate(30 112)"><rect width="516" height="182" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="22" y="34" class="label">ACTIVE</text><text x="22" y="65" class="body">Only queued / preparing / running / cancelling / persisting</text><text x="22" y="92" class="small muted">Optional 1.8–2.4 s low-amplitude rail/bloom cycle.</text><text x="22" y="118" class="small muted">No row translation that destabilizes reading or hit targets.</text><text x="22" y="147" class="small">Reduced motion → static spectral rail + visible status label.</text></g>
  <g transform="translate(566 112)"><rect width="516" height="182" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="22" y="34" class="label">TERMINAL</text><text x="22" y="65" class="body">Succeeded / Failed / Cancelled settle immediately</text><text x="22" y="92" class="small muted">No pulse, spinner, shimmer or perpetual glow.</text><text x="22" y="118" class="small muted">Icon + text + surface tone carry meaning together.</text><text x="22" y="147" class="small">Color is supportive, never the only status signal.</text></g>
  <g transform="translate(1102 112)"><rect width="584" height="182" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="22" y="34" class="label">ACTIONS</text><text x="22" y="65" class="body">Eligibility remains server-derived</text><text x="22" y="92" class="small muted">Run again ≠ Retry ≠ Cancel. Do not merge semantics.</text><text x="22" y="118" class="small muted">Focus rings remain static, bright and unambiguous.</text><text x="22" y="147" class="small">Touch targets stay ≥44 px where the implemented primitive allows.</text></g>
  <g transform="translate(30 330)"><rect width="1656" height="252" rx="20" fill="#0c0e14" stroke="#fff" stroke-opacity=".07"/><text x="22" y="36" class="label muted">REVIEW REJECTS</text><text x="22" y="73" class="body">Fake progress / ETA · provider or queue language · active animation on terminal history · hidden Retry/Cancel meaning · horizontal overflow at 390px · action movement that impairs focus</text><line x1="22" y1="104" x2="1630" y2="104" stroke="#fff" stroke-opacity=".06"/><text x="22" y="142" class="label muted">IMPLEMENTATION BOUNDARY</text><text x="22" y="178" class="body">Keep server-rendered rows + ActivityAutoRefresh. Presentation may animate feature-locally; browser motion state cannot become lifecycle truth.</text><text x="22" y="212" class="small muted">No schema, worker, routing, provider, admission, lifecycle or polling semantics change.</text></g>
</g>
</svg>'''
write("phase22-activity-kinetic-v0.1.svg", activity)

settings = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1900" height="1780" viewBox="0 0 1900 1780">
{DEFS}
<rect width="1900" height="1780" fill="#050609"/>
<text x="44" y="52" class="title">Phase 22 — Settings Trust Surface v0.1</text>
<text x="44" y="78" class="body muted">Design checkpoint · Kinetic Precision through calm depth and hierarchy; identity, access and admin authorization remain server-owned</text>
<g transform="translate(44 110)">
{shell(1280,760,"Settings")}
<g transform="translate(240 104)">
  <text x="0" y="32" class="title">Settings</text><text x="0" y="58" class="body muted">Identity, access and account security.</text>
  <g transform="translate(0 94)" filter="url(#soft)"><rect width="994" height="228" rx="24" fill="#10121a" stroke="#fff" stroke-opacity=".09"/><text x="24" y="40" class="label muted">IDENTITY &amp; ACCESS</text><text x="24" y="78" class="h2">fares@example.com</text><g transform="translate(24 104)"><rect width="92" height="30" rx="11" fill="#55d8ad" opacity=".13" stroke="#70e1bd" stroke-opacity=".22"/><circle cx="16" cy="15" r="4" fill="#67dcb3"/><text x="29" y="19" class="chip">Active</text></g><text x="24" y="162" class="body muted">Closed Beta access is active for this account.</text><text x="24" y="190" class="small dim">Access state is resolved server-side and cannot be edited here.</text><rect x="850" y="24" width="116" height="40" rx="13" fill="#fff" opacity=".04"/><text x="878" y="49" class="chip">Sign out</text></g>
  <g transform="translate(0 340)"><rect width="650" height="230" rx="22" fill="#0d0f16" stroke="#fff" stroke-opacity=".08"/><text x="24" y="40" class="label muted">SECURITY</text><text x="24" y="79" class="h2">Password</text><text x="24" y="108" class="body muted">Change your password through the existing protected flow.</text><rect x="24" y="142" width="158" height="44" rx="13" fill="url(#accent)" opacity=".20" stroke="#baa8ff" stroke-opacity=".28"/><text x="50" y="169" class="chip">Change password</text><text x="24" y="211" class="small dim">Recovery feedback stays sanitized; raw provider errors never surface.</text></g>
  <g transform="translate(670 340)"><rect width="324" height="230" rx="22" fill="#0d0f16" stroke="#fff" stroke-opacity=".08"/><text x="22" y="40" class="label muted">PRIVILEGED CONTINUATION</text><text x="22" y="79" class="h3">Admin</text><text x="22" y="106" class="small muted">Visible only after fresh active-admin authorization.</text><rect x="22" y="142" width="114" height="42" rx="13" fill="#fff" opacity=".04"/><text x="49" y="168" class="chip">Open Admin</text><text x="22" y="211" class="small dim">No role editing in Settings.</text></g>
</g></g>
<text x="56" y="902" class="label muted">DESKTOP SIGNED IN · calm, deliberate hierarchy; access state is explicit; security action is clear; Admin remains contextual and subordinate</text>

<g transform="translate(1370 110)"><rect width="390" height="760" rx="30" fill="url(#bg)" stroke="#fff" stroke-opacity=".10"/><ellipse cx="220" cy="70" rx="160" ry="84" fill="#7555ff" opacity=".08" filter="url(#glow)"/><text x="20" y="44" class="label">SETTINGS</text><text x="20" y="92" class="h2">Settings</text><text x="20" y="116" class="small muted">Identity, access and account security.</text><g transform="translate(20 146)"><rect width="350" height="220" rx="20" fill="#10121a" stroke="#fff" stroke-opacity=".09"/><text x="18" y="35" class="micro muted">IDENTITY &amp; ACCESS</text><text x="18" y="70" class="h3">fares@example.com</text><rect x="18" y="92" width="86" height="28" rx="10" fill="#55d8ad" opacity=".13"/><circle cx="32" cy="106" r="4" fill="#67dcb3"/><text x="45" y="110" class="small">Active</text><text x="18" y="150" class="small muted">Closed Beta access is active.</text><rect x="18" y="170" width="92" height="34" rx="11" fill="#fff" opacity=".04"/><text x="42" y="192" class="small">Sign out</text></g><g transform="translate(20 384)"><rect width="350" height="164" rx="20" fill="#0d0f16" stroke="#fff" stroke-opacity=".08"/><text x="18" y="34" class="micro muted">SECURITY</text><text x="18" y="67" class="h3">Password</text><text x="18" y="92" class="small muted">Protected password change flow.</text><rect x="18" y="112" width="142" height="36" rx="11" fill="url(#accent)" opacity=".20"/><text x="40" y="135" class="small">Change password</text></g><g transform="translate(20 566)"><rect width="350" height="120" rx="20" fill="#0d0f16" stroke="#fff" stroke-opacity=".075"/><text x="18" y="34" class="micro muted">ADMIN</text><text x="18" y="63" class="small muted">Only for a fresh active admin.</text><text x="18" y="91" class="small">Open Admin →</text></g></g>
<text x="1382" y="902" class="label muted">390PX SIGNED IN · one column; no admin-console density; security remains reachable without competing with identity</text>

<g transform="translate(44 982)"><rect width="1716" height="694" rx="28" fill="#090a0f" stroke="#fff" stroke-opacity=".08"/><text x="30" y="46" class="h2">Signed-out + access-state composition</text><text x="30" y="74" class="body muted">Same surface language, different truthful server-derived state.</text>
  <g transform="translate(30 108)"><rect width="720" height="244" rx="22" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="24" y="38" class="label muted">SIGNED OUT</text><text x="24" y="78" class="h2">Sign in to RenderLab</text><text x="24" y="108" class="body muted">Use the existing email + password flow. Closed Beta remains invitation-only.</text><rect x="24" y="140" width="118" height="44" rx="13" fill="url(#accent)" opacity=".20"/><text x="59" y="167" class="chip">Sign in</text><rect x="154" y="140" width="138" height="44" rx="13" fill="#fff" opacity=".04"/><text x="177" y="167" class="chip">Forgot password</text><text x="24" y="216" class="small dim">No Create account or social-auth affordance.</text></g>
  <g transform="translate(770 108)"><rect width="916" height="244" rx="22" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="24" y="38" class="label muted">ACCESS FEEDBACK</text><g transform="translate(24 64)"><rect width="404" height="76" rx="16" fill="#6f5518" fill-opacity=".16" stroke="#ffca66" stroke-opacity=".20"/><text x="18" y="29" class="chip">Invitation required</text><text x="18" y="53" class="small muted">This identity is not admitted to the Closed Beta.</text></g><g transform="translate(446 64)"><rect width="444" height="76" rx="16" fill="#6b252c" fill-opacity=".16" stroke="#ff8795" stroke-opacity=".20"/><text x="18" y="29" class="chip">Suspended</text><text x="18" y="53" class="small muted">Access is currently suspended. Recovery and sign out remain available.</text></g><text x="24" y="194" class="small dim">Status meaning uses label + copy + tone; color alone never carries authorization meaning.</text></g>
  <g transform="translate(30 382)"><rect width="1656" height="242" rx="20" fill="#0c0e14" stroke="#fff" stroke-opacity=".07"/><text x="22" y="36" class="label muted">MOTION / EFFECT BUDGET</text><text x="22" y="72" class="body">Settings is deliberately calmer than Create. Optional entrance depth: 180–260 ms; no perpetual animation.</text><text x="22" y="106" class="small muted">Reduced motion → immediate/static surfaces. Focus rings remain explicit. Alerts do not pulse. Admin never becomes visually primary.</text><line x1="22" y1="132" x2="1630" y2="132" stroke="#fff" stroke-opacity=".06"/><text x="22" y="166" class="label muted">REVIEW REJECTS</text><text x="22" y="201" class="body">Role editing · public registration · profile/preferences invention · client-inferred access · raw provider errors · hidden password recovery · decorative motion that competes with trust/security tasks</text></g>
</g>
</svg>'''
write("phase22-settings-trust-v0.1.svg", settings)

landing = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1900" height="1780" viewBox="0 0 1900 1780">
{DEFS}
<rect width="1900" height="1780" fill="#050609"/>
<text x="44" y="52" class="title">Phase 22 — Landing Kinetic Expression v0.1</text>
<text x="44" y="78" class="body muted">Design checkpoint · public first impression now matches the proven product without fake live state, public signup, metrics, provider or SLA claims</text>
<g transform="translate(44 110)"><rect width="1280" height="790" rx="28" fill="url(#bg)" stroke="#fff" stroke-opacity=".10"/><ellipse cx="690" cy="84" rx="460" ry="150" fill="#7355ff" opacity=".15" filter="url(#glow)"/><ellipse cx="1030" cy="360" rx="250" ry="210" fill="#39b9ff" opacity=".07" filter="url(#glow)"/>
  <text x="44" y="58" class="label">RENDERLAB</text><text x="1092" y="58" class="small muted">Closed beta</text><rect x="1160" y="31" width="88" height="38" rx="12" fill="#fff" opacity=".04"/><text x="1186" y="55" class="chip">Sign in</text>
  <g transform="translate(58 160)"><rect width="206" height="32" rx="12" fill="#8f79ff" opacity=".12" stroke="#b39fff" stroke-opacity=".19"/><circle cx="18" cy="16" r="4" fill="#a990ff"/><text x="31" y="20" class="chip">Closed beta · invitation only</text><text x="0" y="104" class="hero">Create with intent.</text><text x="0" y="166" class="hero">Keep what matters.</text><text x="0" y="214" class="body muted">Image and video creation with durable media, reusable references,</text><text x="0" y="238" class="body muted">truthful generation state and a focused continuation loop.</text><rect x="0" y="282" width="128" height="48" rx="15" fill="url(#accent)" opacity=".24" stroke="#baa8ff" stroke-opacity=".30"/><text x="32" y="312" class="chip">Open Create</text><rect x="142" y="282" width="104" height="48" rx="15" fill="#fff" opacity=".04"/><text x="173" y="312" class="chip">Sign in</text><text x="0" y="366" class="small dim">No public registration. Existing invited accounts can sign in.</text></g>
  <g transform="translate(620 128) rotate(-1.2 296 260)" filter="url(#soft)"><rect width="590" height="510" rx="28" fill="#0c0e15" stroke="#fff" stroke-opacity=".12"/><rect x="20" y="20" width="550" height="52" rx="16" fill="url(#glass)"/><text x="42" y="52" class="small muted">Create · product preview</text><g transform="translate(28 96)"><rect width="534" height="214" rx="22" fill="#11131c" stroke="#9c85ff" stroke-opacity=".20"/><text x="22" y="40" class="micro muted">IMAGE</text><text x="22" y="78" class="h3">Describe the frame you want to make</text><text x="22" y="110" class="small muted">A monolithic glass pavilion at blue hour...</text><rect x="22" y="144" width="74" height="34" rx="11" fill="#fff" opacity=".04"/><text x="43" y="166" class="small">16:9</text><rect x="106" y="144" width="82" height="34" rx="11" fill="#fff" opacity=".04"/><text x="128" y="166" class="small">1 image</text><rect x="396" y="138" width="116" height="44" rx="14" fill="url(#accent)" opacity=".24"/><text x="425" y="165" class="chip">Generate</text></g><g transform="translate(28 332)"><text x="0" y="22" class="micro muted">DURABLE RESULT / CONTINUE</text><rect x="0" y="38" width="250" height="120" rx="18" fill="#223759"/><ellipse cx="128" cy="98" rx="70" ry="38" fill="#7eb5ff" opacity=".55"/><rect x="270" y="38" width="264" height="120" rx="18" fill="#0e1119" stroke="#fff" stroke-opacity=".08"/><text x="292" y="70" class="h3">Saved to Library</text><text x="292" y="98" class="small muted">Edit · Animate · Download</text><text x="292" y="126" class="small dim">Preview only — not live runtime state</text></g></g>
  <g transform="translate(720 596) rotate(1.4 220 90)" opacity=".92"><rect width="444" height="140" rx="22" fill="#11131b" stroke="#fff" stroke-opacity=".10"/><text x="20" y="33" class="micro muted">LIBRARY / PRODUCT PREVIEW</text><g transform="translate(20 50)"><rect width="82" height="70" rx="12" fill="#2c486c"/><rect x="94" width="82" height="70" rx="12" fill="#603c45"/><rect x="188" width="82" height="70" rx="12" fill="#315847"/><rect x="282" width="82" height="70" rx="12" fill="#55406d"/><rect x="376" width="48" height="70" rx="12" fill="#23313c"/></g></g>
  <text x="58" y="748" class="small dim">Native scrolling · bounded entrance only · preview describes verified product surfaces, not fabricated account/job state</text>
</g>
<text x="56" y="932" class="label muted">DESKTOP LANDING · atmosphere is strongest here, but copy stays concrete and closed-beta truthful</text>

<g transform="translate(1370 110)"><rect width="390" height="790" rx="30" fill="url(#bg)" stroke="#fff" stroke-opacity=".10"/><ellipse cx="214" cy="86" rx="190" ry="105" fill="#7355ff" opacity=".14" filter="url(#glow)"/><text x="20" y="44" class="label">RENDERLAB</text><text x="328" y="44" class="small muted">Sign in</text><rect x="20" y="88" width="190" height="30" rx="11" fill="#8f79ff" opacity=".12"/><text x="36" y="108" class="small">Closed beta · invitation only</text><text x="20" y="174" class="h2">Create with intent.</text><text x="20" y="207" class="h2">Keep what matters.</text><text x="20" y="241" class="small muted">Image + video creation, durable media and focused continuation.</text><rect x="20" y="274" width="124" height="44" rx="14" fill="url(#accent)" opacity=".24"/><text x="50" y="302" class="chip">Open Create</text><rect x="154" y="274" width="92" height="44" rx="14" fill="#fff" opacity=".04"/><text x="181" y="302" class="chip">Sign in</text><g transform="translate(20 352)" filter="url(#soft)"><rect width="350" height="328" rx="22" fill="#0c0e15" stroke="#fff" stroke-opacity=".10"/><text x="18" y="32" class="micro muted">PRODUCT PREVIEW</text><rect x="18" y="52" width="314" height="126" rx="17" fill="#11131c" stroke="#9c85ff" stroke-opacity=".18"/><text x="34" y="80" class="small muted">IMAGE</text><text x="34" y="108" class="h3">Describe the frame</text><text x="34" y="135" class="small dim">A glass pavilion at blue hour...</text><rect x="232" y="132" width="80" height="30" rx="10" fill="url(#accent)" opacity=".22"/><text x="250" y="152" class="small">Generate</text><g transform="translate(18 198)"><rect width="94" height="88" rx="14" fill="#2c486c"/><rect x="106" width="94" height="88" rx="14" fill="#603c45"/><rect x="212" width="102" height="88" rx="14" fill="#315847"/></g><text x="18" y="312" class="small dim">Static preview · no fake live status</text></g><text x="20" y="728" class="small dim">No public registration or pricing claims.</text></g>
<text x="1382" y="932" class="label muted">390PX · hero remains concise; preview follows CTA rather than competing with it</text>

<g transform="translate(44 1010)"><rect width="1716" height="666" rx="28" fill="#090a0f" stroke="#fff" stroke-opacity=".08"/><text x="30" y="46" class="h2">Landing motion + truth contract</text><g transform="translate(30 84)"><rect width="526" height="190" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="22" y="35" class="label">ENTRANCE</text><text x="22" y="69" class="body">Hero / preview settle once, 260–420 ms.</text><text x="22" y="97" class="small muted">No scroll phase, parallax dependency or pointer-following field.</text><text x="22" y="125" class="small muted">Reduced motion → immediate/static composition.</text><text x="22" y="154" class="small">Native browser scrolling remains authoritative.</text></g><g transform="translate(576 84)"><rect width="526" height="190" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="22" y="35" class="label">PREVIEW TRUTH</text><text x="22" y="69" class="body">Use verified product vocabulary and shapes.</text><text x="22" y="97" class="small muted">Do not imply an active generation, user count or SLA.</text><text x="22" y="125" class="small muted">No provider/model logos as marketing authority.</text><text x="22" y="154" class="small">Preview is clearly decorative/product illustration.</text></g><g transform="translate(1122 84)"><rect width="564" height="190" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="22" y="35" class="label">CTA HIERARCHY</text><text x="22" y="69" class="body">Open Create primary · Sign in secondary.</text><text x="22" y="97" class="small muted">Preserve `/create` and `/settings` destinations.</text><text x="22" y="125" class="small muted">Root continuation query still redirects to Create.</text><text x="22" y="154" class="small">Closed-beta truth stays visible before action.</text></g></g><g transform="translate(30 304)"><rect width="1656" height="292" rx="20" fill="#0c0e14" stroke="#fff" stroke-opacity=".07"/><text x="22" y="38" class="label muted">REVIEW REJECTS</text><text x="22" y="76" class="body">Public signup · waitlist invention · pricing/testimonials/fake metrics · provider/model/SLA claims · scroll hijacking · shader/particle field · perpetual decorative motion · mobile preview before the core CTA</text><line x1="22" y1="112" x2="1630" y2="112" stroke="#fff" stroke-opacity=".06"/><text x="22" y="150" class="label muted">SYSTEM ROLE</text><text x="22" y="187" class="body">Landing may carry the strongest atmosphere in Cycle 4, while Create remains intent-dominant and Library remains media-dominant.</text><text x="22" y="220" class="small muted">The goal is family resemblance through type, depth, spectral edge and spacing—not identical layouts or copied feature controls.</text></g></g>
</svg>'''
write("phase22-landing-kinetic-v0.1.svg", landing)

cohesion = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1900" height="1560" viewBox="0 0 1900 1560">
{DEFS}
<rect width="1900" height="1560" fill="#050609"/>
<text x="44" y="52" class="title">Phase 22 — Cycle 4 System Cohesion v0.1</text><text x="44" y="78" class="body muted">Cross-product checkpoint · family resemblance without flattening each surface into the same composition</text>
<g transform="translate(44 112)"><rect width="1812" height="780" rx="28" fill="#090a0f" stroke="#fff" stroke-opacity=".08"/><text x="30" y="44" class="label muted">REPRESENTATIVE SURFACE ROLES</text>
  <g transform="translate(30 78)"><rect width="332" height="296" rx="22" fill="url(#bg)" stroke="#fff" stroke-opacity=".09"/><text x="18" y="34" class="micro muted">CREATE</text><text x="18" y="70" class="h2">Intent-dominant</text><rect x="18" y="94" width="296" height="128" rx="18" fill="#11131c" stroke="#9c85ff" stroke-opacity=".18"/><text x="34" y="126" class="small muted">Prompt / references / controls</text><rect x="204" y="166" width="92" height="38" rx="12" fill="url(#accent)" opacity=".24"/><text x="226" y="190" class="small">Generate</text><text x="18" y="258" class="small dim">Strong tactile control hierarchy</text></g>
  <g transform="translate(382 78)"><rect width="332" height="296" rx="22" fill="url(#bg)" stroke="#fff" stroke-opacity=".09"/><text x="18" y="34" class="micro muted">LIBRARY / VIEWER</text><text x="18" y="70" class="h2">Media-dominant</text><g transform="translate(18 94)"><rect width="88" height="112" rx="14" fill="#29496d"/><rect x="100" width="88" height="112" rx="14" fill="#603c45"/><rect x="200" width="96" height="112" rx="14" fill="#315847"/></g><text x="18" y="258" class="small dim">Media geometry + subordinate chrome</text></g>
  <g transform="translate(734 78)"><rect width="332" height="296" rx="22" fill="url(#bg)" stroke="#fff" stroke-opacity=".09"/><text x="18" y="34" class="micro muted">ACTIVITY</text><text x="18" y="70" class="h2">Lifecycle-dominant</text><rect x="18" y="94" width="296" height="54" rx="14" fill="#11131c" stroke="#a48fff" stroke-opacity=".24"/><rect x="18" y="94" width="3" height="54" fill="url(#accent)"/><text x="34" y="126" class="small">RUNNING · Create image</text><rect x="18" y="160" width="296" height="54" rx="14" fill="#10121a"/><text x="34" y="192" class="small muted">SUCCEEDED · Create video</text><text x="18" y="258" class="small dim">Truthful status + restrained active emphasis</text></g>
  <g transform="translate(1086 78)"><rect width="332" height="296" rx="22" fill="url(#bg)" stroke="#fff" stroke-opacity=".09"/><text x="18" y="34" class="micro muted">SETTINGS</text><text x="18" y="70" class="h2">Trust-dominant</text><rect x="18" y="94" width="296" height="74" rx="15" fill="#11131c"/><text x="34" y="122" class="small muted">Identity &amp; access</text><text x="34" y="148" class="small">Active</text><rect x="18" y="180" width="296" height="48" rx="14" fill="#0e1017"/><text x="34" y="209" class="small muted">Security · Password</text><text x="18" y="258" class="small dim">Calm depth, explicit authorization</text></g>
  <g transform="translate(1438 78)"><rect width="332" height="296" rx="22" fill="url(#bg)" stroke="#fff" stroke-opacity=".09"/><text x="18" y="34" class="micro muted">LANDING</text><text x="18" y="70" class="h2">Atmosphere-dominant</text><ellipse cx="205" cy="118" rx="96" ry="52" fill="#7758ff" opacity=".14" filter="url(#glow)"/><text x="18" y="118" class="h3">Create with intent.</text><text x="18" y="146" class="h3">Keep what matters.</text><rect x="18" y="174" width="98" height="38" rx="12" fill="url(#accent)" opacity=".23"/><text x="39" y="198" class="small">Open Create</text><text x="18" y="258" class="small dim">Strongest atmosphere, truthful preview</text></g>
  <g transform="translate(30 416)"><rect width="1740" height="304" rx="22" fill="#0c0e14" stroke="#fff" stroke-opacity=".07"/><text x="22" y="38" class="label">SHARED CONSTANTS</text><text x="22" y="76" class="body">Near-black atmospheric field · spectral cyan/violet accent · dimensional glass used selectively · clear 30px-class page title rhythm · quiet secondary copy · static visible focus · 390px no-overflow baseline</text><line x1="22" y1="110" x2="1714" y2="110" stroke="#fff" stroke-opacity=".06"/><text x="22" y="148" class="label">DO NOT NORMALIZE AWAY</text><text x="22" y="184" class="body">Create may be tactile. Library/Viewer may be media-spatial. Activity may show kinetic state. Settings should be calmer. Landing may carry more atmosphere.</text><text x="22" y="218" class="small muted">Cohesion comes from tokens, type, focus semantics, edge treatment and motion discipline—not identical card grids or one universal animation.</text><text x="22" y="264" class="small dim">Admin internal composition is outside Phase 22; only inherited shell/regression sanity is required.</text></g>
</g>

<g transform="translate(44 930)"><rect width="1812" height="526" rx="28" fill="#090a0f" stroke="#fff" stroke-opacity=".08"/><text x="30" y="46" class="h2">Cycle 4 effect budget + responsive acceptance</text>
  <g transform="translate(30 84)"><rect width="420" height="190" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="20" y="34" class="label">MOTION</text><text x="20" y="68" class="small">Create: tactile / job-state motion</text><text x="20" y="94" class="small">Library: media continuity / selection</text><text x="20" y="120" class="small">Activity: active-state rail only</text><text x="20" y="146" class="small">Settings: entrance depth only</text><text x="20" y="172" class="small">Landing: one bounded entrance</text></g>
  <g transform="translate(470 84)"><rect width="420" height="190" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="20" y="34" class="label">REDUCED MOTION</text><text x="20" y="68" class="small">Meaning remains through static hierarchy.</text><text x="20" y="94" class="small muted">No control disappears.</text><text x="20" y="120" class="small muted">No status depends on animation.</text><text x="20" y="146" class="small muted">No parallax/scroll dependency.</text><text x="20" y="172" class="small muted">Focus stays visible.</text></g>
  <g transform="translate(910 84)"><rect width="420" height="190" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="20" y="34" class="label">390PX</text><text x="20" y="68" class="small">No horizontal overflow or clipped text.</text><text x="20" y="94" class="small muted">Actions wrap inside owning surface.</text><text x="20" y="120" class="small muted">Sticky/fixed chrome never blocks controls.</text><text x="20" y="146" class="small muted">Touch targets remain reachable.</text><text x="20" y="172" class="small muted">Media geometry stays intact.</text></g>
  <g transform="translate(1350 84)"><rect width="420" height="190" rx="20" fill="#11131b" stroke="#fff" stroke-opacity=".08"/><text x="20" y="34" class="label">REJECT IF</text><text x="20" y="68" class="small">Decorative animation competes with task/media.</text><text x="20" y="94" class="small muted">Color is the only status signal.</text><text x="20" y="120" class="small muted">Completed surfaces are weakened.</text><text x="20" y="146" class="small muted">Landing invents product claims.</text><text x="20" y="172" class="small muted">Settings becomes an admin console.</text></g>
  <g transform="translate(30 300)"><rect width="1740" height="168" rx="20" fill="#0c0e14" stroke="#fff" stroke-opacity=".07"/><text x="22" y="36" class="label muted">IMPLEMENTATION TOOLBOX</text><text x="22" y="72" class="body">Existing RenderLab primitives + semantic tokens + CSS + Motion for React 13.1.1 first. No GSAP, Lenis, shader canvas, global smooth-scroll or second animation runtime is justified by this checkpoint.</text><text x="22" y="108" class="small muted">If implementation uncovers a genuine maintained-component gap, evaluate it under the existing component-source/accessibility/performance rules and document adoption before use.</text><text x="22" y="140" class="small dim">This board is a visual contract, not permission to change backend, auth, worker, schema or deployment behavior.</text></g>
</g>
</svg>'''
write("phase22-system-cohesion-v0.1.svg", cohesion)

checkpoint = '''# Phase 22 — Activity, Settings, Landing & System Cohesion v0.1

**Status:** `DESIGN CANDIDATE / REVIEW PENDING`  
**Phase:** 22 / Cycle 4 — Kinetic Visual Experience  
**Planning baseline:** `39e46584c22b1955fec7c4f966285307b1b8208c`  
**Controlling contract:** `PROJECT.md` Phase 22 Execution Contract

## Purpose
This checkpoint translates the merged Phase 22 contract into a repository-backed visual direction before implementation. It does not change product behavior, backend state, authorization, schema, workers, routing or deployment.

## Boards
- `design/penpot/phase22-activity-kinetic-v0.1.svg` — Activity desktop + 390px lifecycle hierarchy and reduced-motion/status contract.
- `design/penpot/phase22-settings-trust-v0.1.svg` — Settings signed-in desktop + 390px plus signed-out/access-state and trust/security hierarchy.
- `design/penpot/phase22-landing-kinetic-v0.1.svg` — Landing desktop + 390px hero/product-preview direction and public-truth/motion limits.
- `design/penpot/phase22-system-cohesion-v0.1.svg` — cross-product surface roles, shared constants, 390px/reduced-motion/effect-budget acceptance.

All boards are open SVGs intended for Penpot import/editing and remote raster review. The repository remains authoritative.

## Locked visual direction in this candidate
### Activity
- Active work gets one restrained spectral status rail/bloom tied only to real active lifecycle states.
- Terminal states settle to quiet surfaces; status meaning uses icon + text + tone, never color alone.
- Operation identity and sanitized job summary remain primary; timestamps are subordinate.
- `Run again`, `Retry`, `Cancel` remain visibly distinct because their product semantics are distinct.
- No fake percentage, ETA, provider stage, queue position or SLA language.

### Settings
- Settings uses Kinetic Precision through calm surface depth, typography and explicit state hierarchy—not through perpetual motion.
- Identity/access is primary, security is a deliberate second section, and Admin stays contextual/subordinate.
- Signed-out state remains a simple Sign in + Forgot password path; no public Create account or social-auth invention.
- Active / invitation-required / suspended truth uses text and surface treatment together; browser presentation never infers authorization.

### Landing
- Landing carries the strongest atmospheric expression in the cycle but remains native-scroll and reduced-motion-safe.
- `Open Create` is primary, `Sign in` secondary, and Closed Beta / invitation-only truth stays visible.
- Product preview uses current verified Create/Library vocabulary and shapes while clearly reading as a static product illustration, not live account/job state.
- No public signup/waitlist, pricing, testimonial, fake metric, provider/model or SLA claims.

### System cohesion
- Shared family resemblance comes from near-black atmosphere, spectral cyan/violet edge, selective glass depth, page-title rhythm, focus semantics and motion discipline.
- Surface roles remain intentionally distinct: Create intent-dominant; Library/Viewer media-dominant; Activity lifecycle-dominant; Settings trust-dominant; Landing atmosphere-dominant.
- Admin internals remain outside Phase 22 except inherited-shell regression sanity.

## Motion / effect budget
- Existing CSS + Motion for React `13.1.1` + RenderLab primitives are sufficient for the design intent.
- Activity may use only low-amplitude active-state motion and must provide a static equivalent under reduced motion.
- Settings should have no perpetual motion; optional entrance depth is brief and nonessential.
- Landing may use one bounded entrance/settle sequence; no scroll hijacking, parallax dependency, pointer-following field, particle engine or shader canvas.
- No GSAP, Lenis or second animation runtime is justified by this checkpoint.

## Review gate
Before implementation, remotely rasterize the exact SVG boards and human-review:
1. desktop and 390px hierarchy for each target surface;
2. active/succeeded/failed or cancelled Activity meaning and action reachability;
3. signed-in and signed-out/access-state Settings hierarchy;
4. Landing CTA/closed-beta truth and product-preview honesty;
5. reduced-motion/static equivalents and focus/status semantics;
6. cross-product cohesion without weakening Create or Library/Viewer;
7. effect budget: no decorative noise, no hidden meaning, no narrow overflow implied by the layouts.

If the rendered checkpoint fails review, revise the SVGs and rerender. Do not begin Phase 22 product implementation until this file is updated with verified render evidence and `IMPLEMENTATION READY` status.

Production deployment is not authorized by this checkpoint.
'''
write("phase22-system-cohesion-v0.1.md", checkpoint)
