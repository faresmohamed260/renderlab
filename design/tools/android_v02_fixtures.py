"""Synthetic media/art helpers for the Android v0.2 design candidate.

This is not app/runtime code. Generates deterministic original fixtures only.
Python optional deps: Pillow, NumPy. No real user media or original screenshots.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, random, math, base64, io, html, os
from pathlib import Path
import cairosvg
D=Path(os.environ.get('RENDERLAB_MOCKUP_TMP','/tmp/renderlab-v02-fixtures'));D.mkdir(parents=True,exist_ok=True)
random.seed(26)
FONTS={}
def font(size,bold=False):
    key=(size,bold)
    if key not in FONTS:
        path='/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf'
        FONTS[key]=ImageFont.truetype(path,size)
    return FONTS[key]

def scene(w,h,index=0):
    rng=np.random.default_rng(20261026+index*17)
    # cinematic color gradients, diverse visual fixture styles
    palettes=[((189,151,136),(60,113,137)),((122,80,58),(229,184,112)),((28,56,69),(143,156,166)),((214,209,197),(36,39,48)),((128,89,67),(242,208,168)),((28,20,69),(150,33,159)),((138,192,198),(227,177,131)),((55,64,66),(178,148,126)),((247,182,103),(81,36,52)),((162,97,92),(47,57,93)),((93,177,209),(233,209,178)),((34,24,42),(170,46,66))]
    a,b=palettes[index%12]
    Y=np.linspace(0,1,h,dtype=np.float32)[:,None,None]
    X=np.linspace(0,1,w,dtype=np.float32)[None,:,None]
    a=np.array(a,dtype=np.float32).reshape(1,1,3);b=np.array(b,dtype=np.float32).reshape(1,1,3)
    v=np.clip(Y*.95 + .14*np.sin(X*5.7+index),0,1)
    base=a*(1-v)+b*v
    n=rng.normal(0,4.2,(h,w,1))
    arr=np.uint8(np.clip(base+n,0,255))
    im=Image.fromarray(arr,'RGB');p=ImageDraw.Draw(im,'RGBA')
    def cloud(cx,cy,rx,ry,color,count=16):
        for k in range(count):
            x=cx+rng.uniform(-rx,rx);y=cy+rng.uniform(-ry,ry)
            radx=rng.uniform(rx*.15,rx*.43);rady=rng.uniform(ry*.25,ry*.7)
            p.ellipse([x-radx,y-rady,x+radx,y+rady],fill=color)
    # distinct silhouettes and spatial compositions in original media
    if index in (0,10): # coast and sea
        horizon=int(h*.48)
        p.rectangle([0,horizon,w,h],fill=(39,77,97,175) if index==0 else (34,135,158,180))
        for i in range(34):
            yy=int(horizon + (h-horizon)*(i+1)/34)
            xx=int(rng.uniform(0,w*.2));leng=int(rng.uniform(w*.3,w*.97))
            p.line([(xx,yy),(min(w,xx+leng),yy+int(rng.uniform(-4,4)))],fill=(209,218,218,int(15+80*(i/34))),width=int(1+i/14))
        cloud(w*.65,h*.26,w*.42,h*.10,(245,225,209,34),20)
        if index==10:
            p.polygon([(0,h*.85),(w*.25,h*.75),(w*.45,h),(0,h)],fill=(243,218,182,215))
            p.ellipse([w*.52,h*.48,w*.56,h*.54],fill=(37,54,57,255))
            p.line([(w*.54,h*.54),(w*.53,h*.73)],fill=(37,54,57,220),width=8)
    elif index==1: # vaulted sandstone entrance
        p.rectangle([0,0,w,h],fill=(114,80,55,105));
        for n0 in range(8):
            z=n0/8; xx=int(w*(.07+z*.20));yt=int(h*(.13+z*.10));
            p.arc([xx,yt,w-xx,h*.9],180,360,fill=(231,196,151,140),width=6)
        p.pieslice([w*.20,h*.10,w*.80,h*.74],180,360,fill=(51,51,45,185))
        p.rectangle([w*.20,h*.42,w*.80,h*.80],fill=(43,53,58,165))
        p.pieslice([w*.35,h*.28,w*.65,h*.60],180,360,fill=(135,186,204,230))
        p.rectangle([w*.35,h*.44,w*.65,h*.80],fill=(153,198,218,185))
        for i in range(9):
            yy=h*.78+i*i*2.7; p.line([(0,yy),(w,yy)],fill=(250,217,169,145),width=2)
        p.ellipse([w*.495,h*.61,w*.523,h*.65],fill=(26,37,39,255));p.line([(w*.508,h*.64),(w*.508,h*.72)],fill=(22,33,36,255),width=4)
    elif index in (2,7,9): # architecture and windows, sunlit interiors
        for k in range(4):
            xx=int(k*w/3);p.rectangle([xx,-10,xx+w*.036,h],fill=(22,31,38,205))
        p.rectangle([0,h*.68,w,h],fill=(30,29,41,115))
        p.line([(0,h*.47),(w,h*.40)],fill=(244,210,169,112),width=10)
        p.polygon([(w*.54,h*.73),(w*.69,h*.81),(w*.74,h*.97),(w*.37,h*.99)],fill=(17,22,29,225))
        p.ellipse([w*.47,h*.60,w*.58,h*.73],fill=(48,39,38,220))
        p.arc([w*.38,h*.48,w*.63,h*.69],20,190,fill=(28,25,28,230),width=9)
        if index==9:
            for k in range(7):
                xx=int(rng.uniform(0,w));yy=int(rng.uniform(0,h*.55));p.rectangle([xx,yy,xx+24,yy+34],outline=(225,193,167,150),width=2)
    elif index in (3,8): # portrait-like editorial human silhouette
        p.ellipse([w*.29,h*.11,w*.71,h*.47],fill=(31,27,31,240))
        p.ellipse([w*.35,h*.21,w*.64,h*.49],fill=(132,102,89,240) if index==8 else (134,129,126,230))
        p.polygon([(w*.38,h*.42),(w*.60,h*.43),(w*.83,h*.99),(w*.12,h*.99)],fill=(36,31,39,245))
        p.polygon([(w*.31,h*.14),(w*.69,h*.14),(w*.73,h*.49),(w*.61,h*.30),(w*.43,h*.28),(w*.27,h*.49)],fill=(23,23,29,180))
        p.ellipse([w*.55,h*.36,w*.585,h*.371],fill=(33,23,26,210))
        if index==8:
            p.rectangle([w*.02,0,w*.23,h],fill=(239,215,151,45))
    elif index in (5,11): # stage / abstract lights
        p.rectangle([0,h*.63,w,h],fill=(11,11,21,220))
        for k in range(6):
            xx=(k+.5)*w/6; p.line([(xx,-10),(w*.5+xx*.3,h*.88)],fill=((251,124,208,95) if index==5 else (250,105,97,145)),width=17)
            p.ellipse([xx-8,h*.08-8,xx+8,h*.08+8],fill=(249,239,231,245))
        p.ellipse([w*.43,h*.48,w*.55,h*.60],fill=(15,19,30,255))
        p.polygon([(w*.46,h*.58),(w*.54,h*.58),(w*.64,h*.98),(w*.33,h*.98)],fill=(15,18,27,252))
        p.line([(w*.5,h*.67),(w*.75,h*.77)],fill=(28,22,28,255),width=12)
    elif index==4: # sunlit room
        p.rectangle([w*.06,h*.18,w*.94,h*.96],fill=(176,143,102,125))
        p.rectangle([w*.19,h*.1,w*.75,h*.76],fill=(48,47,40,190))
        p.rectangle([w*.24,h*.13,w*.70,h*.73],fill=(240,218,161,190))
        p.line([(w*.47,h*.13),(w*.47,h*.73)],fill=(81,59,44,180),width=9)
        p.polygon([(0,h*.8),(w,h*.72),(w,h),(0,h)],fill=(109,79,59,185))
        p.ellipse([w*.39,h*.77,w*.82,h*.89],fill=(95,61,37,232));p.ellipse([w*.62,h*.74,w*.78,h*.83],fill=(101,66,43,239))
    elif index==6: # pool and palms
        p.rectangle([0,h*.53,w,h],fill=(64,156,156,160))
        p.polygon([(w*.0,h*.8),(w*.38,h*.69),(w*.66,h*.99),(0,h)],fill=(228,214,179,222))
        p.line([(w*.18,h*.07),(w*.25,h*.72)],fill=(67,64,49,225),width=13)
        for k in range(12):
            ang=k*math.tau/12; x=w*.20+math.cos(ang)*w*.30;y=h*.12+math.sin(ang)*h*.13
            p.line([(w*.2,h*.13),(x,y)],fill=(45,88,62,210),width=8)
    # vignette / film-grain
    d=np.array(im).astype(np.float32)
    xx=np.linspace(-1,1,w,dtype=np.float32)[None,:,None];yy=np.linspace(-1,1,h,dtype=np.float32)[:,None,None]
    vign=1-.24*np.clip(xx**2+yy**2,0,1)
    d*=vign
    im=Image.fromarray(np.uint8(np.clip(d,0,255)),'RGB')
    return im

def hero(w=709,h=888):
    rng=np.random.default_rng(1888)
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    cy=h*.31;cx=w*.43
    radius=np.sqrt(((xx-cx)/w)**2+((yy-cy)/h)**2)
    theta=np.arctan2(yy-cy,xx-cx)
    # dynamic golden particle plume, no franchise assets
    rays=(np.sin(theta*78+radius*60)*.5+.5)**12
    bands=(np.cos(theta*109-radius*170)*.5+.5)**14
    haze=np.exp(-((yy-h*.70)/(h*.32))**2)
    grain=rng.normal(0,11,(h,w))
    glow=np.exp(-(radius/.52)**2)
    lum=26+130*glow+95*haze+75*rays+58*bands+grain
    base=np.stack([lum*1.14, lum*.77, lum*.38],axis=2)
    # lower haze, subtle storm depth
    arr=np.uint8(np.clip(base,0,255));im=Image.fromarray(arr,'RGB')
    p=ImageDraw.Draw(im,'RGBA')
    # bright atmospheric lower clouds
    for k in range(195):
        a=float(rng.uniform(0,w)); b=float(rng.uniform(h*.56,h*.97));rx=float(rng.uniform(18,116));ry=float(rng.uniform(9,64))
        p.ellipse([a-rx,b-ry,a+rx,b+ry],fill=(252,194,100,int(rng.integers(7,40))))
    # epic split light / curved celestial event
    p.ellipse([cx-w*.28,cy-h*.2,cx+w*.28,cy+h*.2],outline=(255,206,128,180),width=4)
    p.ellipse([cx-w*.19,cy-h*.14,cx+w*.19,cy+h*.14],fill=(16,18,15,250))
    p.ellipse([cx-w*.208,cy-h*.15,cx+w*.208,cy+h*.15],outline=(251,217,140,90),width=14)
    # desert ridges
    p.polygon([(0,h*.81),(w*.21,h*.75),(w*.34,h*.83),(w*.56,h*.78),(w*.8,h*.85),(w,h*.73),(w,h),(0,h)],fill=(62,35,25,165))
    p.polygon([(0,h*.89),(w*.13,h*.87),(w*.4,h*.95),(w*.66,h*.85),(w,h*.93),(w,h),(0,h)],fill=(98,51,27,180))
    # small lone cloaked explorer in original material
    px=w*.54; py=h*.78
    p.ellipse([px-10,py-95,px+9,py-65],fill=(24,21,20,245))
    p.polygon([(px-11,py-68),(px+16,py-61),(px+48,py+45),(px-25,py+47)],fill=(39,27,21,245))
    p.line([(px-5,py+41),(px-10,py+75)],fill=(21,22,19,255),width=12)
    p.line([(px+10,py+39),(px+25,py+78)],fill=(24,23,20,255),width=10)
    p.line([(px+17,py-52),(px+34,py+15)],fill=(13,13,14,255),width=7)
    # type appears in the *artwork* (not product UI)
    top_text='A WORLD BEYOND THE LIGHT'; p.text((w/2,92),top_text,font=font(15),anchor='mm',fill=(251,220,164,218),stroke_width=0)
    # intentionally original artwork title, not Dune/IMAX
    p.text((w/2,h*.59),'AFTERLIGHT',font=font(66,True),anchor='mm',fill=(254,217,149,173),stroke_width=0)
    p.text((w/2,h-52),'ORIGINAL ARTWORK  ·  CONCEPT STUDY',font=font(12),anchor='mm',fill=(253,225,178,220))
    return im

def datauri(im,quality=78):
    out=io.BytesIO();im.save(out,format='JPEG',quality=quality,optimize=True,progressive=True,subsampling=0)
    return 'data:image/jpeg;base64,'+base64.b64encode(out.getvalue()).decode()

HERO=hero(); HERO.save(D/'sample-afterlight.jpg',quality=88)
GRID=[]
for i in range(12):
    item=scene(300,400,i); item.save(D/f'sample-grid-{i+1:02}.jpg',quality=85);GRID.append(item)

BG='#0c1016'; WHITE='#f5f6f7'; GREY='#9aa1ab'; BORDER='#242932';BLUE='#5e8aff'
def txt(x,y,t,size=23,weight=400,fill=WHITE,anchor=None,spacing=0,opacity=None):
    style=f'font-family="Inter, Inter Display, DejaVu Sans, Arial, sans-serif" font-size="{size}" font-weight="{weight}" fill="{fill}"'
    if anchor:style+=f' text-anchor="{anchor}"'
    if spacing:style+=f' letter-spacing="{spacing}"'
    if opacity is not None:style+=f' opacity="{opacity}"'
    return f'<text x="{x}" y="{y}" {style}>{html.escape(str(t))}</text>'
def icon(name,x,y,size=36,color=WHITE,stroke=3,fill='none'):
    paths={
     'plus':'<path d="M12 3v18M3 12h18"/>',
     'chevron':'<path d="m6 9 6 6 6-6"/>',
     'back':'<path d="M19 12H5m7-7-7 7 7 7"/>',
     'heart':'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>',
     'more':'<circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>',
     'menu':'<path d="M4 7h16M4 13h12"/>',
     'house':'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
     'grid':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
     'grid9':''.join(f'<rect x="{a}" y="{b}" width="4.5" height="4.5" rx="0.45" fill="currentColor" stroke="none"/>' for a in (2,9.75,17.5) for b in (2,9.75,17.5)),
     'layers':'<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
     'images':'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m5 16 5-5 4 4 2-2 4 4"/><circle cx="15.5" cy="8.5" r="1"/>',
     'video':'<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m10 8 6 4-6 4z"/>',
     'search':'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 6 6"/>',
     'square-plus':'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 7v10M7 12h10"/>',
     'activity':'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
     'person':'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
     'bookmark':'<path d="M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-7-5-7 5z"/>',
     'refresh':'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2l1 2M19 15a8 8 0 0 1-14 2l-1-2"/>',
     'download':'<path d="M12 2v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
     'wand':'<path d="m4 20 14-14m-9 1 2 2M3 3l1 2M20 10l2 1M16 2l1 2M3 13l2 1M11 19l1 3"/>',
     'film':'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M4 9h16M4 15h16M8 3v18M16 3v18"/>',
     'copy':'<rect x="7" y="7" width="13" height="14" rx="3" fill="currentColor" stroke="none"/><path d="M5 17a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3"/>',
     'ellipsis':'<circle cx="12" cy="4" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="20" r="1" fill="currentColor"/>',
    }
    v=paths[name]
    return f'<g transform="translate({x-size/2:g},{y-size/2:g}) scale({size/24:g})" stroke="{color}" fill="{fill}" stroke-width="{stroke*24/size:g}" stroke-linecap="round" stroke-linejoin="round" style="color:{color}">{v}</g>'

def doc_header(identifier):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="709" height="1536" viewBox="0 0 709 1536" role="img" aria-labelledby="title desc"><title id="title">RenderLab Android {identifier} candidate</title><desc id="desc">Static design review only. Artwork is generated for layout illustration. No application functionality is implied.</desc><rect x="0" y="0" width="709" height="1536" fill="{BG}"/>'
def status(time):
    parts=[txt(29,48,time,25,700),txt(100,42,'◧',16,600),txt(135,42,'◈',16,600)]
    # WiFi/signal/battery neutral illustrations inspired by Android status icons
    parts.extend([icon('heart',552,34,18,color=WHITE,stroke=2.7),'<path d="M575 32q15-14 30 0m-24 4q9-8 17 0m-10 4h2" stroke="#f2f3f4" stroke-width="2.8" fill="none"/>',
                  '<rect x="615" y="29" width="4" height="14" rx="1" fill="#ecedef"/><rect x="621" y="26" width="4" height="17" rx="1" fill="#ecedef"/><rect x="627" y="22" width="4" height="21" rx="1" fill="#ecedef"/>',
                  '<rect x="643" y="25" width="43" height="23" rx="11" fill="#aaaeb5"/>',txt(664,43,'74',17,800,fill='#262930',anchor='middle')])
    return ''.join(parts)
def system_nav():
    return f'<rect x="0" y="1447" width="709" height="89" fill="{BG}"/>'+ '<g stroke="#d2d6d9" fill="none" stroke-width="3" stroke-linecap="round">' + '<path d="M145 1481v27M153 1481v27M161 1481v27"/><rect x="338" y="1478" width="31" height="31" rx="10"/><path d="M562 1480 548 1494 562 1507"/></g>'
def nav(selected='feed'):
    parts=['<rect x="0" y="1356" width="709" height="91" fill="#0b0f15"/><path d="M0 1356H709" stroke="#282c32" stroke-width="1"/>']
    items=[('house','feed'),('search','browse'),('square-plus','create'),('activity','activity'),('person','settings')]
    for i,(sym,name) in enumerate(items):
        x=71+141.75*i; sel=name==selected
        parts.append(icon(sym,x,1398,40 if sym=='house' else 38,color=WHITE if sel else '#f0f1f4',stroke=3.4 if sel else 2.8,fill=WHITE if sym=='house' and sel else 'none'))
        if name=='feed' and sel:parts.append('<path d="M61 1401h20v17H61z" fill="#f5f6f7"/>')
    return ''.join(parts)

def image_tag(x,y,w,h,im,clip=None):
    b=datauri(im,quality=79)
    clipatt=f' clip-path="url(#{clip})"' if clip else ''
    return f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice" href="{b}"{clipatt}/>'
