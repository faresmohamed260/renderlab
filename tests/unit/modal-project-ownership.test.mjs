import test from "node:test";
import assert from "node:assert/strict";
import {
  assertRenderLabModalAccount,
  filterRenderLabModalRoster,
  RENDERLAB_MODAL_ACCOUNT_LABELS,
  SAGA_MODAL_ACCOUNT_LABELS,
} from "../../scripts/lib/modal-project-ownership.mjs";

test("Modal ownership sets are exact and non-overlapping", () => {
  assert.deepEqual(RENDERLAB_MODAL_ACCOUNT_LABELS, [
    "modal-01",
    "modal-02",
    "modal-42",
    "modal-43",
    "modal-44",
    "modal-45",
    "modal-46",
    "modal-47",
  ]);
  assert.equal(SAGA_MODAL_ACCOUNT_LABELS.length, 39);
  assert.equal(
    RENDERLAB_MODAL_ACCOUNT_LABELS.some((label) => SAGA_MODAL_ACCOUNT_LABELS.includes(label)),
    false,
  );
});

test("omnibus roster is filtered to RenderLab-owned accounts", () => {
  const roster = Array.from({ length: 47 }, (_, index) => ({
    label: `modal-${String(index + 1).padStart(2, "0")}`,
    marker: index + 1,
  }));
  assert.deepEqual(
    filterRenderLabModalRoster(roster).map((row) => row.label),
    RENDERLAB_MODAL_ACCOUNT_LABELS,
  );
});

test("Saga-owned Modal accounts fail closed", () => {
  for (const label of ["modal-03", "modal-17", "modal-41"]) {
    assert.throws(() => assertRenderLabModalAccount(label), /not owned by RenderLab/);
  }
});

test("missing RenderLab-owned credential fails closed", () => {
  const roster = RENDERLAB_MODAL_ACCOUNT_LABELS.filter((label) => label !== "modal-45").map(
    (label) => ({ label }),
  );
  assert.throws(() => filterRenderLabModalRoster(roster), /modal-45/);
});
