import CustomerOrder from "@/components/CustomerOrder";

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CustomerOrder token={token} />;
}

