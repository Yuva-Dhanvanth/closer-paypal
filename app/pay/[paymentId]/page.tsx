import { prisma } from "@/lib/db";
import { getPayPalClient } from "@/lib/paypal";
import { redirect } from "next/navigation";

export default async function PayRedirectPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: {
        include: {
          seller: true,
          conversation: true,
        },
      },
    },
  });

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Payment Not Found</h1>
          <p className="text-gray-600">The requested payment link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  // If payment is already completed, redirect back to storefront
  if (payment.status === "completed") {
    redirect(
      `/s/${payment.order.seller.slug}?conversationId=${payment.order.conversationId}&status=already_paid`
    );
  }

  const client = getPayPalClient();
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  // Fresh order per click to prevent expired approvals and DUPLICATE_INVOICE_ID
  const nextAttempt = payment.paypalOrderId
    ? (payment.attempt || 1) + 1
    : payment.attempt || 1;
  const isDeposit = payment.type === "deposit";
  const desc = isDeposit
    ? `${payment.order.seller.name}: Deposit for Order #${payment.orderId.substring(0, 8)}`
    : `${payment.order.seller.name}: Balance for Order #${payment.orderId.substring(0, 8)}`;

  let approvalUrl: string;

  try {
    const paypalOrder = await client.createOrder({
      paymentId: payment.id,
      attempt: nextAttempt,
      amountCents: payment.amountCents,
      description: desc,
      brandName: payment.order.seller.name,
      returnUrl: `${appUrl}/api/paypal/return`,
      cancelUrl: `${appUrl}/api/paypal/cancel`,
    });

    // Update payment record with PayPal Order ID and attempt count
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paypalOrderId: paypalOrder.orderId,
        attempt: nextAttempt,
      },
    });

    approvalUrl = paypalOrder.approvalUrl;
  } catch (error: any) {
    console.error("Error creating PayPal order:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Checkout Error</h1>
          <p className="text-gray-600 mb-4">
            Could not initialize PayPal checkout: {error.message || "Unknown error"}
          </p>
          <a
            href={`/s/${payment.order.seller.slug}?conversationId=${payment.order.conversationId}`}
            className="inline-block bg-blue-600 text-white font-medium px-4 py-2 rounded-lg"
          >
            Return to Store
          </a>
        </div>
      </div>
    );
  }

  // Redirect outside try/catch so Next.js NEXT_REDIRECT isn't caught as an error
  redirect(approvalUrl);
}
