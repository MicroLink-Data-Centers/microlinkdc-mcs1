import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Overview from './pages/Overview';
import Operations from './pages/Operations';
import Commercial from './pages/Commercial';
import Environmental from './pages/Environmental';
import SiteMap from './pages/SiteMap';
import Connectivity from './pages/Connectivity';

const TABS = ['OVERVIEW', 'OPERATIONS', 'COMMERCIAL', 'ENVIRONMENTAL', 'SITE MAP', 'CONNECTIVITY'];

const WS_BASE = import.meta?.env?.VITE_MCS_WS_URL || 'ws://localhost:8000/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempts = useRef(0);

  // Global WebSocket connection check — ping telemetry WS
  const connectWs = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_BASE}/ws/telemetry/baldwinsville-01`);
      ws.onopen = () => { setWsConnected(true); reconnectAttempts.current = 0; };
      ws.onclose = () => {
        setWsConnected(false);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        if (reconnectAttempts.current < 20) {
          reconnectTimer.current = setTimeout(connectWs, delay);
        }
      };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    } catch {
      setWsConnected(false);
    }
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  const renderTab = () => {
    switch (activeTab) {
      case 'OVERVIEW': return <Overview />;
      case 'OPERATIONS': return <Operations />;
      case 'COMMERCIAL': return <Commercial />;
      case 'ENVIRONMENTAL': return <Environmental />;
      case 'SITE MAP': return <SiteMap />;
      case 'CONNECTIVITY': return <Connectivity />;
      default: return <Overview />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden">
      <Header wsConnected={wsConnected} />

      {/* Tab bar */}
      <nav className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex space-x-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-semibold tracking-widest transition-colors ${
                activeTab === tab
                  ? 'text-mcs-blue border-b-2 border-mcs-blue'
                  : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden p-4">
        {renderTab()}
      </main>
    </div>
  );
}
