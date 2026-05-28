"use client";

interface IconProps {
  size?: number;
  className?: string;
}

const d: Record<string, string> = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
  signal: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  trade: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  strategy: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  dataSource: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  performance: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  docs: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 18L18 6M6 6l12 12",
  chevronDown: "M19 9l-7 7-7-7",
  copy: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  wallet: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  chart: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
  activity: "M13 10V3L4 14h7v7l9-11h-7z",
  zap: "M13 10V3L4 14h7v7l9-11h-7z",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  externalLink: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
  trendUp: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  trendDown: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
  sidebarCollapse: "M11 19h10M11 19V5m0 14H4a1 1 0 01-1-1V6a1 1 0 011-1h7m0 14V5m0 0h7a1 1 0 011 1v12a1 1 0 01-1 1h-7",
  sidebarExpand: "M13 19h8M13 19V5m0 14H5a1 1 0 01-1-1V6a1 1 0 011-1h8m0 14V5m0 0h6a1 1 0 011 1v12a1 1 0 01-1 1h-6",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  barChart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  chartBar: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
};

function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d[name]} />
    </svg>
  );
}

export function HomeIcon(p: IconProps) { return <Icon name="home" {...p} />; }
export function SignalIcon(p: IconProps) { return <Icon name="signal" {...p} />; }
export function TradeIcon(p: IconProps) { return <Icon name="trade" {...p} />; }
export function HistoryIcon(p: IconProps) { return <Icon name="history" {...p} />; }
export function StrategyIcon(p: IconProps) { return <Icon name="strategy" {...p} />; }
export function DataSourceIcon(p: IconProps) { return <Icon name="dataSource" {...p} />; }
export function PerformanceIcon(p: IconProps) { return <Icon name="performance" {...p} />; }
export function SettingsIcon(p: IconProps) { return <Icon name="settings" {...p} />; }
export function DocsIcon(p: IconProps) { return <Icon name="docs" {...p} />; }
export function MenuIcon(p: IconProps) { return <Icon name="menu" {...p} />; }
export function CloseIcon(p: IconProps) { return <Icon name="close" {...p} />; }
export function ChevronDownIcon(p: IconProps) { return <Icon name="chevronDown" {...p} />; }
export function CopyIcon(p: IconProps) { return <Icon name="copy" {...p} />; }
export function RefreshIcon(p: IconProps) { return <Icon name="refresh" {...p} />; }
export function WalletIcon(p: IconProps) { return <Icon name="wallet" {...p} />; }
export function ChartIcon(p: IconProps) { return <Icon name="chart" {...p} />; }
export function ActivityIcon(p: IconProps) { return <Icon name="activity" {...p} />; }
export function ZapIcon(p: IconProps) { return <Icon name="zap" {...p} />; }
export function ShieldIcon(p: IconProps) { return <Icon name="shield" {...p} />; }
export function ExternalLinkIcon(p: IconProps) { return <Icon name="externalLink" {...p} />; }
export function TrendUpIcon(p: IconProps) { return <Icon name="trendUp" {...p} />; }
export function TrendDownIcon(p: IconProps) { return <Icon name="trendDown" {...p} />; }
export function SidebarCollapseIcon(p: IconProps) { return <Icon name="sidebarCollapse" {...p} />; }
export function SidebarExpandIcon(p: IconProps) { return <Icon name="sidebarExpand" {...p} />; }
export function ClipboardIcon(p: IconProps) { return <Icon name="clipboard" {...p} />; }
export function BarChartIcon(p: IconProps) { return <Icon name="barChart" {...p} />; }
export function BriefcaseIcon(p: IconProps) { return <Icon name="briefcase" {...p} />; }
export function DocumentIcon(p: IconProps) { return <Icon name="document" {...p} />; }
export function ChartBarIcon(p: IconProps) { return <Icon name="chartBar" {...p} />; }
