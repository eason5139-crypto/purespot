export default function Loading() {
  return (
    <main
      id="main-content"
      className="page-shell py-12"
      aria-busy="true"
      aria-label="正在載入"
    >
      <div className="h-72 animate-pulse rounded-3xl border border-[#e8ded3] bg-[#ede5da]" />
      <p className="mt-6 text-center text-sm font-medium text-[#7d7165]">
        正在準備毛孩的專屬選物…
      </p>
    </main>
  );
}
