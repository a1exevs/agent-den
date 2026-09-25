/** `D:\projects\agent-den` → `agent-den` — the room a hidden cat will return to. */
export function roomLabel(cwd: string | undefined): string {
  return cwd?.split(/[\\/]/).filter(Boolean).at(-1) ?? 'somewhere';
}
