"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { RenderLabBrand } from "@/components/brand/renderlab-brand";
import { Button } from "@/components/ui/button";

import styles from "./landing-experience.module.css";

const canonicalBottomRightPath = "M75 91H89A33 33 0 0 1 122 124V132H75Q71 132 71 128V95Q71 91 75 91Z";
const bottomRightMaskPath =
  "M0.078431 0H0.352941A0.647059 0.804878 0 0 1 1 0.804878V1H0.078431Q0 1 0 0.902439V0.097561Q0 0 0.078431 0Z";

const media = {
  portrait:
    "https://images.unsplash.com/photo-1778973810380-46a63ff83d61?auto=format&fit=crop&w=1400&q=84",
  mountain:
    "https://images.unsplash.com/photo-1770802238220-c4db8c2cc4f5?auto=format&fit=crop&w=1800&q=84",
  car:
    "https://images.unsplash.com/photo-1767272374026-178111631eca?auto=format&fit=crop&w=1400&q=84",
  jelly:
    "https://images.unsplash.com/photo-1507426592025-e460fda3be31?auto=format&fit=crop&w=1400&q=84",
  material:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=82",
  structure:
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=82",
} as const;

const threadSteps = [
  ["01", "Create", "Start from an idea."],
  ["02", "References", "Shape the same work."],
  ["03", "Motion", "Turn the frame into movement."],
  ["04", "Continue", "Keep it in your Library."],
] as const;

const libraryItems = [
  {
    title: "First light study",
    meta: "Image · Saved to Library",
    actions: ["Edit", "Animate", "Upscale 2×"],
    image: media.mountain,
    type: "IMAGE / RESULT",
    style: { left: "2%", top: "10%", width: "32%", height: "44%" },
  },
  {
    title: "Portrait reference",
    meta: "Uploaded image · Reusable reference",
    actions: ["Use in Create", "Edit", "Animate"],
    image: media.portrait,
    type: "IMAGE / REFERENCE",
    style: { left: "36%", top: "2%", width: "20%", height: "34%" },
  },
  {
    title: "Motion test",
    meta: "Video · Saved to Library · 00:05",
    actions: ["Open", "Download"],
    image: media.car,
    type: "VIDEO / 00:05",
    style: { left: "58%", top: "13%", width: "38%", height: "35%" },
  },
  {
    title: "Atmosphere study",
    meta: "Image · Collection: Ideas",
    actions: ["Edit", "Animate", "Favorite"],
    image: media.jelly,
    type: "IMAGE / COLLECTION",
    style: { left: "7%", top: "58%", width: "26%", height: "31%" },
  },
  {
    title: "Material study",
    meta: "Image · Saved to Library",
    actions: ["Edit", "Upscale 2×", "Download"],
    image: media.material,
    type: "IMAGE / SAVED",
    style: { left: "36%", top: "44%", width: "28%", height: "43%" },
  },
  {
    title: "Structure study",
    meta: "Image · Saved to Library",
    actions: ["Use in Create", "Rename", "Download"],
    image: media.structure,
    type: "IMAGE / SAVED",
    style: { left: "67%", top: "54%", width: "28%", height: "35%" },
  },
] as const;

const resolveTiles = [
  { image: media.mountain, label: "01 · IMAGE", dx: -118, dy: 76, scale: 0.86, rotate: -7 },
  { image: media.portrait, label: "02 · REFERENCE", dx: 102, dy: -92, scale: 0.74, rotate: 6 },
  { image: media.car, label: "03 · MOTION", dx: -136, dy: -72, scale: 1.04, rotate: -5 },
  { image: media.jelly, label: "04 · SAVED", dx: 120, dy: 95, scale: 0.8, rotate: 7 },
] as const;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function pointerVector(event: ReactPointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1,
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1,
  };
}

function GeometryDefs() {
  return (
    <svg className={styles.geometryDefs} width="0" height="0" aria-hidden="true">
      <defs>
        <clipPath
          id="renderlab-br-quarter-mask"
          clipPathUnits="objectBoundingBox"
          data-renderlab-br-source={canonicalBottomRightPath}
        >
          <path d={bottomRightMaskPath} />
        </clipPath>
      </defs>
    </svg>
  );
}

