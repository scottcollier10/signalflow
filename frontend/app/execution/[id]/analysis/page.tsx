import { redirect } from 'next/navigation';

/**
 * Redirect old analysis URL to unified execution view
 * /execution/[id]/analysis -> /execution/[id]
 */
interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisRedirectPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  redirect(`/execution/${id}`);
}
