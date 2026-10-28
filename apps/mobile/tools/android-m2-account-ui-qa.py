#!/usr/bin/env python3
"""Standalone offline Android settings QA: never use real credentials."""
from __future__ import annotations
from xml.etree import ElementTree as ET
import re, subprocess, sys, time
PKG='dev.renderlab.m2accountuiqa'
def adb(*args,timeout=75):
    return subprocess.run(['adb',*args],check=True,text=True,capture_output=True,timeout=timeout).stdout.strip()
def screen():
    adb('shell','uiautomator','dump','/sdcard/m2-account.xml')
    raw=adb('exec-out','cat','/sdcard/m2-account.xml')
    nodes=list(ET.fromstring(raw[raw.index('<hierarchy'):]).iter('node'))
    text=' '.join(n.get('text','')+' '+n.get('content-desc','') for n in nodes)
    return nodes,text
def wait(marker,seconds=100):
    limit=time.monotonic()+seconds
    last=''
    while time.monotonic()<limit:
        try:
            nodes,last=screen()
            if marker in last:
                print('PASS UI:',marker,flush=True)
                return nodes
        except Exception as exc:
            last=type(exc).__name__
        time.sleep(2)
    raise AssertionError('Missing UI marker '+marker+': '+last[:250])
def tap(nodes,label):
    matches=[n for n in nodes if n.get('text')==label or n.get('content-desc','').split(',')[0]==label]
    if not matches:raise AssertionError('Missing accessible tab '+label)
    m=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',matches[-1].get('bounds',''))
    if not m:raise AssertionError('No tap coordinates')
    x1,y1,x2,y2=map(int,m.groups())
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
def verify_account():
    adb('shell','am','start','-n',PKG+'/.MainActivity')
    nodes=wait('CREATIVE WORKSPACE',130)
    tap(nodes,'Settings')
    wait('RenderLab account')
    nodes=wait('Sign-in is unavailable in this build.')
    for forbidden in ['Account email','Account password','Authenticator code','Sign out','Verify code']:
        if any(n.get('text')==forbidden or n.get('content-desc')==forbidden for n in nodes):
            raise AssertionError('Active credential field in disabled Auth screen: '+forbidden)
    print('PASS disabled-account Settings has no credential inputs or authorized controls',flush=True)
def main(apk):
    adb('wait-for-device',timeout=130)
    adb('install','-r',apk,timeout=130)
    adb('shell','svc','wifi','disable')
    adb('shell','svc','data','disable')
    verify_account()
    adb('shell','am','force-stop',PKG)
    verify_account()
    print('PASS standalone Settings, offline, cold restart, no Metro or login',flush=True)
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Need isolated APK')
    main(sys.argv[1])
