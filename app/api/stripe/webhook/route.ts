import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PREMIUM_STATUSES = ["active", "trialing"];

/**
 * POST /api/stripe/webhook
 * Stripe-driven source of truth for tier. Verifies the signature, then updates
 * profiles via the service role (the only writer allowed to touch tier/billing).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 400 },
    );
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const periodEnd = (sub: Stripe.Subscription) =>
    sub.items.data[0]?.current_period_end
      ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
      : null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const uid =
          session.client_reference_id ??
          (session.metadata?.supabase_uid as string | undefined);
        if (uid) {
          await admin
            .from("profiles")
            .update({
              tier: "premium",
              subscription_status: "active",
              stripe_customer_id:
                typeof session.customer === "string"
                  ? session.customer
                  : (session.customer?.id ?? null),
              stripe_subscription_id:
                typeof session.subscription === "string"
                  ? session.subscription
                  : (session.subscription?.id ?? null),
            })
            .eq("id", uid);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const premium = PREMIUM_STATUSES.includes(sub.status);
        await admin
          .from("profiles")
          .update({
            tier: premium ? "premium" : "free",
            subscription_status: sub.status,
            stripe_subscription_id: sub.id,
            current_period_end: periodEnd(sub),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await admin
          .from("profiles")
          .update({
            tier: "free",
            subscription_status: "canceled",
            current_period_end: periodEnd(sub),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook handling failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
