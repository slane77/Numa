import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Guides — The Hub" };

export default function GuidesPage() {
  return (
    <ComingSoon
      emoji="📘"
      title="How-to guides"
      intro="A searchable knowledge base for processes, systems and policies — so the answer is always one place."
      features={[
        "Categorised articles (HR, IT, payroll, compliance…)",
        "Search across every guide",
        "Step-by-step walkthroughs with screenshots",
        "Editors keep guides up to date in a simple editor",
      ]}
    />
  );
}
