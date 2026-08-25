"""Typed public and private contracts for Studio workflows."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


MediaType = Literal["image", "video", "audio"]
InputType = Literal["text", "asset"]
ParameterType = Literal["integer", "number", "boolean", "enum", "string"]


class MappingTarget(BaseModel):
    node: str
    input: str


class NodeMapping(BaseModel):
    node: str = ""
    input: str = ""
    transform: str = ""
    targets: list[MappingTarget] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_mapping(self) -> "NodeMapping":
        if not ((self.node and self.input) or (self.transform and self.targets)):
            raise ValueError("mapping requires node/input or transform/targets")
        return self


class Multiplicity(BaseModel):
    minimum: int = Field(default=0, ge=0, alias="min")
    maximum: int = Field(default=1, ge=1, alias="max")

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def validate_range(self) -> "Multiplicity":
        if self.maximum < self.minimum:
            raise ValueError("multiplicity max must be greater than or equal to min")
        return self


class ManifestInput(BaseModel):
    id: str
    type: InputType
    required: bool = False
    label: str
    help: str = ""
    role: str = ""
    accepted_media: list[str] = Field(default_factory=list)
    multiplicity: Multiplicity = Field(default_factory=Multiplicity)
    section: Literal["composer", "advanced"] = "composer"
    mapping: NodeMapping
    fallback_roles: list[str] = Field(default_factory=list)
    present_mapping: NodeMapping | None = None
    present_value: Any = True


class ManifestParameter(BaseModel):
    id: str
    type: ParameterType
    default: Any = None
    minimum: float | None = None
    maximum: float | None = None
    step: float | None = None
    options: list[Any] = Field(default_factory=list)
    label: str
    help: str = ""
    section: Literal["quick", "advanced", "hidden"] = "advanced"
    control: str = ""
    mapping: NodeMapping | None = None

    @model_validator(mode="after")
    def validate_parameter(self) -> "ManifestParameter":
        if self.minimum is not None and self.maximum is not None and self.maximum < self.minimum:
            raise ValueError(f"parameter '{self.id}' maximum must be >= minimum")
        if self.type == "enum" and not self.options:
            raise ValueError(f"enum parameter '{self.id}' requires options")
        if self.type == "enum" and self.default not in self.options:
            raise ValueError(f"default for '{self.id}' must be one of its options")
        return self


class WorkflowReference(BaseModel):
    path: str
    sha256: str = ""


class ManifestOutput(BaseModel):
    id: str
    media_type: MediaType
    node: str
    field: str
    multiple: bool = True


class WorkflowPresentation(BaseModel):
    icon: str = "workflow"
    speed: str = ""
    quality: str = ""
    recommended: bool = False
    thumbnail: str = ""


class WorkflowManifest(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    id: str
    version: str
    display_name: str
    description: str
    category: MediaType
    model_family: str
    tags: list[str] = Field(default_factory=list)
    enabled: bool = True
    workflow: WorkflowReference
    capabilities: list[str] = Field(default_factory=list)
    result_actions: list[str] = Field(default_factory=list)
    inputs: list[ManifestInput] = Field(default_factory=list)
    parameters: list[ManifestParameter] = Field(default_factory=list)
    outputs: list[ManifestOutput] = Field(default_factory=list)
    ui: WorkflowPresentation = Field(default_factory=WorkflowPresentation)

    @model_validator(mode="after")
    def validate_unique_fields(self) -> "WorkflowManifest":
        for label, values in (
            ("input", [item.id for item in self.inputs]),
            ("parameter", [item.id for item in self.parameters]),
            ("output", [item.id for item in self.outputs]),
        ):
            if len(values) != len(set(values)):
                raise ValueError(f"duplicate {label} id in workflow '{self.id}'")
        if not self.outputs:
            raise ValueError("workflow requires at least one output")
        return self

    def defaults(self) -> dict[str, Any]:
        return {item.id: item.default for item in self.parameters if item.default is not None}

    def public_payload(self) -> dict[str, Any]:
        payload = self.model_dump(mode="json")
        payload.pop("workflow", None)
        for item in payload["inputs"]:
            item.pop("mapping", None)
            item.pop("present_mapping", None)
            item.pop("present_value", None)
            item.pop("fallback_roles", None)
        for item in payload["parameters"]:
            item.pop("mapping", None)
        for item in payload["outputs"]:
            item.pop("node", None)
            item.pop("field", None)
        payload["defaults"] = self.defaults()
        return payload


class AssetReference(BaseModel):
    asset_id: str
    role: str


class GenerationRequest(BaseModel):
    workflow_id: str
    prompt: str = ""
    negative_prompt: str = ""
    references: list[AssetReference] = Field(default_factory=list)
    parameters: dict[str, Any] = Field(default_factory=dict)
    session_id: str = ""
    parent_generation_id: str = ""
    operation: Literal["generate", "vary", "remix", "edit", "upscale", "animate"] = "generate"
