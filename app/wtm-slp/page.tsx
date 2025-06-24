import { fetchSheetData, MeetingRow } from "../utils/fetchSheetData";
import DashboardHome from "../../components/DashboardHome";

export default async function WTMSLPPage() {
  const data: MeetingRow[] = await fetchSheetData();
  return <DashboardHome data={data} />;
} 