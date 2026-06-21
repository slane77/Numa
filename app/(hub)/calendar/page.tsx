import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Who's in — The Hub" };

export default function CalendarPage() {
  return (
    <ComingSoon
      emoji="🏠"
      title="Who's working where"
      intro="See at a glance who's in the office, working from home, or away — for the whole team or just yours."
      features={[
        "Set your own status: office, home or out",
        "Weekly team view of where everyone is",
        "Filter by team or office location",
        "Feeds into the holiday calendar",
      ]}
    />
  );
}
