"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  SignalIcon,
  TradeIcon,
  PerformanceIcon,
  SettingsIcon,
} from "@/components/ui/icons";

const tabs = [
  { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
  { href: "/signals", label: "Signals", Icon: SignalIcon },
  { href: "/trading", label: "Trading", Icon: TradeIcon },
  { href: "/performance", label: "Backtesting", Icon: PerformanceIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-card border-t border-border-default z-40 safe-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative cursor-pointer
                ${isActive ? "text-accent" : "text-txt-dim hover:text-txt-secondary"}
              `}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-b-full bg-accent" />
              )}
              <Icon size={18} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
