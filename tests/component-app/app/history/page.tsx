import { HistoryFixture } from "./history-fixture";

export default async function HistoryFixturePage({ searchParams }: { searchParams: Promise<{ offset?: string; state?: string; phone?: string }> }) {
  const params = await searchParams;
  const offset = Math.max(0, Number(params.offset) || 0);
  return <HistoryFixture key={offset + ":" + (params.state ?? "") + ":" + params.phone} offset={offset} fixtureState={params.state ?? ""} phone={params.phone === "1"} />;
}
