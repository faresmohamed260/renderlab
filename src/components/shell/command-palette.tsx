"use client";

import { Command } from "cmdk";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCreateCommands, type CreateCommand } from "@/lib/create-commands";
import styles from "./command-palette.module.css";

export function CommandPalette({ showAdmin }: { showAdmin: boolean }) {
  const router = useRouter();
  const registered = useCreateCommands();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const previous = useRef<HTMLElement | null>(null);
  const pending = useRef<CreateCommand["run"] | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  function openPalette() {
    previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError("");
    setOpen(true);
  }

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k" || event.repeat || event.defaultPrevented) return;
      if (open || document.querySelector('[role="dialog"][data-state="open"]')) return;
      event.preventDefault();
      previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setError("");
      setOpen(true);
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [open]);

  const navigation = [
    { label: "Create", path: "/create" },
    { label: "Library", path: "/library" },
    { label: "Settings", path: "/settings" },
    ...(showAdmin ? [{ label: "Admin", path: "/admin" }] : []),
  ];
  const groups = new Map<string, CreateCommand[]>();
  for (const command of registered) {
    if (!command.enabled) continue;
    const commands = groups.get(command.group) ?? [];
    commands.push(command);
    groups.set(command.group, commands);
  }
  function select(run: CreateCommand["run"]) {
    pending.current = run;
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <button ref={trigger} type="button" className={styles.trigger} aria-haspopup="dialog" aria-expanded={open} onClick={openPalette}>
        <span>Search actions</span><kbd>Ctrl K</kbd>
      </button>
      <span role="status" className="sr-only">{error}</span>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.scrim} />
        <Dialog.Content className={styles.dialog} onCloseAutoFocus={event => {
          event.preventDefault();
          const target = previous.current;
          if (target?.isConnected) target.focus({ preventScroll: true });
          else trigger.current?.focus({ preventScroll: true });
          const action = pending.current;
          pending.current = null;
          if (action) {
            void Promise.resolve().then(action).catch(() => setError("Action could not be completed."));
          }
        }}>
          <Dialog.Title className="sr-only">Search actions</Dialog.Title>
          <Dialog.Description className="sr-only">Search available actions and navigation.</Dialog.Description>
          <Command label="Search actions" className={styles.command}>
            <Command.Input placeholder="Search actions…" aria-label="Search actions" autoFocus className={styles.input} />
            <Command.List className={styles.list}>
              <Command.Empty className={styles.empty}>No matching actions.</Command.Empty>
              {Array.from(groups, ([group, commands]) => (
                <Command.Group key={group} heading={group}>
                  {commands.map(command => (
                    <Command.Item key={command.id} value={command.id} keywords={[command.label, ...command.keywords]} onSelect={() => select(command.run)}>
                      <span>{command.label}</span>{command.shortcut && <kbd>{command.shortcut}</kbd>}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
              <Command.Group heading="Navigation">
                {navigation.map(item => (
                  <Command.Item key={item.path} value={"navigation-" + item.path} keywords={[item.label]} onSelect={() => select(() => router.push(item.path))}>{item.label}</Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
