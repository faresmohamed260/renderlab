"""RenderLab Android design-only v0.2 mockup generator.

Uses original synthetic fixture media from v0.1, no product implementation.
Outputs editable SVGs + raster review frames, with a truthful fixture model.
"""
from pathlib import Path
import os
import sys, math, re, html
from PIL import Image, ImageDraw, ImageFont
import cairosvg
import android_v02_fixtures as b

OUT=Path(os.environ.get('RENDERLAB_MOCKUP_OUTPUT', str(Path.cwd()/'renderlab-android-v02-output')))
OUT.mkdir(parents=True,exist_ok=True)
W,H=709,1536
BG=b.BG; WHITE=b.WHITE; MUTED='#98a1ae'; BD='#303640'

FIXTURES=[
  {'id':f'fixture-{i+1:02d}','source':'generated' if i%4!=1 else 'upload',
   'kind':'video' if i in (2,8) else 'image',
   'group_size':4 if i==1 else 1,
   'caption':('Afterlight','Sunlit threshold','Window study','Quiet portrait','Apartment light','Stage sketch','Palm study','Skyline reflections','Story in stillness','Gallery studies','Coastline','Night performance')[i]}
  for i in range(12)
]
assert sum(f['kind']=='video' for f in FIXTURES)==2
assert sum(f['group_size']>1 for f in FIXTURES)==1

PTH={
 'bell':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10M10 22h4"/>',
 'upload':'<path d="M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5"/>',
 'folder-plus':'<path d="M3 7h7l2 3h9v11H3zM12 14v5m-2.5-2.5h5"/>',
 'copy-arrow':'<rect x="3" y="4" width="10" height="10" rx="1"/><path d="M9 18h11M17 15l3 3-3 3M16 5h5v8"/>',
 'filter':'<path d="M3 7h18M6 12h12M9 17h6"/>',
 'sparkle':'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
 'check':'<path d="m5 13 5 5L20 7"/>',
 'warning':'<path d="M12 3 2 21h20L12 3zM12 9v5M12 17h.01"/>',
 'x':'<path d="M5 5l14 14M19 5 5 19"/>',
 'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 'chevron-right':'<path d="m9 6 6 6-6 6"/>',
 'info':'<circle cx="12" cy="12" r="10"/><path d="M12 10v7M12 7h.01"/>',
 'grid-small':'<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>',
 'folder':'<path d="M2 7h8l2 3h10v11H2z"/>',
 'close':'<path d="m4 4 16 16M20 4 4 20"/>',
}
def icon(name,x,y,size=38,color=WHITE,stroke=2.5,fill='none'):
    if name in PTH:
        return f'<g transform="translate({x-size/2:g},{y-size/2:g}) scale({size/24:g})" stroke="{color}" fill="{fill}" stroke-width="{stroke*24/size:g}" stroke-linecap="round" stroke-linejoin="round">{PTH[name]}</g>'
    return b.icon(name,x,y,size,color,stroke,fill)
def txt(x,y,t,size=24,weight=400,color=WHITE,anchor=None,letter=None):
    return b.txt(x,y,str(t),size,weight,fill=color,anchor=anchor,spacing=letter or 0)
def rect(x,y,w,h,fill,rx=0,opacity=None,stroke=None):
    att=f' opacity="{opacity}"' if opacity is not None else ''
    strokeatt=f' stroke="{stroke}"' if stroke else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"{att}{strokeatt}/>'
def line(x1,y1,x2,y2,color=BD,width=1):
    return f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{color}" stroke-width="{width}"/>'
