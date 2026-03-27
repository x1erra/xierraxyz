import { NextRequest, NextResponse } from "next/server";

const API_KEY = "30026843";
const API_BASE = "https://api.openmetrolinx.com/OpenDataAPI/api/V1";

const STATION_BUS_CODES: Record<string, string> = {
  CL: "00181",
  PO: "02775",
  OA: "00137",
  ML: "00194",
  UN: "02300",
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stop = searchParams.get("stop") || "CL";

  try {
    const trainUrl = `${API_BASE}/Stop/NextService?key=${API_KEY}&stopCode=${stop}&limit=100`;
    const busStopCode = STATION_BUS_CODES[stop];

    // Fetch trains unconditionally (handle special case for Union Station)
    const unTrainUrl = `${API_BASE}/ServiceUpdate/UnionDepartures/All?key=${API_KEY}`;
    const fetchTrain = stop === "UN"
      ? fetch(unTrainUrl, { next: { revalidate: 15 } })
          .then(res => res.ok ? res.json() : { AllDepartures: { Trip: [] } })
          .then(data => {
            const trips = data.AllDepartures?.Trip || [];
            const mappedLines = trips.map((trip: any) => {
               const stops = trip.Stops || [];
               const destination = stops.length > 0 ? stops[stops.length - 1].Name : trip.Service;
               const lineCodeMap: Record<string, string> = {
                 "Lakeshore West": "LW",
                 "Lakeshore East": "LE",
                 "Kitchener": "KI",
                 "Milton": "MI",
                 "Richmond Hill": "RH",
                 "Barrie": "BR",
                 "Stouffville": "ST",
                 "UP Express": "UP",
                 "Niagara Falls": "LW",
               };
               const lineCode = lineCodeMap[trip.Service] || trip.Service;
               return {
                  LineCode: lineCode,
                  DirectionName: `${lineCode} - ${destination}`,
                  ActualPlatform: trip.Platform === "-" ? "" : trip.Platform,
                  ScheduledPlatform: "",
                  ServiceType: trip.ServiceType || "T",
                  ComputedDepartureTime: trip.Time,
                  ScheduledDepartureTime: trip.Time
               };
            });
            return { NextService: { Lines: mappedLines } };
          })
          .catch(() => ({ NextService: { Lines: [] } }))
      : fetch(trainUrl, { next: { revalidate: 15 } })
          .then(res => res.ok ? res.json() : { NextService: { Lines: [] } })
          .catch(() => ({ NextService: { Lines: [] } }));

    // Fetch buses if the station supports it
    const fetchBus = busStopCode
      ? fetch(`${API_BASE}/Stop/NextService?key=${API_KEY}&stopCode=${busStopCode}&limit=100`, { next: { revalidate: 15 } })
        .then(res => res.ok ? res.json() : { NextService: { Lines: [] } })
        .catch(() => ({ NextService: { Lines: [] } }))
      : Promise.resolve({ NextService: { Lines: [] } });

    // Execute concurrently for significant speedup on combined stations
    const [trainData, busData] = await Promise.all([fetchTrain, fetchBus]);

    const trainLines = trainData.NextService?.Lines || [];
    const busLines = busData.NextService?.Lines || [];
    const combinedLines = [...trainLines, ...busLines];

    return NextResponse.json({
      NextService: {
        Lines: combinedLines,
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch departures" },
      { status: 500 }
    );
  }
}
