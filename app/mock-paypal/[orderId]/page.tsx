import Link from "next/link";

interface MockPayPalPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function MockPayPalPage({
  params,
  searchParams,
}: MockPayPalPageProps) {
  const { orderId } = await params;
  const sp = await searchParams;
  const paymentId = sp.paymentId || "unknown";
  const amountCents = parseInt(sp.amount || "0", 10);
  const formattedAmount = (amountCents / 100).toFixed(2);

  const returnUrl = `/api/paypal/return?token=${encodeURIComponent(orderId)}&PayerID=MOCK-PAYER-12345`;
  const cancelUrl = `/api/paypal/cancel?token=${encodeURIComponent(orderId)}`;

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans flex flex-col justify-between">
      {/* PayPal Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-black italic tracking-tighter text-[#003087]">
            Pay<span className="text-[#0079C1]">Pal</span>
          </span>
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
            Sandbox Simulator
          </span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Ref: {orderId}
        </div>
      </header>

      {/* Main Checkout Container */}
      <main className="max-w-md w-full mx-auto my-8 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-full mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Authorize Payment</h1>
          <p className="text-sm text-gray-500 mt-1">
            PayPal Sandbox Buyer Simulation
          </p>
        </div>

        {/* Order Details Box */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
          <div className="flex justify-between items-center py-1 text-sm text-gray-600">
            <span>Merchant</span>
            <span className="font-semibold text-gray-800">Closer Verified Merchant</span>
          </div>
          <div className="flex justify-between items-center py-1 text-sm text-gray-600">
            <span>Payment ID</span>
            <span className="font-mono text-xs text-gray-700">{paymentId}</span>
          </div>
          <div className="flex justify-between items-center py-2 mt-2 border-t border-gray-200 text-base">
            <span className="font-semibold text-gray-800">Amount Due</span>
            <span className="font-bold text-xl text-[#003087]">${formattedAmount} USD</span>
          </div>
        </div>

        {/* Mock Buyer Account */}
        <div className="bg-blue-50/50 rounded-xl p-3 mb-6 text-xs text-blue-900 border border-blue-100">
          <p className="font-medium">Logged in as Sandbox Buyer:</p>
          <p className="text-blue-700 font-mono mt-0.5">buyer-sandbox@closer.dev (Personal)</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href={returnUrl}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-full font-bold text-sm text-black bg-[#FFC439] hover:bg-[#F2BA36] shadow transition duration-150 active:scale-[0.98]"
          >
            <span>Complete Purchase & Approve</span>
          </Link>

          <Link
            href={cancelUrl}
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-full font-medium text-xs text-gray-600 hover:text-gray-900 transition"
          >
            Cancel and return to store
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-4">
        Closer PayPal Hackathon Demo Environment · Orders v2 Integration
      </footer>
    </div>
  );
}
