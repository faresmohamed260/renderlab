#!/usr/bin/env python3
"""Disposable offline Android native Auth/TOTP UI proof: only synthetic inputs."""
import re,sys,subprocess,time
from xml.etree import ElementTree as ET
PKG='dev.renderlab.m2totpqa'
def adb(*args,timeout=80):
    return subprocess.run(['adb',*args],capture_output=True,text=True,check=True,timeout=timeout).stdout.strip()
def screen():
    adb('shell','uiautomator','dump','/sdcard/m2-totp-qa.xml')
    raw=adb('exec-out','cat','/sdcard/m2-totp-qa.xml')
    nodes=list(ET.fromstring(raw[raw.index('<hierarchy'):]).iter('node'))
    return nodes,' '.join(n.get('text','')+' '+n.get('content-desc','') for n in nodes)
def wait(marker,timeout=105):
    end=time.monotonic()+timeout;seen=''
    while time.monotonic()<end:
        try:
            nodes,seen=screen()
            if marker in seen:
                print('PASS UI: '+marker[:85],flush=True)
                return nodes
        except Exception as e:seen=type(e).__name__
        time.sleep(2)
    raise AssertionError('Missing UI marker '+marker+' / '+seen[:220])
def tap(nodes,label):
    hits=[n for n in nodes if n.get('text')==label or n.get('content-desc','').split(',')[0]==label]
    if not hits:raise AssertionError('Missing control '+label)
    b=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',hits[-1].get('bounds',''))
    if not b:raise AssertionError('Invalid bounds for '+label)
    x1,y1,x2,y2=map(int,b.groups())
    x,y=(x1+x2)//2,(y1+y2)//2
    width,height=map(int,re.search(r'(\d+)x(\d+)',adb('shell','wm','size')).groups())
    if x<0 or x>=width or y<0 or y>=height-48:
        raise AssertionError('Unsafe touch position for '+label+'; bounds='+str((x1,y1,x2,y2)))
    print('QA target:',label,'clickable:',hits[-1].get('clickable'),'bounds:',(x1,y1,x2,y2),flush=True)
    adb('shell','input','tap',str(x),str(y))
def type_into(label,value,submit=False):
    tap(wait(label),label)
    adb('shell','input','text',value)
    adb('shell','input','keyevent','66' if submit else '4')
def diagnostic():
    try:
        text=adb('shell','dumpsys','activity','activities',timeout=25)
        hits=[line.strip() for line in text.splitlines()
              if 'ResumedActivity' in line or 'topResumedActivity' in line]
        print('QA top activity:',(hits[:2] or ['not reported']),flush=True)
        raw=adb('shell','logcat','-d','-s','AndroidRuntime:E','ReactNativeJS:E',timeout=25)
        lines=raw.splitlines()
        signatures=[(i,line.strip()[:220]) for i,line in enumerate(lines) if
                    ('FATAL EXCEPTION' in line or 'Process: dev.renderlab.m2totpqa' in line or
                     'TypeError:' in line or 'Invariant Violation:' in line)]
        print('QA crash signatures:',signatures[-12:],flush=True)
        for index,_ in signatures[-4:]:
            print('QA AndroidRuntime traceback:', '\\n'.join(lines[max(0,index-1):index+34])[:7500],flush=True)
    except Exception as error:
        print('QA diagnostic unavailable:',type(error).__name__,flush=True)
def sign_in():
    type_into('Account email','qa@example.test')
    type_into('Account password','synthetic-only',submit=True)
    try:
        wait('M2 QA STAGE: mfa_required',timeout=15)
    except AssertionError:
        # KeyEvent ENTER is the preferred Android IME submit. Fall back to
        # a bounded accessible button hit only if the app remains foreground.
        nodes,_=screen()
        tap(nodes,'Sign in')
        wait('M2 QA STAGE: mfa_required',timeout=25)
    wait('Enter the six-digit code from your existing authenticator app.')
def main(apk):
    adb('wait-for-device',timeout=140)
    adb('install','-r',apk,timeout=140)
    adb('shell','svc','wifi','disable')
    adb('shell','svc','data','disable')
    adb('shell','am','start','-n',PKG+'/.MainActivity')
    nodes=wait('CREATIVE WORKSPACE',150)
    tap(nodes,'Settings')
    wait('M2 SYNTHETIC TOTP QA')
    wait('RenderLab account')
    sign_in()
    type_into('Authenticator code','000000')
    tap(wait('Verify authenticator code'),'Verify authenticator code')
    wait('Verification was not completed.')
    type_into('Authenticator code','123456')
    tap(wait('Verify authenticator code'),'Verify authenticator code')
    wait('Account access confirmed by the RenderLab server.')
    tap(wait('Sign out'),'Sign out')
    wait('Sign in')
    print('PASS actual native sign-in, TOTP denial, retry, success and sign-out UI',flush=True)
    adb('shell','am','force-stop',PKG)
    adb('shell','am','start','-n',PKG+'/.MainActivity')
    nodes=wait('CREATIVE WORKSPACE',150)
    tap(nodes,'Settings')
    wait('M2 SYNTHETIC TOTP QA')
    wait('Sign in')
    print('PASS cold restart resets QA state; no network, Metro or persistent credentials',flush=True)
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Disposable APK required')
    try:
        main(sys.argv[1])
    except Exception:
        diagnostic()
        raise
