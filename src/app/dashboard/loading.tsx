export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 rounded-full bg-cream" />
      <div className="mt-3 h-8 w-64 rounded-xl bg-cream" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl border border-line bg-white" />
        ))}
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="h-72 rounded-3xl border border-line bg-white" />
        <div className="h-72 rounded-3xl border border-line bg-white" />
      </div>
    </div>
  );
}
