import type { ReactNode } from "react";
import "../../../src/app/globals.css";
import "../../../src/app/renderlab-background.css";
import "../../../src/app/create-clear-composer.css";

export default function FixtureLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><main>{children}</main></body></html>;
}
