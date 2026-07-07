import OrderDetail from "@/components/account/OrderDetail";

interface Props {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { orderId } = await params;
  return {
    title: `Order ${orderId} — Aaushadhi Wellness`,
    description: `View details for order ${orderId}.`,
  };
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  return <OrderDetail orderId={orderId} />;
}
