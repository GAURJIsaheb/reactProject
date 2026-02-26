export default function TaskSkeleton() {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5
    bg-white/5 border border-white/10 rounded-2xl animate-pulse">

      <div className="w-4.5 h-4.5 rounded bg-white/10 shrink-0" />

      <div className="flex-1 flex flex-col gap-2">
        <div className="h-2.5 rounded bg-white/10 w-[65%]" />
        <div className="h-2.5 rounded bg-white/10 w-[30%]" />
      </div>

      <div className="w-8 h-8 rounded-xl bg-white/10 shrink-0" />
      <div className="w-8 h-8 rounded-xl bg-white/10 shrink-0" />
    </div>
  );
}
