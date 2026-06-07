import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/billing/portal
 * Returns a Stripe Billing Portal URL so the user can manage / cancel their
 * subscription. Requires a signed-in user with a Stripe customer.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found for this account." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const origin = new URL(request.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not open billing portal.";
    const status = message.includes("is not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
