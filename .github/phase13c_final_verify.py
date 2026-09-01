import json
import os
import secrets
import ssl
import subprocess
import urllib.error
import urllib.parse
import urllib.request

SUPABASE_URL=os.environ['SUPABASE_URL'].rstrip('/')
SITE_URL=os.environ['SITE_URL'].rstrip('/')
PROJECT_REF=os.environ['SUPABASE_PROJECT_REF']
SERVICE=os.environ['SUPABASE_SERVICE_ROLE_KEY']
MGMT=os.environ['SUPABASE_ACCESS_TOKEN']
RESEND=os.environ['RESEND_API_KEY']
DOMAIN=os.environ['SENDER_DOMAIN']
FROM_EMAIL=os.environ['FROM_EMAIL']
SMTP_HOST=os.environ['SMTP_HOST']
SMTP_PORT=os.environ['SMTP_PORT']
RATE=int(os.environ['AUTH_EMAIL_RATE_LIMIT'])
INVITE_SUBJECT=os.environ['INVITE_SUBJECT']
RECOVERY_SUBJECT=os.environ['RECOVERY_SUBJECT']


def request_json(url, *, method='GET', headers=None, body=None, expected=(200,)):
    data=None if body is None else json.dumps(body).encode()
    h={'Accept':'application/json', **(headers or {})}
    if body is not None: h['Content-Type']='application/json'
    req=urllib.request.Request(url,data=data,headers=h,method=method)
    try:
        with urllib.request.urlopen(req,timeout=30,context=ssl.create_default_context()) as r:
            payload=r.read().decode(); status=r.status
    except urllib.error.HTTPError as e:
        payload=e.read().decode(errors='replace')
        if e.code in expected:
            return json.loads(payload) if payload else {}
        raise RuntimeError(f'{method} request failed with HTTP {e.code}: {payload[:300]}') from None
    if status not in expected: raise RuntimeError(f'{method} request returned HTTP {status}')
    return json.loads(payload) if payload else {}


def resend_json(url):
    p=subprocess.run(['curl','--fail-with-body','--silent','--show-error','--header',f'Authorization: Bearer {RESEND}',url],text=True,capture_output=True,timeout=30)
    if p.returncode: raise RuntimeError('Resend API request failed: '+p.stderr[:300])
    return json.loads(p.stdout)

# Provider + hosted Auth/template readback.
domains=resend_json('https://api.resend.com/domains').get('data') or []
rows=[r for r in domains if str(r.get('name') or '').lower().rstrip('.')==DOMAIN.lower().rstrip('.')]
if len(rows)!=1: raise SystemExit('Expected exactly one Resend sender domain')
domain=resend_json(f"https://api.resend.com/domains/{rows[0]['id']}")
if domain.get('status')!='verified': raise SystemExit('Resend domain not verified')
if domain.get('open_tracking') is not False or domain.get('click_tracking') is not False: raise SystemExit('Resend tracking not disabled')
print('RESEND_DOMAIN_VERIFIED=true')
print('RESEND_OPEN_TRACKING=false')
print('RESEND_CLICK_TRACKING=false')

mgmt=f'https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth'
conf=request_json(mgmt,headers={'Authorization':f'Bearer {MGMT}','User-Agent':'RenderLab-Phase13C-Final/1.0'})
if conf.get('site_url')!=SITE_URL: raise SystemExit('Site URL mismatch')
if str(conf.get('smtp_host') or '')!=SMTP_HOST or str(conf.get('smtp_port'))!=SMTP_PORT: raise SystemExit('SMTP endpoint mismatch')
if str(conf.get('smtp_admin_email') or '')!=FROM_EMAIL: raise SystemExit('From identity mismatch')
if int(conf.get('rate_limit_email_sent') or -1)!=RATE: raise SystemExit('Email rate mismatch')
if conf.get('mailer_subjects_invite')!=INVITE_SUBJECT: raise SystemExit('Invite subject mismatch')
if conf.get('mailer_subjects_recovery')!=RECOVERY_SUBJECT: raise SystemExit('Recovery subject mismatch')
invite=str(conf.get('mailer_templates_invite_content') or '')
recovery=str(conf.get('mailer_templates_recovery_content') or '')
expected={
 'invite':'{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/settings',
 'recovery':'{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/settings/password',
}
for name,body in [('invite',invite),('recovery',recovery)]:
    if expected[name] not in body: raise SystemExit(f'{name} token-hash URL mismatch')
    if '{{ .ConfirmationURL }}' in body: raise SystemExit(f'{name} still uses ConfirmationURL')
    if '{{ .SiteURL }}/renderlab-mark.svg' not in body: raise SystemExit(f'{name} brand mark missing')
    for required in ('RenderLab','role="presentation"','#090a0c','#111318','#7c6cf2','copy and paste this secure link'):
        if required not in body: raise SystemExit(f'{name} email-shell requirement missing: {required}')
    for forbidden in ('resend.com','brevo.com','supabase.co/auth/v1/verify'):
        if forbidden in body.lower(): raise SystemExit(f'{name} contains provider/raw verify link')
