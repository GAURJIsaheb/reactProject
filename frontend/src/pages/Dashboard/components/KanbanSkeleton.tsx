export default function KanbanSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-4 mt-2 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-72 shrink-0 rounded-2xl bg-card/40 border border-border/30 animate-pulse"
          style={{ height: "320px", animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}