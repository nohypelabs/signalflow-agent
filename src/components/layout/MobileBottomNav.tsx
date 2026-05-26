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
  { href: "/performance", label: "Performance", Icon: PerformanceIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-surface/90 border-t border-border-default z-40 safe-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
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
