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
    const trainUrl = `${API_BASE}/Stop/NextService?key=${API_KEY}&stopCode=${stop}&limit=10`;
    const trainRes = await fetch(trainUrl, { next: { revalidate: 30 } });
    const trainData = trainRes.ok ? await trainRes.json() : { NextService: { Lines: [] } };

    const busStopCode = STATION_BUS_CODES[stop];
    let busData = { NextService: { Lines: [] } };

    if (busStopCode) {
      const busUrl = `${API_BASE}/Stop/NextService?key=${API_KEY}&stopCode=${busStopCode}&limit=10`;
      const busRes = await fetch(busUrl, { next: { revalidate: 30 } });
      if (busRes.ok) {
        busData = await busRes.json();
      }
    }

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
