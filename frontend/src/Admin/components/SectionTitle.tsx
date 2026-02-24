
import type { ReactNode, ElementType } from "react";

type Props = {
  children: ReactNode;
  icon: ElementType;
  color: string;
};export default function SectionTitle({ children, icon: Icon, color }:Props) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} color={color} />

      <span
        className="text-[11px] tracking-[3px] uppercase font-mono"
        style={{ color }}
      >
        {children}
      </span>

      <div
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(to right, ${color}44, transparent)`,
        }}
      />
    </div>
  );
}