print('INVITE_TEMPLATE_READBACK_OK=true')
print('RECOVERY_TEMPLATE_READBACK_OK=true')
print('TOKEN_HASH_LINK_CONTRACT_OK=true')
print('CONFIRMATION_URL_REMOVED=true')
print('RENDERLAB_EMAIL_SHELL_OK=true')

# No-send generate-link coverage with email-based cleanup, including invite users whose response shape omits an id.
auth_headers={'apikey':SERVICE,'Authorization':f'Bearer {SERVICE}'}
run=f"{os.environ.get('GITHUB_RUN_ID','manual')}-{os.environ.get('GITHUB_RUN_ATTEMPT','1')}"
invite_email=f'renderlab-phase13c-final-invite-{run}@example.com'
recovery_email=f'renderlab-phase13c-final-recovery-{run}@example.com'

def exact_users(email):
    data=request_json(f"{SUPABASE_URL}/auth/v1/admin/users?filter={urllib.parse.quote(email)}&page=1&per_page=100",headers=auth_headers)
    return [u for u in (data.get('users') or []) if str(u.get('email') or '').lower()==email.lower()]

def cleanup_email(email):
    for u in exact_users(email):
        uid=u.get('id')
        if uid:
            request_json(f'{SUPABASE_URL}/auth/v1/admin/users/{uid}',method='DELETE',headers=auth_headers,expected=(200,204))
    if exact_users(email): raise SystemExit(f'Auth fixture cleanup failed for {email}')

try:
    inv=request_json(f'{SUPABASE_URL}/auth/v1/admin/generate_link',method='POST',headers=auth_headers,body={'type':'invite','email':invite_email})
    if not inv.get('hashed_token') or not inv.get('action_link'): raise SystemExit('Invite generate_link missing token properties')
    created=request_json(f'{SUPABASE_URL}/auth/v1/admin/users',method='POST',headers=auth_headers,body={'email':recovery_email,'password':secrets.token_urlsafe(32)+'!Aa9','email_confirm':True})
    if not created.get('id'): raise SystemExit('Recovery fixture user missing')
    rec=request_json(f'{SUPABASE_URL}/auth/v1/admin/generate_link',method='POST',headers=auth_headers,body={'type':'recovery','email':recovery_email})
    if not rec.get('hashed_token') or not rec.get('action_link'): raise SystemExit('Recovery generate_link missing token properties')
    for name,result in [('invite',inv),('recovery',rec)]:
        action=str(result.get('action_link') or '')
        if not action.startswith(f'{SUPABASE_URL}/auth/v1/verify?'): raise SystemExit(f'{name} generated action link origin mismatch')
    print('SUPABASE_GENERATE_LINK_INVITE_OK=true')
    print('SUPABASE_GENERATE_LINK_RECOVERY_OK=true')
    print('SUPABASE_GENERATE_LINK_SENT_EMAIL=false')
finally:
    cleanup_email(invite_email)
    cleanup_email(recovery_email)
print('PHASE13C_AUTH_FIXTURE_RESIDUE=0')

# Production invalid/hostile-link behavior: do not follow redirects.
for url in (
 f'{SITE_URL}/auth/confirm?token_hash=invalid-phase13c&type=invite&next=https://evil.example',
 f'{SITE_URL}/auth/confirm?token_hash=invalid-phase13c&type=recovery&next=https://evil.example',
 f'{SITE_URL}/auth/confirm?token_hash=invalid-phase13c&type=magiclink&next=https://evil.example',
):
    p=subprocess.run(['curl','--silent','--show-error','--max-redirs','0','--output','/dev/null','--write-out','%{http_code}\n%{redirect_url}',url],text=True,capture_output=True,timeout=30)
    lines=p.stdout.splitlines(); status=lines[0] if lines else ''; location=lines[1] if len(lines)>1 else ''
    if status!='307': raise SystemExit(f'Invalid auth link returned {status}, expected 307')
    if location not in (f'{SITE_URL}/settings?auth=link_invalid','/settings?auth=link_invalid'): raise SystemExit(f'Unexpected invalid-link redirect {location}')
    if 'evil.example' in location: raise SystemExit('Hostile next escaped fail-closed redirect')
print('PRODUCTION_INVALID_AUTH_LINKS_FAIL_CLOSED=true')
print('PRODUCTION_HOSTILE_NEXT_REJECTED=true')
print('PHASE13C_REAL_AUTH_EMAIL_SENT=false')
