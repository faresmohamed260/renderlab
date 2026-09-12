"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MediaViewerCompareButton } from "@/features/library/media-viewer-comparison";
import styles from "@/features/library/media-viewer.module.css";

type ViewerPanel = "prompt" | "details" | "manage";

export function MediaViewerRegister({
  continuation,
  prompt,
  details,
  manage,
}: {
  continuation: ReactNode;
  prompt: ReactNode | null;
  details: ReactNode | null;
  manage: ReactNode;
}) {
  const [activePanel, setActivePanel] = useState<ViewerPanel | null>(null);
  const reduceMotion = useReducedMotion();

  function togglePanel(panel: ViewerPanel) {
    setActivePanel((current) => current === panel ? null : panel);
  }

  const activeContent = activePanel === "prompt"
    ? prompt
    : activePanel === "details"
      ? details
      : activePanel === "manage"
        ? manage
        : null;

  return (
    <div className={styles.registerShell} data-viewer-register>
      <div className={styles.registerPrimary}>
        <div className={styles.registerCopy}>
          <span className={styles.eyebrow}>CONTINUE FROM MEDIA</span>
          <strong>Keep the result in motion.</strong>
          <p>Use this durable asset as the starting point for the next creative step.</p>
        </div>
        <div className={styles.continueActions} aria-label="Continue from media">
          {continuation}
        </div>
      </div>

      <div className={styles.modeStrip} aria-label="Viewer information and actions">
        {prompt ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={activePanel === "prompt"}
            aria-controls="media-viewer-register-panel"
            onClick={() => togglePanel("prompt")}
          >
            Prompt
          </Button>
        ) : null}
        {details ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={activePanel === "details"}
            aria-controls="media-viewer-register-panel"
            onClick={() => togglePanel("details")}
          >
            Details
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={activePanel === "manage"}
          aria-controls="media-viewer-register-panel"
          onClick={() => togglePanel("manage")}
        >
          Manage
        </Button>
        <MediaViewerCompareButton className={styles.compareButton} />
      </div>

      <AnimatePresence initial={false}>
        {activeContent ? (
          <motion.div
            id="media-viewer-register-panel"
            key={activePanel}
            className={styles.detailPanel}
            initial={reduceMotion ? false : { height: 0, opacity: 0, y: -6 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={reduceMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0, y: -4 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
          >
            <div className={styles.detailPanelInner}>{activeContent}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
