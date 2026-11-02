"use client";

import { useEffect, useState } from "react";
import type { SiteContent } from "./siteContent";

export function useSiteContentPreview(content: SiteContent) {
  const [draft, setDraft] = useState<SiteContent | null>(null);

  useEffect(() => {
    if (window.parent === window) return;
    let attempts = 0;
    const requestDraft = () => window.parent.postMessage({ type: "purespot-content-preview-ready" }, window.location.origin);
    const retry = window.setInterval(() => {
      if (++attempts > 12) return window.clearInterval(retry);
      requestDraft();
    }, 400);
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== "purespot-content-preview") return;
      window.clearInterval(retry);
      setDraft(event.data.content as SiteContent);
    }
    window.addEventListener("message", receive);
    requestDraft();
    return () => { window.clearInterval(retry); window.removeEventListener("message", receive); };
  }, []);

  return draft ?? content;
}
