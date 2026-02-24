import { NEON } from "../utils/helpers";

export default function Loader() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center">
      <div
        className="w-10 h-10 rounded-full border-2 animate-spin"
        style={{
          borderColor: "#222",
          borderTopColor: NEON.cyan,
        }}
      />
      <div className="text-xs text-zinc-500 mt-4 font-mono">
        LOADING ANALYTICS...
      </div>
    </div>
  );
}