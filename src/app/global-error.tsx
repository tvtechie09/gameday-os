"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{ maxWidth: 680, margin: "64px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}><h1>GameDay Venue needs to reload</h1><p>The application shell encountered an unexpected error. No operational change was submitted.</p><button onClick={reset}>Reload application</button></main></body></html>;
}
