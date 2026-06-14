import HomeShell from "@/components/home/HomeShell";
import { getInitialHomeData } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getInitialHomeData();

  return <HomeShell initialData={data} />;
}
