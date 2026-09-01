import OwnerDashboard from "@/components/OwnerDashboard";
import { isOwnerRequest } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OwnerDashboardPage() {
  if (!(await isOwnerRequest())) redirect("/order/table-1");
  return <OwnerDashboard />;
}

