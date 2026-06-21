import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Holidays — The Hub" };

export default function HolidaysPage() {
  return (
    <ComingSoon
      emoji="🌴"
      title="Holiday requests"
      intro="Request time off, see your remaining allowance, and get it approved by your manager — no spreadsheets."
      features={[
        "Submit a request in a few taps",
        "See your remaining allowance live",
        "Managers approve or decline with a click",
        "Approved leave shows on the team calendar",
      ]}
    />
  );
}
