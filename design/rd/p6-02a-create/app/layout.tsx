import type { ReactNode } from "react";
import "../../../system/v2/tokens.css";
import "./foundation.css";

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
