"use client";

import { useEffect } from "react";

const menu = [
  "Dashboard",
  "Signals",
  "Trading",
  "Trade History",
  "Strategy Config",
  "Data Sources",
  "Performance",
  "Settings",
  "Docs",
];

interface Props {
  active: string;
  onSelect: (item: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ active, onSelect, mobileOpen, onMobileClose }: Props) {
  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleSelect = (item: string) => {
    onSelect(item);
    onMobileClose?.();
  };

  const menuItems = (
    <>
      {menu.map((item) => (
        <button
          key={item}
          onClick={() => handleSelect(item)}
          className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${
            active === item
              ? "text-white font-semibold bg-[#7b2fff20] border-l-[3px] border-[#7b2fff]"
              : "text-[#666677] hover:text-white border-l-[3px] border-transparent"
          }`}
        >
          {item}
        </button>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-48 shrink-0 bg-[#0c0c18] border-r border-[#1a1a2e] py-3 hidden md:block">
        {menuItems}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#0c0c18] border-r border-[#1a1a2e] py-4 animate-slide-in-left">
            <div className="flex items-center justify-between px-5 mb-3">
              <span className="text-sm font-bold text-white">Menu</span>
              <button
                onClick={onMobileClose}
                className="text-[#666677] hover:text-white text-lg leading-none"
              >
                &times;
              </button>
            </div>
            {menuItems}
          </aside>
        </div>
      )}
    </>
  );
}
