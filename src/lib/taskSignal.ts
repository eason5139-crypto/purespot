const sentInSession = new Set<string>();

export function sendTaskSignal(
  taskKey: "daily_browse_shop" | "daily_community_interact" | "mile_nutrition_calc",
): void {
  if (typeof window === "undefined") return;
  if (sentInSession.has(taskKey)) return;
  sentInSession.add(taskKey);
  void fetch("/api/account/membership", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "record_task_signal", taskKey }),
  }).catch(() => {
    sentInSession.delete(taskKey);
  });
}
