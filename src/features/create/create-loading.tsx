import { ArrowUp } from "lucide-react";
import styles from "./create-loading.module.css";

function Placeholder({ className = "", width, height, radius }: { className?: string; width?: number | string; height?: number; radius?: number }) {
  return <div className={styles.placeholder + " " + className} style={{ width, height, borderRadius: radius }} />;
}

export function CreateLoading() {
  return (
    <div className={styles.workspace} data-route-loading="create" role="status" aria-label="Loading Create">
      <div className={styles.desktop} aria-hidden="true">
        <div className={styles.rail + " rl-glass-panel"}>
          <Placeholder width={110} height={16} radius={8} />
          <div className={styles.sessions}>
            {[0,1,2].map(index => <div key={index} className={styles.session}>
              <Placeholder width={56} height={56} radius={14} />
              <div className={styles.sessionText}><Placeholder height={14} radius={7} /><Placeholder width="60%" height={11} radius={6} /></div>
            </div>)}
          </div>
          <div className={styles.search}>
            <Placeholder width={130} height={16} radius={8} />
            <Placeholder height={42} radius={21} />
            <div className={styles.prompts}>
              {[0,1].map(index => <div key={index}><Placeholder height={14} radius={7} /><Placeholder width="78%" height={14} radius={7} /></div>)}
            </div>
          </div>
        </div>
        <div className={styles.center}>
          <Placeholder className={styles.stage} />
          <div className={styles.actions}>{[104,140,132,44,44].map((width,index) => <Placeholder key={index} width={width} height={44} radius={22} />)}</div>
          <div className={styles.promptCard + " rl-glass-panel"}><Placeholder width={124} height={14} radius={7} /><Placeholder height={14} radius={7} /><Placeholder width="78%" height={14} radius={7} /></div>
        </div>
        <div className={styles.composer + " rl-glass-panel"}>
          <Placeholder height={48} radius={24} />
          <Placeholder height={132} radius={20} />
          <div className={styles.references}>{[0,1,2].map(index => <Placeholder key={index} width={64} height={64} radius={18} />)}</div>
          <div className={styles.shapes}>{[52,52,60,52].map((width,index) => <Placeholder key={index} width={width} height={36} radius={18} />)}</div>
          <Placeholder height={200} radius={20} />
          <div className={styles.generate}>Generate</div>
        </div>
      </div>
      <div className={styles.phone} aria-hidden="true">
        <Placeholder className={styles.phoneStage} />
        <div className={styles.dots}>{[18,6,6].map((width,index) => <Placeholder key={index} width={width} height={6} radius={3} />)}</div>
        <div className={styles.phoneComposer}>
          <div className={styles.staticPrompt} />
          <div className={styles.phoneControls}>
            {[44,76,56,44].map((width,index) => <div className={styles.staticPill} key={index} style={{width}} />)}
            <div className={styles.phoneGenerate}><ArrowUp size={22} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
