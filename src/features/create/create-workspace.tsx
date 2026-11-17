import { Clock, Dices, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const imageSlots = ["Source", "Reference 2", "Reference 3", "Reference 4"];

// Layout only. The FIBO interaction replacement will be the sole owner of UI state.
export function CreateWorkspace() {
  return (
    <section className="clear-create-workspace fibo-create mx-auto flex w-full flex-col" data-create-has-stage="false">
      <div className="clear-create-stack fibo-create-grid mx-auto w-full">
        <div className="fibo-create-controls">
          <div className="clear-create-composer relative isolate overflow-hidden rounded-[22px] border"
            data-create-instrument="true" data-create-layout="clear-composer" data-create-mode="image">
            <div className="fibo-controls-scroll">
              <section aria-labelledby="fibo-image-setup">
                <h2 id="fibo-image-setup">Image setup</h2>
                <div className="fibo-input-tiles" data-setup="edit">
                  {imageSlots.map((label) => (
                    <Button key={label} type="button" variant="ghost" className="fibo-input-slot" disabled>
                      <span>{label}</span>
                    </Button>
                  ))}
                </div>
              </section>
              <div className="fibo-prompt-heading">
                <label htmlFor="create-prompt">Prompt</label>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Recent prompts" disabled><Clock aria-hidden="true" /></Button>
              </div>
              <Textarea id="create-prompt" variant="bare" placeholder="Describe the edits you want…" disabled />
              <Button type="button" variant="ghost" disabled>Negative prompt</Button>
            </div>
            <div className="fibo-controls-dock">
              <div className="fibo-primary-settings">
                <div>
                  <label htmlFor="fibo-seed">Seed</label>
                  <span className="fibo-seed-entry">
                    <Input id="fibo-seed" type="number" value={0} disabled />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Randomize seed" disabled><Dices aria-hidden="true" /></Button>
                  </span>
                </div>
                <label htmlFor="fibo-count">Images<Input id="fibo-count" type="number" value={1} disabled /></label>
                <label className="fibo-steps-field" htmlFor="fibo-steps">
                  Steps <output>4</output>
                  <Input id="fibo-steps" type="range" min={1} max={8} value={4} disabled />
                </label>
              </div>
              <Button type="button" className="fibo-generate-action" disabled><span><Sparkles aria-hidden="true" />Generate</span></Button>
            </div>
          </div>
        </div>
        <section className="fibo-create-canvas" aria-label="Canvas">
          <div className="fibo-create-empty">
            <span className="fibo-create-watermark" aria-hidden="true">R</span>
            <p>Layout only. Create interactions are not connected.</p>
          </div>
        </section>
        <aside className="fibo-create-history" aria-labelledby="fibo-create-history-heading">
          <h2 id="fibo-create-history-heading">History</h2>
        </aside>
      </div>
    </section>
  );
}
