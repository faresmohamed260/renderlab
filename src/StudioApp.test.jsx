import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Composer, GenerationCard, ProviderSettings, WorkflowsPage, resolveFluxDimensions } from "./StudioApp";
import { studioApi } from "./studioApi";

vi.mock("./studioApi", () => ({
  studioApi: { generate: vi.fn(), upload: vi.fn(), providerSettings: vi.fn(), saveProviderKey: vi.fn(), removeProviderKey: vi.fn(), modelDownloads: vi.fn(), models: vi.fn(), startModelDownload: vi.fn(), cancelModelDownload: vi.fn(), retryModelDownload: vi.fn() },
}));

const imageWorkflow = {
  id: "simple", display_name: "Simple Image", description: "Prompt only", ui: {},
  defaults: { aspect_ratio: "1:1" },
  inputs: [{ id: "prompt", type: "text", label: "Prompt" }],
  parameters: [{ id: "aspect_ratio", type: "enum", label: "Aspect ratio", section: "quick", default: "1:1", options: ["1:1", "16:9"] }],
};
const referenceWorkflow = {
  id: "reference", display_name: "Reference Image", description: "Uses one pose", ui: {}, defaults: {}, parameters: [],
  inputs: [
    { id: "prompt", type: "text", label: "Prompt" },
    { id: "negative_prompt", type: "text", label: "Avoid", help: "Exclude details", section: "advanced" },
    { id: "pose", type: "asset", role: "pose", label: "Pose reference", accepted_media: ["image/*"], multiplicity: { minimum: 1, maximum: 1 } },
  ],
};
const videoWorkflow = {
  id: "video", display_name: "Video", description: "Image to video", category: "video", ui: {},
  defaults: { frame_rate: 16 }, inputs: [{ id: "prompt", type: "text", label: "Prompt" }],
  parameters: [{ id: "frame_rate", type: "enum", label: "Frame rate", section: "quick", default: 16, options: [16, 24, 30] }],
};
const fluxWorkflow = {
  id: "flux2-klein-9b", display_name: "FLUX.2 Klein 9B", description: "General image editing", category: "image", capabilities: ["image_edit"], ui: {},
  defaults: { size_mode: "auto", aspect_ratio: "1:1", resolution: 1024, seed: -1, steps: 4, cfg: 1, batch_size: 1 },
  inputs: [
    { id: "prompt", type: "text", label: "Prompt" },
    { id: "image_reference", type: "asset", role: "image", label: "Images", accepted_media: ["image/*"], multiplicity: { minimum: 0, maximum: 32 } },
  ],
  parameters: [
    { id: "size_mode", type: "enum", label: "Sizing", section: "advanced", default: "auto", options: ["auto", "custom"] },
    { id: "aspect_ratio", type: "enum", label: "Canvas ratio", section: "advanced", default: "1:1", options: ["1:1", "16:9"] },
    { id: "resolution", type: "enum", label: "Long edge", section: "advanced", default: 1024, options: [768, 1024] },
    { id: "steps", type: "integer", label: "Steps", section: "advanced", default: 4, minimum: 1, maximum: 50 },
  ],
};
const ltxWorkflow = {
  id: "ltx-video", display_name: "LTX Video", description: "Image to video", category: "video", model_family: "ltx-video", capabilities: ["reference_mentions", "lora"], ui: {},
  defaults: { resolution: "480p", aspect_ratio: "auto", duration_seconds: 6, audio_enabled: true, frame_rate: 24, steps: 8, model: "redgraftLTX25Fast2K_ltx25RedgraftNSFW.safetensors", lora: "None", lora_strength: 1 },
  inputs: [
    { id: "prompt", type: "text", label: "Prompt" },
    { id: "start_image", type: "asset", role: "start_image", label: "Images", accepted_media: ["image/*"], multiplicity: { minimum: 1, maximum: 24 } },
  ],
  parameters: [
    { id: "resolution", type: "enum", label: "Resolution", section: "quick", default: "480p", options: ["480p", "720p"] },
    { id: "aspect_ratio", type: "enum", label: "Aspect ratio", section: "quick", default: "auto", options: ["auto", "16:9"] },
    { id: "duration_seconds", type: "enum", label: "Duration", section: "quick", default: 6, options: [6, 10] },
    { id: "audio_enabled", type: "boolean", label: "Audio", section: "quick", default: true },
    { id: "lora", type: "string", label: "LoRA", section: "advanced", default: "None", control: "lora" },
    { id: "lora_strength", type: "number", label: "LoRA strength", section: "advanced", default: 1, minimum: -2, maximum: 2, step: 0.05 },
    { id: "output_scale", type: "number", label: "Output scale", section: "advanced", default: 1, minimum: 0.25, maximum: 1, step: 0.05 },
  ],
};
const props = { session: { id: "session-1" }, initial: null, onGenerated: vi.fn(), onError: vi.fn() };

