import { useState, useEffect } from 'react';

// Inline SVG MicroLink logo — replace with <img src="..."> when real logo available
function MicroLinkLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#3B6BF5"/>
      <path d="M7 24V8L12 18L16 10L20 18L25 8V24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="16" cy="22" r="2" fill="#06B6D4"/>
    </svg>
  );
}

export default function Header({ wsConnected = false }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-14 bg-navy flex items-center justify-between px-6 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center space-x-2.5">
        <MicroLinkLogo />
        <span className="text-white font-semibold text-sm tracking-tight">MicroLink</span>
      </div>

      {/* Center: Site name */}
      <div className="text-white font-medium text-sm">
        MicroLink Newtown Creek Data Center, NYC
      </div>

      {/* Right: Clock + WS indicator */}
      <div className="flex items-center space-x-4">
        <span className="text-white/80 font-mono text-sm">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            wsConnected ? 'bg-mcs-green' : 'bg-red-500'
          }`}
          title={wsConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
        />
      </div>
    </header>
  );
}
