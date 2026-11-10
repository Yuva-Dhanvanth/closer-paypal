import { DashboardClient } from "@/components/dashboard/DashboardClient";

interface DashboardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params;

  return <DashboardClient sellerSlug={slug} />;
}
