type Props = {
  active: number;
  done: number;
  total: number;
};

export default function StatsBar({ active, done, total }: Props) {
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-3 mb-7">

      <StatCard label="Active" value={active} color="indigo" />
      <StatCard label="Done" value={done} color="cyan" />
      <StatCard label="Progress" value={`${progress}%`} color="emerald" />

    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "indigo" | "cyan" | "emerald";
}) {
  const topGradient = {
    indigo: "from-indigo-500 to-violet-500",
    cyan: "from-cyan-500 to-blue-500",
    emerald: "from-emerald-500 to-cyan-500",
  }[color];

  const textColor = {
    indigo: "text-indigo-300",
    cyan: "text-cyan-300",
    emerald: "text-emerald-300",
  }[color];

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur
    hover:-translate-y-0.5 transition relative overflow-hidden">

      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${topGradient}`}/>

      <div className={`text-3xl font-extrabold leading-none mb-1 ${textColor}`}>
        {value}
      </div>

      <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
        {label}
      </div>
    </div>
  );
}