def start(title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="709" height="1536" viewBox="0 0 709 1536" role="img" aria-labelledby="title desc"><title id="title">RenderLab Android {html.escape(title)} v0.2 review candidate</title><desc id="desc">Design-only illustration with synthetic media. No production functionality or account data.</desc>'+rect(0,0,709,1536,BG)+b.status('5:33')
def end(parts):return ''.join(parts)+'</svg>\n'
def canonical_mark(x,y,w=31,h=34,tone='mono'):
    """Copied path dimensions exactly from locked RenderLabMark in src/components/brand/renderlab-brand.tsx.
    Rendering uses mono token only; no visual re-vectorization or competing logo design.
    """
    col=WHITE if tone=='mono' else '#83a5ff'
    return f'<g transform="translate({x},{y}) scale({w/122:g},{h/132:g})" fill="{col}">'+\
     '<rect x="0" y="0" width="56" height="47" rx="4"/>'+\
     '<path d="M56 0H88A34 34 0 0 1 122 34V49A34 34 0 0 1 88 83H56Z"/>'+\
     '<rect x="0" y="73" width="48" height="59" rx="4"/>'+\
     '<path d="M75 91H89A33 33 0 0 1 122 124V132H75Q71 132 71 128V95Q71 91 75 91Z"/></g>'
def canonical_wordmark_center(cx=354,y=135):
    # Locked mark geometry + exact wordpart weights/letter-spacing ratio.
    # Android production must render this from a licensed/system font, not as a baked-in raster.
    return canonical_mark(cx-145,y-33,32,35)+\
       f'<text x="{cx-101}" y="{y}" font-family="Roboto, DejaVu Sans, Arial, sans-serif" font-size="39" letter-spacing="-1.4" fill="{WHITE}"><tspan font-weight="700">Render</tspan><tspan font-weight="400">Lab</tspan></text>'
def main_nav(selected='feed'):
    parts=[rect(0,1356,709,91,'#0b0f15'),line(0,1356,709,1356,'#222730')]
    items=[('house','feed'),('search','browse'),('square-plus','create'),('bell','activity'),('person','settings')]
    for i,(sym,key) in enumerate(items):
        x=71+141.75*i;active=key==selected
        parts.append(icon(sym,x,1399,41 if active else 38,color=WHITE if active else '#acb2bc',stroke=3.25 if active else 2.8,fill=WHITE if key=='feed' and active else 'none'))
        if active and key=='feed':parts.append(rect(x-11,1397,22,21,WHITE))
        if active and key=='browse':parts.append(f'<path d="M{x-12:.1f} 1426H{x+12:.1f}" stroke="#e9ecf1" stroke-width="2.7"/>')
    parts.append(b.system_nav())
    return ''.join(parts)
def system_only():return b.system_nav()
def root_header(section='feed'):
    parts=[]
    if section=='feed':parts.append(icon('plus',44,119,50,stroke=3.4))
    else:parts.append(icon('search',47,120,43,stroke=2.8))
    parts.append(canonical_wordmark_center())
    parts.append(icon('bell' if section=='feed' else 'ellipsis',658,120,43,stroke=3))
    # no notification dot until a real actionable job exists
    return ''.join(parts)
def media_badge(item,x,y,w):
    if item['kind']=='video':
        return '<g>'+rect(x+w-54,y+12,40,40,'#141820',rx=10,opacity=0.82)+icon('video',x+w-34,y+32,30,stroke=2.6)+'</g>'
    if item['group_size']>1:
        return '<g>'+rect(x+w-54,y+12,40,40,'#141820',rx=10,opacity=.84)+icon('copy',x+w-34,y+32,28,stroke=2.6)+'</g>'
    return ''
def four_tabs(selected='Items',show_text=True):
    # Items / Collections / Generated / Uploads — all map to real Library concepts.
    # Proposed Albums is intentionally excluded until its backend lifecycle is approved.
    names=['Items','Collections','Generated','Uploads']
    symbols=['grid9','folder','sparkle','upload']
    out=[]
    for i,(label,mark) in enumerate(zip(names,symbols)):
        x=(i+.5)*(W/4)
        active=selected==label
        out.append(icon(mark,x,215,42 if i==0 else 38,WHITE if active else '#979eaa',stroke=2.7))
        if show_text:out.append(txt(x,249,label,14,600 if active else 450,WHITE if active else '#a7aebb',anchor='middle'))
        if active:out.append(rect(i*W/4+26,261,W/4-52,4,'#e9eaef',rx=1))
    return ''.join(out)
def tiles(clip_bottom=1447, start_y=265, indices=None):
    # v0.2 uses single images without any badge; only asset metadata controls overlays.
    ids=list(range(12)) if indices is None else indices
    out=[f'<defs><clipPath id="tilesClip"><rect x="0" y="{start_y}" width="709" height="{clip_bottom-start_y}"/></clipPath></defs><g clip-path="url(#tilesClip)">']
    cw=236.0; ch=315.0; seam=1.7
    for j,i in enumerate(ids):
        row,col=divmod(j,3);x=round(col*(W/3),2);y=round(start_y+row*(ch+seam),2)
        out.append(b.image_tag(x,y,cw,ch,b.GRID[i]))
        out.append(media_badge(FIXTURES[i],x,y,cw))
    out.append('</g>')
    return ''.join(out)
def feed_actions(y=1253):
    # Fav / Reuse / eligible Edit / Download / Collection.
    choices=[('heart',45,44),('copy-arrow',161,41),('wand',275,39),('download',397,40),('folder-plus',665,40)]
    return ''.join(icon(s,x,y,z,stroke=2.9) for s,x,z in choices)
def feed():
    parts=[start('Library Feed'),root_header('feed')]
    parts.extend([rect(0,194,709,90,BG),'<circle cx="55" cy="239" r="28" fill="#d5a647"/>','<circle cx="55" cy="239" r="24" fill="#2b2219"/>',txt(55,247,'R',27,700,'#f4ce86','middle'),txt(107,246,'Afterlight',29,650),txt(109,273,'Generated image · Today',16,400,MUTED),icon('more',664,238,42,stroke=2.5)])
    parts.append(b.image_tag(0,285,709,888,b.HERO))
    # Shared fixture object: current item index=0 of a 4-media group.
    slides=[f'afterlight-frame-{i}' for i in range(4)];index=0
    count=len(slides)
    parts.extend([rect(597,311,85,53,'#141619',rx=28,opacity=.8),txt(640,346,f'{index+1}/{count}',24,550,WHITE,'middle')])
    for i in range(count):parts.append(f'<circle cx="{333+14*i}" cy="1199" r="{5.5 if i==index else 4.2}" fill="{b.BLUE if i==index else "#757b88"}"/>')
    parts.append(feed_actions())
    parts.extend([txt(23,1324,'Afterlight',25,700),txt(167,1324,'Cinematic desert exploration',23,400),txt(23,1347,'Created today · Image',17,400,MUTED)])
    parts.append(main_nav('feed'))
    return end(parts)
def browse(root=True):
    parts=[start('Browse Library root' if root else 'Contextual Library Collection')]
    if root:
        parts.extend([root_header('browse'),four_tabs('Items',True),tiles(1356),main_nav('browse')])
    else:
        # Screenshot B's contextual back-only composition, via a collection selection.
        parts.extend([icon('back',44,119,46,stroke=3),txt(117,134,'Landscapes',41,650),icon('more',664,119,43,stroke=2.7),four_tabs('Items',False),tiles(1447),system_only()])
    return end(parts)
def contextual():return browse(False)
def overlay_sheet(base_svg,mode='filter'):
    # Render actual sheet as separately reviewed state, not a screenshot claim of working click.
    # XML snippets inserted before root closing tag.
    base=base_svg.removesuffix('</svg>\n')
    parts=[base,rect(0,0,709,1536,'#020306',opacity=.62),rect(0,536,709,912,'#151a22',rx=28),rect(294,559,122,7,'#59616c',rx=4)]
    if mode=='filter':
        parts.extend([txt(32,620,'Browse controls',34,700),icon('x',664,603,36,stroke=2.5),line(0,648,709,648)])
        parts.extend([icon('search',57,704,32,stroke=2.6),txt(100,714,'Search media',28,500),icon('chevron-right',656,704,32,stroke=2.4),line(30,750,680,750)])
        parts.extend([icon('upload',57,811,32,stroke=2.6),txt(100,822,'Upload media',28,500),icon('chevron-right',656,810,32,stroke=2.4),line(30,854,680,854)])
        parts.append(txt(32,908,'SOURCE',18,650,MUTED))
        for i,(label,w) in enumerate([('All',160),('Generated',226),('Uploads',202)]):
            x=[32,207,447][i]; parts.append(rect(x,928,w,61,'#303a48' if i==0 else '#1e2530',rx=12,stroke='#7b98bc' if i==0 else '#3d4652'));parts.append(txt(x+w/2,967,label,23,600 if i==0 else 450,WHITE if i==0 else MUTED,'middle'))
        parts.append(txt(32,1041,'MEDIA TYPE',18,650,MUTED))
        for i,(label,w) in enumerate([('Images',185),('Videos',185)]):
            x=32+i*202;parts.append(rect(x,1061,w,55,'#303a48' if i==0 else '#1e2530',rx=11));parts.append(txt(x+w/2,1097,label,23,550,WHITE,'middle'))
        parts.extend([line(30,1156,680,1156),icon('heart',57,1204,32),txt(100,1214,'Favorites',27,500),txt(649,1214,'Off',22,450,MUTED,'end'),line(30,1254,680,1254),icon('filter',57,1306,32),txt(100,1315,'Sort',27,500),txt(649,1315,'Newest',22,450,MUTED,'end')])
    else:
        parts.extend([txt(32,620,'Afterlight · Media actions',32,700),icon('x',663,608,34),line(0,652,709,652)])
        rows=[('heart','Favorite','Save to Favorites'),('copy-arrow','Reuse in Create','Use as creative input'),('wand','Edit image','Only when asset and model are eligible'),('download','Download','Save a local copy'),('folder-plus','Add to Collection','Organize your Library')]
        for i,(sym,primary,sub) in enumerate(rows):
            y=718+i*129
            parts.extend([icon(sym,57,y+1,36),txt(104,y,primary,27,550),txt(104,y+33,sub,20,400,MUTED),line(36,y+74,673,y+74,'#343b45')])
        parts.extend([txt(35,1414,'Actions depend on asset type and permissions.',18,450,MUTED)])
    parts.append(b.system_nav());return end(parts)
def scrolled_feed():
    # One scrolled state demonstrates previous metadata and next item above fixed dock.
    parts=[start('Scrolled Library Feed'),root_header('feed')]
    parts.append('<defs><clipPath id="feedWindow"><rect x="0" y="177" width="709" height="1179"/></clipPath></defs><g clip-path="url(#feedWindow)">')
    # End of first item's media; intentional scrolled offset -690.
    parts.append(b.image_tag(0,178,709,410,b.HERO))
    for i in range(4):parts.append(f'<circle cx="{333+i*14}" cy="606" r="{5.5 if i==0 else 4.2}" fill="{b.BLUE if i==0 else "#757b88"}"/>')
    parts.append(feed_actions(665))
    parts.extend([txt(23,736,'Afterlight',28,700),txt(165,736,'Cinematic desert exploration',24,400),txt(23,772,'Generated today · Image',19,400,MUTED),line(0,804,709,804)])
    # Next item visible proving continuous feed and bottom inset.
    parts.extend(['<circle cx="54" cy="850" r="25" fill="#384753"/>',txt(54,857,'U',25,700,WHITE,'middle'),txt(99,850,'Sunlit threshold',26,600),txt(100,876,'Uploaded · Yesterday',18,400,MUTED),icon('more',660,853,42,stroke=2.5)])
    parts.append(b.image_tag(0,896,709,480,b.GRID[1]))
    parts.append('</g>');parts.append(main_nav('feed'))
    return end(parts)
def empty_browse():
    parts=[start('Empty Library Browse'),root_header('browse'),four_tabs('Items',True)]
    parts.extend([icon('images',355,659,100,color='#b5beca',stroke=2.5),txt(354,789,'No media yet',35,650,WHITE,'middle'),txt(354,832,'Your generated and uploaded media',22,450,MUTED,'middle'),txt(354,867,'will appear here.',22,450,MUTED,'middle'),rect(215,916,279,68,'#edf0f5',rx=15),icon('upload',244,949,31,color='#1b222d',stroke=2.5),txt(373,959,'Upload media',23,600,'#171e29','middle')])
    parts.append(main_nav('browse'));return end(parts)
def focus_browse():
    parts=[start('Browse keyboard focus state'),root_header('browse'),four_tabs('Items',True),tiles(1356)]
    # Accessible visual focus indicator; actual TalkBack/keyboard roles still need native runtime verification.
    parts.extend([rect(202,179,131,88,'none',rx=9,stroke='#85b8ff')])
    parts.append(main_nav('browse'));return end(parts)

def loading_browse():
    parts=[start('Browse loading state'),root_header('browse'),four_tabs('Items',True)]
    for row in range(4):
        for col in range(3):
            parts.append(rect(col*236.34,265+row*316.7,236,315,'#252c36',rx=1))
    parts.extend([rect(163,976,384,69,'#151e2a',rx=20),txt(355,1022,'Loading your media…',24,500,WHITE,'middle')])
    parts.append(main_nav('browse'));return end(parts)
def error_browse():
    parts=[start('Browse load error'),root_header('browse'),four_tabs('Items',True),icon('warning',355,639,96,color='#eec1ab',stroke=2.5),txt(355,755,'Couldn\'t load media',33,650,WHITE,'middle'),txt(355,809,'Your media is unchanged.',22,400,MUTED,'middle'),rect(217,872,275,69,'#edf0f4',rx=13),txt(355,918,'Retry',26,650,'#19202a','middle')]
    parts.append(main_nav('browse'));return end(parts)
def signed_out():
    parts=[start('Library sign-in required'),root_header('feed')]
    parts.extend([icon('person',355,628,100,color='#c3cdd9',stroke=2.5),txt(355,752,'Your Library is private',31,650,WHITE,'middle'),txt(355,805,'Sign in to view your media.',23,400,MUTED,'middle'),rect(201,863,307,70,'#edf0f4',rx=14),txt(354,910,'Sign in',26,650,'#19202a','middle')])
    parts.append(main_nav('feed'));return end(parts)
def delete_confirmation():
    parts=[feed().removesuffix('</svg>\n'),rect(0,0,709,1536,'#00040a',opacity=.67),rect(41,588,627,340,'#1d232d',rx=20),icon('warning',98,659,40,color='#e0aca6'),txt(136,667,'Delete this media?',33,700),txt(91,738,'This action removes the saved item',23,400,MUTED),txt(91,774,'from your private Library.',23,400,MUTED),rect(87,819,248,66,'#a43542',rx=11),txt(211,861,'Delete',25,650,WHITE,'middle'),rect(373,819,246,66,'#394353',rx=11),txt(496,861,'Cancel',25,650,WHITE,'middle')]
    return end(parts)

SCREENS={
 'feed':feed(),
 'browse':browse(True),
 'collection':contextual(),
 'filters':overlay_sheet(browse(True),'filter'),
 'media-actions':overlay_sheet(feed(),'actions'),
 'scrolled-feed':scrolled_feed(),
 'empty-library':empty_browse(),
 'keyboard-focus':focus_browse(),
 'loading-library':loading_browse(),
 'error-library':error_browse(),
 'signed-out':signed_out(),
 'delete-confirmation':delete_confirmation(),
}
for name,svg in SCREENS.items():
    assert svg.endswith('</svg>\n') and svg.count('<svg')>=1
    (OUT/f'renderlab-android-{name}-v02.svg').write_text(svg,encoding='utf-8',newline='\n')
    cairosvg.svg2png(bytestring=svg.encode('utf-8'),write_to=str(OUT/f'renderlab-android-{name}-v02.png'))
    print(name, 'SVG',len(svg),'PNG',(OUT/f'renderlab-android-{name}-v02.png').stat().st_size)
# Three-in-one hero comparison at original size, no downsizing embedded media.
for names,output in [(['feed','browse','collection'],'renderlab-android-navigation-v02.png'),(['feed','filters','media-actions'],'renderlab-android-controls-v02.png'),(['scrolled-feed','empty-library','keyboard-focus'],'renderlab-android-states-v02.png')]:
    gap=20; im=Image.new('RGB',(709*3+gap*2,1536),(23,27,34))
    for i,name in enumerate(names):im.paste(Image.open(OUT/f'renderlab-android-{name}-v02.png').convert('RGB'),(i*(709+gap),0))
    im.save(OUT/output,optimize=True)
print('DONE')