export function LandingExperience() {
  const reduceMotion = useReducedMotion();
  const threadRef = useRef<HTMLElement>(null);
  const resolveRef = useRef<HTMLElement>(null);
  const [threadStep, setThreadStep] = useState(0);
  const [activeLibrary, setActiveLibrary] = useState(0);
  const [resolveProgress, setResolveProgress] = useState(0);
  const [heroPointer, setHeroPointer] = useState({ x: 0, y: 0 });
  const [threadPointer, setThreadPointer] = useState({ x: 0, y: 0 });

  const { scrollYProgress: threadProgress } = useScroll({
    target: threadRef,
    offset: ["start start", "end end"],
  });
  const { scrollYProgress: resolveScrollProgress } = useScroll({
    target: resolveRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(threadProgress, "change", (value) => {
    if (reduceMotion) {
      setThreadStep(3);
      return;
    }
    const next = Math.min(3, Math.floor(clamp(value) * 4));
    setThreadStep(next);
  });

  useMotionValueEvent(resolveScrollProgress, "change", (value) => {
    setResolveProgress(reduceMotion ? 1 : clamp(value));
  });

  const heroStyle = {
    "--hero-x": reduceMotion ? "0px" : `${heroPointer.x}px`,
    "--hero-y": reduceMotion ? "0px" : `${heroPointer.y}px`,
  } as CSSProperties;

  const stageStyle = {
    "--stage-x": reduceMotion ? "0px" : `${threadPointer.x * 7}px`,
    "--stage-y": reduceMotion ? "0px" : `${threadPointer.y * 5}px`,
    "--stage-rx": reduceMotion ? "0deg" : `${threadPointer.y * -1.3}deg`,
    "--stage-ry": reduceMotion ? "0deg" : `${threadPointer.x * 1.6}deg`,
  } as CSSProperties;

  return (
    <main className={styles.page} data-landing-experience="approved-lab-matrix">
      <GeometryDefs />
      <header className={styles.nav}>
        <Link href="/" aria-label="RenderLab home" className={styles.brandLink}>
          <RenderLabBrand markClassName="size-7" textClassName="text-base" />
        </Link>
        <div className={styles.navActions}>
          <Button asChild variant="ghost" size="sm" className={styles.signInButton}>
            <Link href="/settings">Sign in</Link>
          </Button>
          <Button asChild size="sm" className={styles.openButton}>
            <Link href="/create">Open Create</Link>
          </Button>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="landing-hero-title" data-landing-section="hero">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Creative image &amp; video workspace</p>
            <h1 id="landing-hero-title">
              <span>Render what</span>
              <span>you imagine.</span>
            </h1>
            <p className={styles.dek}>Create images. Shape them with references. Put them in motion. Keep the thread alive.</p>
            <div className={styles.heroActions}>
              <Button asChild size="lg" className={styles.heroPrimary}>
                <Link href="/create">Open Create</Link>
              </Button>
              <span className={styles.truth}>Closed beta · invitation only</span>
            </div>
          </div>

          <div className={styles.heroMatrixWrap}>
            <div className={styles.heroHalo} aria-hidden="true" />
            <div
              className={styles.heroMatrix}
              style={heroStyle}
              onPointerMove={(event) => {
                if (reduceMotion || event.pointerType === "touch") return;
                const vector = pointerVector(event);
                setHeroPointer({ x: vector.x * 15, y: vector.y * 13 });
              }}
              onPointerLeave={() => setHeroPointer({ x: 0, y: 0 })}
              aria-label="Four creative states arranged as the RenderLab Lab Grid R"
            >
              <HeroCell className={styles.heroTopLeft} image={media.portrait} index="01" title="Create" detail="Image" />
              <HeroCell className={styles.heroUpperRight} image={media.mountain} index="02" title="Shape" detail="With references" />
              <HeroCell className={styles.heroBottomLeft} image={media.car} index="03" title="Set in motion" detail="Video" motion />
              <HeroCell className={`${styles.heroBottomRight} ${styles.quarterArc}`} image={media.jelly} index="04" title="Keep" detail="And continue" quarterArc />
              <span className={`${styles.matrixAxis} ${styles.axisX}`} aria-hidden="true" />
              <span className={`${styles.matrixAxis} ${styles.axisY}`} aria-hidden="true" />
              <span className={styles.matrixStatus} aria-hidden="true">LIVE CREATIVE THREAD <i /> 04 STATES</span>
            </div>
          </div>
        </div>
        <div className={styles.heroFoot} aria-hidden="true">
          <span>CREATE IMAGE</span><span>EDIT IMAGE</span><span>CREATE VIDEO</span><span>ANIMATE IMAGE</span>
        </div>
      </section>

      <section ref={threadRef} className={styles.thread} aria-labelledby="thread-title" data-landing-section="thread">
        <div className={styles.threadPin}>
          <div className={styles.threadCopy}>
            <p className={styles.eyebrow}>One creative thread</p>
            <h2 id="thread-title">Make it.<br />Shape it.<br />Move it.<br /><span>Keep going.</span></h2>
            <p className={styles.dek}>RenderLab keeps the work in context. Create an image, bring in references, put it in motion, then continue from the result without starting over.</p>
            <ol className={styles.threadSteps} aria-label="Creative workflow">
              {threadSteps.map(([number, title, description], index) => (
                <li key={title} className={index === threadStep ? styles.activeStep : undefined}>
                  <span>{number}</span><strong>{title}</strong><small>{description}</small>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.threadStageWrap}>
            <div
              className={styles.threadStage}
              data-active={threadStep}
              style={stageStyle}
              onPointerMove={(event) => {
                if (reduceMotion || event.pointerType === "touch") return;
                const vector = pointerVector(event);
                setThreadPointer(vector);
              }}
              onPointerLeave={() => setThreadPointer({ x: 0, y: 0 })}
            >
              <div className={styles.threadMediaShell}>
                <img className={styles.threadMedia} src={media.mountain} alt="Misty mountain range carried through one creative workflow" />
                <span className={styles.threadLight} aria-hidden="true" />
                <ThreadState index={0} current={threadStep} className={styles.threadCreate} label="01 / CREATE">
                  <div className={styles.promptBar}><span>A solitary figure above a luminous mountain sea at first light</span><i>↗</i></div>
                </ThreadState>
                <ThreadState index={1} current={threadStep} className={styles.threadReference} label="02 / REFERENCES">
                  <div className={styles.referenceStack} aria-hidden="true">
                    <div><img src={media.portrait} alt="" /></div>
                    <div><img src={media.jelly} alt="" /></div>
                    <span>@image1&nbsp;&nbsp; @image2</span>
                  </div>
                  <div className={styles.referenceFrame} aria-hidden="true"><i /><i /><i /><i /></div>
                </ThreadState>
                <ThreadState index={2} current={threadStep} className={styles.threadMotion} label="03 / MOTION">
                  <div className={styles.motionPath} aria-hidden="true"><i /><i /><i /></div>
                  <div className={styles.timeline} aria-hidden="true"><span>00:00</span><b><i /></b><span>00:05</span></div>
                </ThreadState>
                <ThreadState index={3} current={threadStep} className={styles.threadContinue} label="04 / LIBRARY">
                  <div className={styles.libraryStackMini} aria-hidden="true"><i /><i /><i /></div>
                  <div className={styles.savedChip}><i /><span>Saved to Library</span><small>Ready to continue</small></div>
                </ThreadState>
              </div>
              <div className={styles.threadMeta} aria-hidden="true"><span>CREATIVE THREAD / 001</span><span>{threadSteps[threadStep][1].toUpperCase()}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.library} aria-labelledby="library-title" data-landing-section="library">
        <header className={styles.libraryIntro}>
          <p className={styles.eyebrow}>Living Library</p>
          <h2 id="library-title">Every result<br /><span>stays alive.</span></h2>
          <p className={styles.dek}>Generated and uploaded media stay useful after the first result. Find the work again, bring it back into Create, and keep moving from what already exists.</p>
        </header>
        <div className={styles.libraryShell}>
          <div className={styles.libraryMeta} aria-hidden="true"><span>LIBRARY / 006 MEDIA</span><span>DURABLE CREATIVE WORK</span></div>
          <div className={styles.libraryField} data-active={activeLibrary} aria-label="Reusable RenderLab media examples">
            {libraryItems.map((item, index) => {
              const active = activeLibrary === index;
              const side = index < activeLibrary ? -1 : 1;
              const itemStyle = {
                ...item.style,
                "--yield-x": active ? "0px" : `${side * 22}px`,
                "--yield-y": active ? "-8px" : `${(index % 2 === 0 ? 1 : -1) * 8}px`,
                "--yield-scale": active ? "1.035" : "0.94",
              } as CSSProperties;
              return (
                <Button
                  key={item.title}
                  variant="ghost"
                  className={`${styles.libraryCard} ${active ? styles.activeLibraryCard : ""}`}
                  style={itemStyle}
                  data-library-card={index}
                  aria-pressed={active}
                  aria-label={`${item.title}. ${item.meta}`}
                  onPointerEnter={(event) => event.pointerType !== "touch" && setActiveLibrary(index)}
                  onFocus={() => setActiveLibrary(index)}
                  onClick={() => setActiveLibrary(index)}
                >
                  <img src={item.image} alt="" />
                  <span className={styles.cardShade} aria-hidden="true" />
                  {index === 2 ? <span className={styles.scan} aria-hidden="true" /> : null}
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <small>{item.type}</small>
                  <strong>{item.title}</strong>
                </Button>
              );
            })}
          </div>
          <aside className={styles.libraryFocus} aria-live="polite" aria-label="Selected media context">
            <div className={styles.focusThread} aria-hidden="true"><span /><i /><span /><i /><span /></div>
            <p>SOURCE <b>→</b> RESULT <b>→</b> CONTINUE</p>
            <h3>{libraryItems[activeLibrary].title}</h3>
            <small>{libraryItems[activeLibrary].meta}</small>
            <div className={styles.libraryActions} aria-label="Compatible next actions">
              {libraryItems[activeLibrary].actions.map((action) => <span key={action}>{action}</span>)}
            </div>
          </aside>
        </div>
        <footer className={styles.libraryTruth} aria-hidden="true"><span>SEARCH</span><span>FAVORITES</span><span>COLLECTIONS</span><span>CONTINUE</span></footer>
      </section>

      <section ref={resolveRef} className={styles.resolve} aria-labelledby="resolve-title" data-landing-section="resolve">
        <div className={styles.resolvePin}>
          <div className={styles.resolveCopy}>
            <Link href="/" aria-label="RenderLab home" className={styles.closeBrand}>
              <RenderLabBrand markClassName="size-8" textClassName="text-base" />
            </Link>
            <div className={styles.resolveCopyBody}>
              <p className={styles.eyebrow}>Resolve to Create</p>
              <h2 id="resolve-title">Keep the thread<br /><span>moving.</span></h2>
              <p className={styles.dek}>Your work stays ready for what comes next. Open Create to keep shaping it, or sign in to return to your workspace.</p>
              <div className={styles.accessTruth}><i /><span>Closed beta · invitation only</span></div>
              <div className={styles.resolveActions}>
                <Button asChild size="lg" className={styles.resolvePrimary}>
                  <Link href="/create">Open Create <ArrowUpRight aria-hidden="true" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className={styles.resolveSecondary}>
                  <Link href="/settings">Sign in</Link>
                </Button>
              </div>
              <p className={styles.noSignup}>No public sign-up</p>
            </div>
          </div>

          <div className={styles.resolveVisual} aria-label="Creative media resolving into the RenderLab modular R structure">
            <div className={styles.resolveMeta} aria-hidden="true"><span>LIBRARY / ACTIVE THREAD</span><span>RESOLVE {String(Math.round(resolveProgress * 100)).padStart(3, "0")}</span></div>
            <div className={styles.resolveStage}>
              <div className={styles.resolveR}>
                {resolveTiles.map((tile, index) => {
                  const p = reduceMotion ? 1 : resolveProgress;
                  const style = {
                    transform: `translate3d(${lerp(tile.dx, 0, p)}px, ${lerp(tile.dy, 0, p)}px, 0) scale(${lerp(tile.scale, 1, p)}) rotate(${lerp(tile.rotate, 0, p)}deg)`,
                  } as CSSProperties;
                  return (
                    <motion.div
                      key={tile.label}
                      className={`${styles.resolveTile} ${styles[`resolveTile${index}`]} ${index === 3 ? styles.quarterArc : ""}`}
                      style={style}
                      data-resolve-tile={index}
                      data-quarter-arc={index === 3 ? "locked" : undefined}
                    >
                      <img src={tile.image} alt="" />
                      <span>{tile.label}</span>
                    </motion.div>
                  );
                })}
              </div>
              <motion.div className={`${styles.peripheral} ${styles.peripheralA}`} style={{ opacity: 1 - resolveProgress }} aria-hidden="true"><img src={media.material} alt="" /></motion.div>
              <motion.div className={`${styles.peripheral} ${styles.peripheralB}`} style={{ opacity: 1 - resolveProgress }} aria-hidden="true"><img src={media.structure} alt="" /></motion.div>
            </div>
            <div className={styles.resolveCaption} aria-hidden="true"><span>CREATE</span><i /><span>SHAPE</span><i /><span>MOTION</span><i /><span>KEEP</span></div>
          </div>
        </div>
      </section>

      <footer className={styles.siteFooter}>
        <Link href="/" aria-label="RenderLab home"><RenderLabBrand markClassName="size-6" textClassName="text-sm" /></Link>
        <span>Creative image &amp; video workspace · Closed beta</span>
        <div><Link href="/create">Open Create</Link><Link href="/settings">Sign in</Link></div>
      </footer>
    </main>
  );
}

function HeroCell({
  className,
  image,
  index,
  title,
  detail,
  motion: hasMotion = false,
  quarterArc = false,
}: {
  className: string;
  image: string;
  index: string;
  title: string;
  detail: string;
  motion?: boolean;
  quarterArc?: boolean;
}) {
  return (
    <article className={`${styles.heroCell} ${className}`} data-quarter-arc={quarterArc ? "locked" : undefined}>
      <img src={image} alt="" />
      <span className={styles.cardShade} aria-hidden="true" />
      <span className={styles.cellLabel}><b>{index}</b><strong>{title}</strong><small>{detail}</small></span>
      {hasMotion ? <span className={styles.motionStreak} aria-hidden="true" /> : null}
    </article>
  );
}

function ThreadState({
  index,
  current,
  className,
  label,
  children,
}: {
  index: number;
  current: number;
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.threadState} ${className} ${current === index ? styles.activeThreadState : ""}`} aria-hidden={current !== index}>
      <span className={styles.stateIndex}>{label}</span>
      {children}
    </div>
  );
}
