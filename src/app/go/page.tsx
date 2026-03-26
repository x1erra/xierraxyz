"use client";

import { useState, useEffect, useRef } from "react";
import { Train, Bus, RefreshCw } from "lucide-react";
import "./go-transit.css";
import { STATIONS } from "./stations";

interface Departure {
  platform: string;
  route: string;
  destination: string;
  minutes: number;
  type: "T" | "B";
}

interface DepartureGroup {
  platform: string;
  route: string;
  destination: string;
  times: number[];
  type: "T" | "B";
}

type TransportType = "trains" | "buses";

export default function GOTransitPage() {
  const [currentStop, setCurrentStop] = useState("CL");
  const [stationName, setStationName] = useState("Clarkson GO");
  const [departureGroups, setDepartureGroups] = useState<DepartureGroup[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [transportType, setTransportType] = useState<TransportType>("trains");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const pullingActive = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const fetchDeparturesRef = useRef<() => Promise<void>>(async () => { });
  const currentReqId = useRef(0);

  const PULL_THRESHOLD = 60;
  const MAX_PULL = 80;

  // Keep fetchDeparturesRef current so touch handlers always call the latest version
  useEffect(() => {
    fetchDeparturesRef.current = fetchDepartures;
  });

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !isRefreshingRef.current) {
        touchStartY.current = e.touches[0].clientY;
        pullingActive.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingActive.current || isRefreshingRef.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        e.preventDefault(); // block iOS overscroll so it doesn't swallow the gesture
        const dist = Math.min(delta * 0.5, MAX_PULL);
        pullDistanceRef.current = dist;
        setPullDistance(dist);
        setIsPulling(true);
      } else {
        pullingActive.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const onTouchEnd = async () => {
      if (!pullingActive.current) return;
      pullingActive.current = false;
      setIsPulling(false);
      const dist = pullDistanceRef.current;
      if (dist >= PULL_THRESHOLD) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        pullDistanceRef.current = 50;
        setPullDistance(50);
        await fetchDeparturesRef.current();
        setTimeout(() => {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }, 400);
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const savedStop = localStorage.getItem("goTransitStop");
    const savedName = localStorage.getItem("goTransitName");
    const savedType = localStorage.getItem("goTransitType") as TransportType;
    
    if (savedStop) setCurrentStop(savedStop);
    if (savedName) setStationName(savedName);
    if (savedType) setTransportType(savedType);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    updateTime();
    fetchDepartures();

    const timeInterval = setInterval(updateTime, 1000);
    const fetchInterval = setInterval(fetchDepartures, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(fetchInterval);
    };
  }, [currentStop, isMounted]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuOpen && !(e.target as Element).closest(".station-info")) {
        setMenuOpen(false);
        if (!searchQuery) setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [menuOpen, searchQuery]);

  const updateTime = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false }));
  };

  const fetchDepartures = async () => {
    const reqId = Date.now();
    currentReqId.current = reqId;

    try {
      const response = await fetch(`/go/api/departures?stop=${currentStop}`);
      const data = await response.json();

      // If the user switched stations while this request was pending, discard it
      if (currentReqId.current !== reqId) return;

      const lines = data.NextService?.Lines || [];

      if (lines.length === 0) {
        setDepartureGroups([]);
        return;
      }

      const now = new Date();

      // Retrieve the current Toronto timezone offset (e.g. -04:00 for EDT or -05:00 for EST)
      const torontoFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Toronto",
        timeZoneName: "longOffset"
      });
      const tzPart = torontoFormatter.formatToParts(now).find(p => p.type === "timeZoneName")?.value || "GMT-05:00";
      // Ensure we replace standard GMT and any legacy Unicode minus operators
      const tzOffset = tzPart.replace("GMT", "").replace("\u2212", "-");

      const allDepartures: Departure[] = lines
        .filter((line: any) => line.ComputedDepartureTime || line.ScheduledDepartureTime)
        .map((line: any) => {
          // Metrolinx API returns times in local America/Toronto string: "YYYY-MM-DD HH:mm:ss"
          // We dynamically apply the current Toronto offset to keep mapping robust against DST changes
          const departureObj = line.ComputedDepartureTime || line.ScheduledDepartureTime;
          const timeStr = departureObj.replace(" ", "T");
          const depTime = new Date(`${timeStr}${tzOffset}`);
          const mins = Math.round((depTime.getTime() - now.getTime()) / 60000);

          let dest = line.DirectionName || "Union Station";
          dest = dest.replace(/^[A-Z]+\s*-\s*/, "");

          return {
            platform: line.ActualPlatform || line.ScheduledPlatform || "-",
            route: line.LineCode || "LW",
            destination: dest,
            minutes: mins,
            type: line.ServiceType || "T",
          };
        })
        .filter((d: Departure) => d.minutes >= 0)
        .sort((a: Departure, b: Departure) => a.minutes - b.minutes);

      const groups: { [key: string]: DepartureGroup } = {};

      for (const dep of allDepartures) {
        const key = `${dep.platform}-${dep.route}-${dep.destination}`;

        if (!groups[key]) {
          groups[key] = {
            platform: dep.platform,
            route: dep.route,
            destination: dep.destination,
            times: [],
            type: dep.type,
          };
        }

        if (!groups[key].times.includes(dep.minutes)) {
          groups[key].times.push(dep.minutes);
        }
      }

      const groupedDepartures = Object.values(groups)
        .map((g) => ({
          ...g,
          times: g.times.sort((a, b) => a - b).slice(0, 2),
        }))
        .sort((a, b) => {
          const aEarliest = a.times[0] ?? 999;
          const bEarliest = b.times[0] ?? 999;
          return aEarliest - bEarliest;
        });

      setDepartureGroups(groupedDepartures);
      setIsFetching(false);
    } catch (err) {
      console.error(err);
      setIsFetching(false);
    }
  };

  const selectStation = (code: string, name: string, type: TransportType = "trains") => {
    if (code !== currentStop) {
      setIsFetching(true);
    }
    setCurrentStop(code);
    setStationName(name);
    setTransportType(type);
    setMenuOpen(false);

    localStorage.setItem("goTransitStop", code);
    localStorage.setItem("goTransitName", name);
    localStorage.setItem("goTransitType", type);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    if (menuOpen) {
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const filteredStations = searchQuery.trim()
    ? STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.line.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  if (!isMounted) {
    return <div className="go-page" style={{ backgroundColor: "#000" }} />;
  }

  const trainGroups = departureGroups.filter((g) => g.type === "T");
  const busGroups = departureGroups.filter((g) => g.type === "B");
  const displayedGroups = transportType === "trains" ? trainGroups : busGroups;

  return (
    <div
      className="go-page"
      ref={pageRef}
    >
      <div
        className="pull-indicator"
        style={{
          height: `${pullDistance}px`,
          transition: isPulling ? "none" : "height 0.3s ease",
        }}
      >
        <RefreshCw
          size={22}
          className={`pull-icon ${isRefreshing ? "spinning" : pullDistance >= PULL_THRESHOLD ? "ready" : ""}`}
        />
      </div>
      <div className="header">
        <div className="station-info">
          <div className="go-logo" onClick={toggleMenu}>
            <img src="/go_transit_logo.svg" alt="GO Transit" />
            <div className={`station-menu ${menuOpen ? "show" : ""}`}>
              <div className="menu-section">Trains</div>
              <div onClick={() => selectStation("CL", "Clarkson GO", "trains")}>
                Clarkson GO
              </div>
              <div onClick={() => selectStation("ML", "Milton GO", "trains")}>
                Milton GO
              </div>
              <div onClick={() => selectStation("UN", "Union Station", "trains")}>
                Union Station
              </div>
              <div className="menu-section">Buses</div>
              <div onClick={() => selectStation("CL", "Clarkson GO", "buses")}>
                Clarkson GO
              </div>
              <div onClick={() => selectStation("ML", "Milton GO", "buses")}>
                Milton GO
              </div>
              <div onClick={() => selectStation("UN", "Union Station", "buses")}>
                Union Station
              </div>
              <div className="menu-section">Search</div>
              {!searchOpen ? (
                <div onClick={(e) => { e.stopPropagation(); openSearch(); }} className="menu-search-trigger">
                  Search stations...
                </div>
              ) : (
                <div className="menu-search-area">
                  <input
                    ref={searchRef}
                    type="text"
                    className="menu-search-input"
                    placeholder="Station, line, or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {filteredStations.length > 0 && (
                    <div className="menu-search-results">
                      {filteredStations.map((station) => (
                        <div
                          key={station.code}
                          className="menu-search-result"
                          onClick={() => selectStation(station.code, station.name, "trains")}
                        >
                          <span className="result-name">{station.name}</span>
                          <span className="result-meta">{station.line} · {station.code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery.trim() && filteredStations.length === 0 && (
                    <div className="menu-search-empty">No stations found</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <h1 id="stationName">{stationName}</h1>
          <span className="transport-badge">
            {transportType === "trains" ? <Train size={22} strokeWidth={2} /> : <Bus size={22} strokeWidth={2} />}
          </span>
        </div>
        <div className="current-time" id="currentTime">
          {currentTime}
        </div>
      </div>

      <div className="table-header">
        <div>
          <div style={{ fontWeight: 700 }}>Pltfm.</div>
          <div style={{ fontWeight: 400 }}>Quai</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700 }}>Route</div>
          <div style={{ fontWeight: 400 }}>Ligne</div>
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>Direction</div>
          <div style={{ fontWeight: 400 }}>Direction</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>Time</div>
          <div style={{ fontWeight: 400 }}>Temps</div>
        </div>
      </div>

      <div className={`departures ${isFetching ? "is-fetching" : ""}`} id="departures">
        {displayedGroups.length === 0 ? (
          <div className="loading">
            {isFetching || (departureGroups.length === 0 && stationName)
              ? "Loading..."
              : transportType === "trains"
                ? "No trains"
                : "No buses"}
          </div>
        ) : (
          displayedGroups.map((group, index) => {
            const isNumeric = !isNaN(Number(group.route));
            const routeClass = group.route ? (isNumeric ? `route-${group.route}` : group.route) : "default";

            return (
              <div className="departure-row" key={index}>
                <div className="platform">{group.platform}</div>
                <div>
                  <span className={`route-badge ${routeClass}`}>{group.route}</span>
                </div>
                <div className="direction">{group.destination}</div>
                <div className="times-container">
                  {group.times.map((mins, timeIndex) => {
                    const isFirst = timeIndex === 0;
                    const isDue = mins === 0;

                    return (
                      <span
                        key={timeIndex}
                        className={`time-chip ${!isFirst ? "second" : ""} ${isDue ? "due" : ""}`}
                      >
                        {isDue ? "Due" : mins}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
