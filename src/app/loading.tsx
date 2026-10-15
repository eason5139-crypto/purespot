export default function Loading() {
  return (
    <main
      id="main-content"
      className="page-shell py-12"
      aria-busy="true"
      aria-label="正在載入"
    >
      <div className="h-72 animate-pulse rounded-3xl bg-slate-900" />
      <p className="mt-6 text-center text-sm text-slate-400">
        正在準備毛孩的專屬選物…
      </p>
    </main>
  );
}
