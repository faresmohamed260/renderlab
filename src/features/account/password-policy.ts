export const RENDERLAB_PASSWORD_MIN_LENGTH = 15;

export const RENDERLAB_PASSWORD_REQUIREMENT = `Use at least ${RENDERLAB_PASSWORD_MIN_LENGTH} characters.`;

export function meetsRenderLabPasswordPolicy(value: string) {
  return value.length >= RENDERLAB_PASSWORD_MIN_LENGTH;
}
