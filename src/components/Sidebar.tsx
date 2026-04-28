"use client";

const menu = [
  "Dashboard",
  "Signals",
  "Trade History",
  "Strategy Config",
  "Data Sources",
  "Performance",
  "Settings",
];

export default function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (item: string) => void;
}) {
  return (
    <aside className="w-48 shrink-0 bg-[#0c0c18] border-r border-[#1a1a2e] py-3 hidden md:block">
      {menu.map((item) => (
        <button
          key={item}
          onClick={() => onSelect(item)}
          className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${
            active === item
              ? "text-white font-semibold bg-[#7b2fff20] border-l-[3px] border-[#7b2fff]"
              : "text-[#666677] hover:text-white border-l-[3px] border-transparent"
          }`}
        >
          {item}
        </button>
      ))}
    </aside>
  );
}