afterEach(cleanup);

function typeInRichPrompt(prompt, text) {
  prompt.textContent = text;
  const range = document.createRange();
  range.selectNodeContents(prompt);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  fireEvent.input(prompt);
}

describe("capability-aware composer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hides controls unsupported by the selected workflow", () => {
    render(<Composer {...props} workflows={[imageWorkflow]}/>);
    expect(screen.queryByText("Add pose reference")).not.toBeInTheDocument();
    expect(screen.queryByText("Avoid")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "16:9" })).toBeInTheDocument();
  });

  it("switching workflows changes reference controls", () => {
    render(<Composer {...props} workflows={[imageWorkflow, referenceWorkflow]}/>);
    fireEvent.click(screen.getByRole("button", { name: /Simple Image/ }));
    fireEvent.click(screen.getByRole("button", { name: /Reference Image/ }));
    expect(screen.getByRole("button", { name: "Add pose reference" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));
    expect(screen.getByText("Avoid")).toBeInTheDocument();
  });

  it("opens directly on a workflow launched from the workflow dashboard", () => {
    render(<Composer {...props} workflows={[imageWorkflow, referenceWorkflow]} initial={{ workflow_id: "reference", prompt: "", parameters: {}, sequence: 1 }}/>);
    expect(screen.getByRole("button", { name: /Reference Image/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add pose reference" })).toBeInTheDocument();
  });

  it("submits a semantic request and reports the queued generation", async () => {
    studioApi.generate.mockResolvedValue({ id: "generation-1", status: "queued" });
    render(<Composer {...props} workflows={[imageWorkflow]}/>);
    fireEvent.change(screen.getByRole("textbox", { name: "Prompt" }), { target: { value: "A quiet observatory" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate/ }));
    await waitFor(() => expect(studioApi.generate).toHaveBeenCalledWith(expect.objectContaining({ workflow_id: "simple", prompt: "A quiet observatory", session_id: "session-1" })));
    expect(props.onGenerated).toHaveBeenCalledWith(expect.objectContaining({ id: "generation-1" }));
  });

  it("preserves numeric enum values in generation requests", async () => {
    studioApi.generate.mockResolvedValue({ id: "generation-video", status: "queued" });
    render(<Composer {...props} workflows={[videoWorkflow]}/>);
    fireEvent.change(screen.getByRole("textbox", { name: "Prompt" }), { target: { value: "Slow camera arc" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Frame rate" }), { target: { value: "24" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate/ }));
    await waitFor(() => expect(studioApi.generate).toHaveBeenCalledWith(expect.objectContaining({ parameters: { frame_rate: 24 } })));
  });

  it("blocks generation and explains a failed runtime preflight", () => {
    const runtime = { configured: true, workflows: [{ workflow_id: "simple", ready: false, issues: [{ message: "LoRA 'missing.safetensors' is not available in the active ComfyUI runtime." }] }] };
    render(<Composer {...props} workflows={[imageWorkflow]} runtime={runtime}/>);
    fireEvent.change(screen.getByRole("textbox", { name: "Prompt" }), { target: { value: "A quiet observatory" } });
    expect(screen.getByText("This workflow is not ready.")).toBeInTheDocument();
    expect(screen.getByText(/missing\.safetensors/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate/ })).toBeDisabled();
  });

  it("shows FLUX automatic sizing and reveals manual canvas controls on demand", () => {
    render(<Composer {...props} workflows={[fluxWorkflow]}/>);
    expect(screen.getByRole("button", { name: "Output size 1024 by 1024" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));
    expect(screen.queryByText("Canvas ratio")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Sizing" }), { target: { value: "custom" } });
    expect(screen.getByText("Canvas ratio")).toBeInTheDocument();
    expect(screen.getByText("Steps")).toBeInTheDocument();
  });

  it("uploads multiple FLUX references and inserts numbered prompt mentions", async () => {
    studioApi.upload
      .mockResolvedValueOnce({ id: "asset-1", filename: "person.png", content_url: "/person.png", width: 1200, height: 1600 })
      .mockResolvedValueOnce({ id: "asset-2", filename: "place.png", content_url: "/place.png", width: 1600, height: 900 });
    const { container } = render(<Composer {...props} workflows={[fluxWorkflow]}/>);
    const first = new File(["one"], "person.png", { type: "image/png" });
    const second = new File(["two"], "place.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [first, second] } });
    await screen.findByRole("button", { name: "Mention Image 2" });
    expect(screen.getByRole("button", { name: "Mention Image 1" })).toBeInTheDocument();
    const prompt = screen.getByRole("textbox", { name: "Prompt" });
    typeInRichPrompt(prompt, "Combine @");
    await screen.findByRole("option", { name: "Image 1" });
    fireEvent.keyDown(prompt, { key: "ArrowDown" });
    fireEvent.keyDown(prompt, { key: "Enter" });
    expect(prompt).toHaveTextContent("Combine @Image 2");
    expect(screen.getByRole("button", { name: "Output size 768 by 1024" })).toBeInTheDocument();
  });

  it("offers compatible installed LoRAs for LTX generation", async () => {
    render(<Composer {...props} workflows={[ltxWorkflow]} models={[{ name: "ltx-video-reasoning.safetensors", kind: "loras", model_families: ["ltx-video"] }]}/>);
    fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }));
    expect(screen.getByRole("option", { name: "None" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ltx-video-reasoning.safetensors" })).toBeInTheDocument();
    expect(screen.getByText("LoRA strength")).toBeInTheDocument();
  });
});

it("fits FLUX edit dimensions to the selected long edge without stretching", () => {
  expect(resolveFluxDimensions(
    { size_mode: "auto", resolution: 1024, aspect_ratio: "1:1" },
    [{ role: "image", asset: { width: 1600, height: 900 } }],
  )).toEqual({ width: 1024, height: 576 });
});

it("completed results restore their prompt and settings through the reuse action", () => {
  const onReuse = vi.fn();
  const onView = vi.fn();
  const item = { id: "g1", workflow_id: "simple", created_at: new Date().toISOString(), prompt: "Paper city", parameters: { seed: 42 }, status: "completed", phase: "Completed", outputs: [{ id: "a1", content_url: "/asset.png", thumbnail_url: "/asset-thumb.jpg" }] };
  render(<GenerationCard item={item} onReuse={onReuse} onView={onView} onCancel={vi.fn()}/>);
  const output = screen.getByRole("button", { name: "View image output 1" });
  expect(output.querySelector("img")).toHaveAttribute("src", "/asset-thumb.jpg");
  fireEvent.click(output);
  expect(onView).toHaveBeenCalledWith(item.outputs[0], item);
  fireEvent.click(screen.getByRole("button", { name: "Reuse prompt & settings" }));
  expect(onReuse).toHaveBeenCalledWith(item);
});

it("saves provider keys without rendering the secret back into settings", async () => {
  studioApi.providerSettings.mockResolvedValue({ providers: [{ id: "huggingface", name: "Hugging Face", configured: false, source: "none" }] });
  studioApi.modelDownloads.mockResolvedValue({ jobs: [] });
  studioApi.models.mockResolvedValue({ items: [] });
  studioApi.saveProviderKey.mockResolvedValue({ id: "huggingface", name: "Hugging Face", configured: true, source: "credential_vault" });
  render(<ProviderSettings/>);
  const input = await screen.findByLabelText("Hugging Face API key");
  fireEvent.change(input, { target: { value: "hf_private" } });
  fireEvent.click(screen.getByRole("button", { name: "Save key" }));
  await screen.findByText("Connected via credential vault");
  expect(studioApi.saveProviderKey).toHaveBeenCalledWith("huggingface", "hf_private");
  expect(input).toHaveValue("");
  expect(screen.queryByDisplayValue("hf_private")).not.toBeInTheDocument();
});

it("refreshes runtime capabilities when a model download completes", async () => {
  const onModelsChanged = vi.fn();
  studioApi.providerSettings.mockResolvedValue({ providers: [] });
  studioApi.modelDownloads.mockResolvedValue({ jobs: [{ id: "download-1", status: "completed", filename: "model.safetensors", provider: "huggingface", destination_kind: "diffusion_models", bytes_downloaded: 100, bytes_total: 100 }] });
  studioApi.models.mockResolvedValue({ items: [] });

  render(<ProviderSettings onModelsChanged={onModelsChanged}/>);

  await waitFor(() => expect(onModelsChanged).toHaveBeenCalledTimes(1));
});

it("shows a LoRA gallery and sends metadata with LoRA downloads", async () => {
  studioApi.providerSettings.mockResolvedValue({ providers: [] });
  studioApi.modelDownloads.mockResolvedValue({ jobs: [] });
  studioApi.models.mockResolvedValue({ items: [{
    name: "ltx-video-reasoning.safetensors",
    kind: "loras",
    model_families: ["ltx-video"],
    metadata: { notes: "Better motion planning", trigger_words: ["cinematic"], recommended_strength: 0.8 },
  }] });
  studioApi.startModelDownload.mockResolvedValue({ id: "download-lora", status: "queued", filename: "new-lora.safetensors", provider: "civitai", destination_kind: "loras" });
  render(<ProviderSettings/>);

  await screen.findByText("ltx-video-reasoning.safetensors");
  expect(screen.getByText("Better motion planning")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Download LoRA" }));
  fireEvent.change(screen.getByLabelText("Model URL"), { target: { value: "https://civitai.red/api/download/models/2848299?fileId=2734400" } });
  fireEvent.change(screen.getByLabelText("Filename"), { target: { value: "new-lora.safetensors" } });
  fireEvent.change(screen.getByLabelText("Trigger words comma separated"), { target: { value: "cinematic, smooth motion" } });
  fireEvent.change(screen.getByLabelText("Recommended strength"), { target: { value: "0.7" } });
  fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Smooth camera moves" } });
  fireEvent.click(screen.getByRole("button", { name: "Download to Modal" }));

  await waitFor(() => expect(studioApi.startModelDownload).toHaveBeenCalledWith(expect.objectContaining({
    provider: "civitai",
    destination_kind: "loras",
    filename: "new-lora.safetensors",
    metadata: expect.objectContaining({
      model_families: ["ltx-video"],
      trigger_words: ["cinematic", "smooth motion"],
      recommended_strength: 0.7,
      notes: "Smooth camera moves",
    }),
  })));
});

it("shows live workflow readiness and launches the selected tool", () => {
  const onUse = vi.fn();
  const workflow = { ...referenceWorkflow, category: "image", model_family: "qwen-image-edit", capabilities: ["image_edit", "face_swap"], ui: { speed: "Fast", quality: "High", recommended: true } };
  render(<WorkflowsPage workflows={[workflow]} models={[{ status: "installed" }]} runtime={{ configured: true, base_url: "http://127.0.0.1:8100", node_count: 1741, reactor_available: true, workflows: [{ workflow_id: "reference", ready: true, issues: [] }] }} workspace={{ partial_download_count: 2, reactor: { version: "0.7.0-a2" } }} onUse={onUse}/>);
  expect(screen.getByText("1,741 nodes discovered")).toBeInTheDocument();
  expect(screen.getByText("1/1 ready")).toBeInTheDocument();
  expect(screen.getByText("ReActor ready")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Face swap 1" }));
  fireEvent.click(screen.getByRole("button", { name: /Use workflow/ }));
  expect(onUse).toHaveBeenCalledWith(workflow);
});
