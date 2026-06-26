import { ResultsScreen } from "@/components/screens";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const params = await searchParams;
  return <ResultsScreen requestedSessionId={params.sessionId ?? null} />;
}
