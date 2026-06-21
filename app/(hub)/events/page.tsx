import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Events — The Hub" };

export default function EventsPage() {
  return (
    <ComingSoon
      emoji="🎉"
      title="Events"
      intro="Create company events with graphics, share photos and videos, and let people RSVP — all without any design skills."
      features={[
        "Create an event with a cover graphic in minutes",
        "Photo & video galleries from past events",
        "RSVP / headcount for socials and training",
        "Auto-promoted to the news feed and calendar",
      ]}
    />
  );
}
