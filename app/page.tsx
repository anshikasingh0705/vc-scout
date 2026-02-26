// app/page.tsx
// This is a server component that just loads the client app shell.
// All interactivity is in the "use client" component.

import { AppShell } from "@/components/AppShell";

export default function Home() {
  return <AppShell />;
}
