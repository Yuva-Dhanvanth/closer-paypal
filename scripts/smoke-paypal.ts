import "dotenv/config";
import { getPayPalClient } from "../lib/paypal";

async function runSmokeTest() {
  console.log("🔥 Starting PayPal Integration Smoke Test...");
  const mode = process.env.PAYPAL_MODE || "mock";
  console.log(`📌 Current PAYPAL_MODE: ${mode}`);

  if (mode === "sandbox") {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      console.error(
        "❌ Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment!"
      );
      process.exit(1);
    }
    console.log(
      `🔑 Using Client ID: ${process.env.PAYPAL_CLIENT_ID.substring(0, 8)}...`
    );
  } else {
    console.log("ℹ️  Running in Mock Mode. Set PAYPAL_MODE=sandbox and provide keys to test live sandbox.");
  }

  const client = getPayPalClient();

  try {
    console.log("1️⃣  Acquiring OAuth2 access token...");
    const token = await client.getAccessToken();
    console.log(`   Token acquired: ${token.substring(0, 15)}...`);

    console.log("2️⃣  Creating $1.00 test order...");
    const order = await client.createOrder({
      paymentId: "smoke-test-payment",
      attempt: 1,
      amountCents: 100, // $1.00
      description: "Closer Smoke Test Order ($1.00)",
      brandName: "Closer Smoke Test",
    });

    console.log(`✅ Order created successfully!`);
    console.log(`   Order ID: ${order.orderId}`);
    console.log(`   Approval URL: ${order.approvalUrl}`);

    console.log("\n🎉 Smoke test passed successfully!");
  } catch (error: any) {
    console.error("❌ Smoke test failed:", error.message || error);
    process.exit(1);
  }
}

runSmokeTest();
