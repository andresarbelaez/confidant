import fs from "fs";
import path from "path";
import "confidant-design-tokens/styles.css";
import "confidant-chat-ui/styles.css";
import { DesignSystemClientLayout } from "./design-system-client-layout";
import "./design-system.css";

function getSpecContent(): string {
  const filePath = path.join(process.cwd(), "src/content/design-system.md");
  return fs.readFileSync(filePath, "utf-8");
}

export const metadata = {
  title: "Design System – Confidant",
  description: "Confidant desktop UI tokens and components. Single source of truth for desktop (and future mobile) app design.",
};

export default function DesignSystemPage() {
  const content = getSpecContent();
  return <DesignSystemClientLayout content={content} />;
}
