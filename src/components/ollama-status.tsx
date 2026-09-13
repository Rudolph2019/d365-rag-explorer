"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { OllamaHealth } from "@/lib/ollama";

export function OllamaStatus() {
  const [health, setHealth] = useState<OllamaHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/ollama/health", { cache: "no-store" });
        const payload = (await res.json()) as OllamaHealth;
        if (!cancelled) setHealth(payload);
      } catch {
        if (!cancelled) {
          setHealth({
            online: false,
            baseUrl: "http://127.0.0.1:11434",
            model: "llama3.1:latest",
            embedModel: "nomic-embed-text",
            models: [],
            error: "Health check failed",
          });
        }
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={health?.online ? "secondary" : "destructive"}>
        Ollama {health?.online ? "online" : "offline"}
      </Badge>
      <Badge variant="outline">127.0.0.1:11434</Badge>
    </div>
  );
}
