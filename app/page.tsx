import Link from "next/link";
import { fetchSheetData, MeetingRow } from "./utils/fetchSheetData";

function getWTMSLPMetrics(data: MeetingRow[]): { assemblies: number; meetings: number; volunteers: number } {
  const assemblies = new Set<string>();
  let meetings = 0;
  let volunteers = 0;
  data.forEach((row: MeetingRow) => {
    if (row["assembly name"]) assemblies.add(row["assembly name"]);
    meetings++;
    if ((row["recommended position"] || "").toLowerCase() === "india volunteer") volunteers++;
  });
  return {
    assemblies: assemblies.size,
    meetings,
    volunteers,
  };
}

function getLast3WeeksData(data: MeetingRow[]) {
  // Group by week (ISO week number)
  const now = new Date();
  const weeks: { [week: string]: { meetings: number; assemblies: Set<string>; volunteers: number } } = {};
  data.forEach((row) => {
    const dateStr = row["date"];
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    // Get ISO week number
    const year = d.getFullYear();
    const week = getWeekNumber(d);
    const key = `${year}-W${week}`;
    if (!weeks[key]) weeks[key] = { meetings: 0, assemblies: new Set(), volunteers: 0 };
    weeks[key].meetings++;
    if (row["assembly name"]) weeks[key].assemblies.add(row["assembly name"]);
    if ((row["recommended position"] || "").toLowerCase() === "india volunteer") weeks[key].volunteers++;
  });
  // Get last 3 weeks (sorted)
  const weekKeys = Object.keys(weeks).sort().slice(-3);
  return weekKeys.map((key, idx) => ({
    label: `week_${idx + 1}`,
    meetings: weeks[key].meetings,
    assemblies: weeks[key].assemblies.size,
    volunteers: weeks[key].volunteers,
  }));
}

// Helper: ISO week number
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

export default async function HomePage() {
  const data = await fetchSheetData();
  const wtmSlpMetrics = getWTMSLPMetrics(data);

  // Dept. Head cards with pastel colors and metrics (all 0 for now)
  const DEPT_CARDS = [
    {
      key: "wtm-shakti-prof",
      title: "WTM-SLP (SHAKTI PROF.)",
      lead: "Ms. Trishala Shandilya",
      color: "bg-pink-100",
      metrics: [
        { label: "Total Assemblies Covered", value: 0 },
        { label: "Total Meetings", value: 0 },
        { label: "Total Volunteers (Potential)", value: 0 },
        { label: "Total Registrations (MBY)", value: 0 },
      ],
    },
    {
      key: "wtm-shakti-club",
      title: "WTM-SHAKTI CLUB",
      lead: "Ms. Reecha and Ms. Sadaf",
      color: "bg-blue-100",
      metrics: [
        { label: "Total Meetings", value: 0 },
        { label: "Total Volunteers", value: 0 },
      ],
    },
    {
      key: "wtm-whatsapp",
      title: "WTM-Whatsapp",
      lead: "Mr. Mithilesh",
      color: "bg-green-100",
      metrics: [
        { label: "Total Groups Created", value: 0 },
        { label: "Total Members", value: 0 },
      ],
    },
    {
      key: "wtm-shakti-club-2",
      title: "WTM-SHAKTI CLUB - 2",
      lead: "Mr. Karan Chaurasia",
      color: "bg-yellow-100",
      metrics: [
        { label: "Total Channels Onboarded", value: 0 },
        { label: "Total Ready to Onboard Channels", value: 0 },
        { label: "Total Channels Contacted", value: 0 },
      ],
    },
    {
      key: "wtm-hostel-segment",
      title: "WTM-Hostel Segment",
      lead: "Mr. Jay Maurya",
      color: "bg-purple-100",
      metrics: [
        { label: "Total Assemblies Covered", value: 0 },
        { label: "No. of Hostels Visited", value: 0 },
        { label: "Total Volunteers", value: 0 },
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-8 grid gap-8">
      <h1 className="text-3xl font-bold mb-6 text-center">WTM Dashboard</h1>
      <div className="flex justify-center mb-6">
        <Link href="/map">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold text-lg">
            View Map
          </button>
        </Link>
      </div>
      {/* All cards in a single grid for alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ravi Pandit card with real data and dashboard link */}
        <Link
          href="/wtm-slp"
          className="rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-red-100 p-6 flex flex-col gap-4 hover:shadow-2xl transition group"
        >
          <div className="flex flex-col items-center mb-2 gap-1">
            <h2 className="text-xl font-bold text-center group-hover:text-red-700 transition">WTM-SLP</h2>
            <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
              Lead: Mr. Ravi Pandit
            </span>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Assemblies Covered:</span>
              <span className="text-gray-900 dark:text-gray-100 font-bold">{wtmSlpMetrics.assemblies}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Meetings:</span>
              <span className="text-gray-900 dark:text-gray-100 font-bold">{wtmSlpMetrics.meetings}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Volunteers:</span>
              <span className="text-gray-900 dark:text-gray-100 font-bold">{wtmSlpMetrics.volunteers}</span>
            </div>
          </div>
        </Link>
        {/* Other department cards */}
        {DEPT_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 ${card.color} p-6 flex flex-col gap-4 hover:shadow-2xl transition group`}
          >
            <div className="flex flex-col items-center mb-2 gap-1">
              <h2 className="text-xl font-bold text-center group-hover:text-blue-700 transition">{card.title}</h2>
              <span className="px-3 py-1 rounded-full bg-white/70 text-gray-800 text-xs font-semibold border border-gray-300 mt-1">
                Lead: {card.lead}
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {card.metrics.map((metric) => (
                <div key={metric.label} className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">{metric.label}:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-bold">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
