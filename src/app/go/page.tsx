"use client";

import { useState, useEffect } from "react";
import "./go-transit.css";

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

  useEffect(() => {
    updateTime();
    fetchDepartures();

    const timeInterval = setInterval(updateTime, 1000);
    const fetchInterval = setInterval(fetchDepartures, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(fetchInterval);
    };
  }, [currentStop, transportType]);

  const updateTime = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false }));
  };

  const fetchDepartures = async () => {
    try {
      const response = await fetch(`/go/api/departures?stop=${currentStop}`);
      const data = await response.json();

      const lines = data.NextService?.Lines || [];

      if (lines.length === 0) {
        setDepartureGroups([]);
        return;
      }

      const now = new Date();

      const allDepartures: Departure[] = lines
        .filter((line: any) => line.ComputedDepartureTime)
        .map((line: any) => {
          const depTime = new Date(line.ComputedDepartureTime);
          const mins = Math.round((depTime.getTime() - now.getTime()) / 60000);

          let dest = line.DirectionName || "Union Station";
          dest = dest.replace(/^[A-Z]+\s*-\s*/, "");

          return {
            platform: line.ScheduledPlatform || "-",
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
    } catch (err) {
      console.error(err);
    }
  };

  const selectStation = (code: string, name: string, type: TransportType = "trains") => {
    setCurrentStop(code);
    setStationName(name);
    setTransportType(type);
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const trainGroups = departureGroups.filter((g) => g.type === "T");
  const busGroups = departureGroups.filter((g) => g.type === "B");
  const displayedGroups = transportType === "trains" ? trainGroups : busGroups;

  return (
    <div className="go-page">
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
            </div>
          </div>
          <h1 id="stationName">{stationName}</h1>
          <span className="transport-badge">{transportType === "trains" ? "🚂" : "🚌"}</span>
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

      <div className="departures" id="departures">
        {displayedGroups.length === 0 ? (
          <div className="loading">
            {transportType === "trains"
              ? trainGroups.length === 0
                ? "No trains"
                : "Loading..."
              : busGroups.length === 0
              ? "No buses"
              : "Loading..."}
          </div>
        ) : (
          displayedGroups.map((group, index) => {
            const routeClass = group.route || "default";

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
