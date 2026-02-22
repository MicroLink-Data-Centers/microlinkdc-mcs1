import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, usePolling } from "../lib/api";

// ═══════════════════════════════════════════════════════════════════════════
// MCS STREAM D — SITE & FLEET OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  bg: "#0a0e17", card: "#111827", cardHover: "#1a2234", border: "#1e293b",
  text: "#e2e8f0", muted: "#64748b", dim: "#475569",
  blue: "#3b82f6", green: "#10b981", cyan: "#06b6d4",
  yellow: "#f59e0b", red: "#ef4444", orange: "#f97316",
};

const Badge = ({ children, color, bg }) => (
  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", padding: "2px 7px", borderRadius: 4, color, backgroundColor: bg, whiteSpace: "nowrap" }}>{children}</span>
);

const StatusIndicator = ({ status }) => {
  const colors = { active: C.green, commissioning: C.yellow, standby: C.orange, decommissioned: C.dim };
  return <Badge color="#fff" bg={colors[status] || C.dim}>{(status || "unknown").toUpperCase()}</Badge>;
};

const BlockCard = ({ block, onSelect }) => {
  const hasAlarms = (block.alarms_standing || 0) > 0;
  return (
    <div onClick={() => onSelect(block)} style={{
      background: C.card, borderRadius: 8, border: `1px solid ${hasAlarms ? C.red : C.border}`,
      padding: 14, cursor: "pointer", transition: "background 0.15s",
      boxShadow: hasAlarms ? `0 0 12px ${C.red}22` : "none",
    }}
      onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
      onMouseLeave={e => e.currentTarget.style.background = C.card}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{block.slug}</span>
        <StatusIndicator status={block.status} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.muted }}>{block.capacity_mw} MW</span>
        <span style={{ fontSize: 11, color: C.muted }}>{block.sensor_count} sensors</span>
      </div>
      {block.status === "active" && block.latestData && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>IT Load</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>
                {block.latestData.itLoad ?? "—"}<span style={{ fontSize: 10, color: C.muted }}> kW</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>PUE</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: (block.latestData.pue || 0) < 1.15 ? C.green : C.yellow }}>
                {block.latestData.pue ?? "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>Sensors</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: C.cyan }}>{block.sensor_count}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Badge color={C.cyan} bg="rgba(6,182,212,0.12)">LIVE</Badge>
            {hasAlarms && <Badge color="#fff" bg={C.red}>{block.alarms_standing} STANDING</Badge>}
          </div>
        </>
      )}
      {block.status === "commissioning" && (
        <div style={{ fontSize: 11, color: C.yellow, fontStyle: "italic" }}>Commissioning in progress...</div>
      )}
    </div>
  );
};

const SiteCard = ({ site, onSelectBlock }) => (
  <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 12 }}>
    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{site.name}</span>
            <StatusIndicator status={site.status} />
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{site.slug} · {site.region || "—"}</div>
        </div>
        <div style={{ fontSize: 11, color: C.dim }}>
          {site.blocks.length} block{site.blocks.length !== 1 ? "s" : ""} ·{" "}
          {site.blocks.reduce((s, b) => s + b.capacity_mw, 0)} MW
        </div>
      </div>
    </div>
    <div style={{ padding: 12, display: "grid", gridTemplateColumns: `repeat(${Math.min(site.blocks.length, 3)}, 1fr)`, gap: 8 }}>
      {site.blocks.map(b => <BlockCard key={b.slug} block={b} onSelect={onSelectBlock} />)}
    </div>
  </div>
);

export default function FleetOverview() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll alarm stats every 15s for the fleet banner
  const { data: alarmStats } = usePolling(() => api.alarmStats(), 15000);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [siteList, blockList] = await Promise.all([
          api.listSites(),
          api.listBlocks(),
        ]);

        // Fetch latest telemetry for each active block
        const blockMap = {};
        for (const block of blockList) {
          blockMap[block.slug] = { ...block, latestData: null, alarms_standing: 0 };
        }

        // Fetch latest values for active blocks
        const activeBlocks = blockList.filter(b => b.status === "active");
        const latestResults = await Promise.all(
          activeBlocks.map(b =>
            api.getLatestValues(b.slug).catch(() => null)
          )
        );

        activeBlocks.forEach((block, i) => {
          const latest = latestResults[i];
          if (latest?.readings) {
            const byTag = {};
            latest.readings.forEach(r => { byTag[r.tag] = r.value; });
            blockMap[block.slug].latestData = {
              itLoad: byTag["P-MSB-TOTAL"] ? Math.round(byTag["P-MSB-TOTAL"]) : null,
              pue: null, // would need total facility power / IT power
            };
          }
        });

        // Attach alarm counts
        if (alarmStats) {
          // We have aggregate stats; for per-block we'd need separate calls
          // For now attach fleet-level standing count to the active block
          if (activeBlocks.length > 0) {
            blockMap[activeBlocks[0].slug].alarms_standing = alarmStats.standing || 0;
          }
        }

        // Group blocks by site
        const enrichedSites = siteList.map(site => ({
          ...site,
          blocks: blockList
            .filter(b => b.site_slug === site.slug)
            .map(b => blockMap[b.slug] || b),
        }));

        if (!cancelled) {
          setSites(enrichedSites);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load fleet data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [alarmStats?.standing]);

  const totalMW = sites.reduce((s, site) => s + (site.total_capacity_mw || 0), 0);
  const activeMW = sites.filter(s => s.status === "active").reduce((s, site) => s + (site.total_capacity_mw || 0), 0);
  const totalBlocks = sites.reduce((s, site) => s + site.blocks.length, 0);
  const totalStanding = alarmStats?.standing || 0;

  const handleSelectBlock = (block) => {
    navigate(`/dashboard/${block.slug}`);
  };

  if (loading && sites.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Loading fleet data...</div>
          <div style={{ fontSize: 11, color: C.dim }}>Connecting to MCS API</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 16 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#fff",
          }}>M</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>MicroLink Fleet</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.5px", textTransform: "uppercase" }}>Network Operations Center</div>
          </div>
        </div>
        {error && <div style={{ fontSize: 11, color: C.red }}>{error}</div>}
      </div>

      {/* Fleet KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Sites", value: sites.length, color: C.text },
          { label: "Blocks", value: totalBlocks, color: C.text },
          { label: "Deployed MW", value: `${totalMW}`, color: C.blue },
          { label: "Active MW", value: `${activeMW}`, color: C.green },
          { label: "Standing Alarms", value: totalStanding, color: totalStanding > 0 ? C.red : C.green },
        ].map(m => (
          <div key={m.label} style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Site list */}
      {sites.map(site => (
        <SiteCard key={site.slug} site={site} onSelectBlock={handleSelectBlock} />
      ))}
    </div>
  );
}
