"use client";

import {
  HomeIcon,
  SignalIcon,
  TradeIcon,
  PerformanceIcon,
  SettingsIcon,
} from "@/components/ui/icons";

const tabs = [
  { id: "Dashboard", label: "Dashboard", Icon: HomeIcon },
  { id: "Signals", label: "Signals", Icon: SignalIcon },
  { id: "Trading", label: "Trading", Icon: TradeIcon },
  { id: "Performance", label: "Performance", Icon: PerformanceIcon },
  { id: "Settings", label: "Settings", Icon: SettingsIcon },
];

interface Props {
  active: string;
  onSelect: (id: string) => void;
}

export default function MobileBottomNav({ active, onSelect }: Props) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-surface/90 border-t border-border-default z-40 safe-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors
                ${isActive ? "text-accent" : "text-txt-dim"}
              `}
            >
              {/* Active indicator dot */}
              <span
                className={`w-1 h-1 rounded-full transition-opacity ${
                  isActive ? "bg-accent opacity-100" : "opacity-0"
                }`}
              />
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
