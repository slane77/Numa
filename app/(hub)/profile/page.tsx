import { redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/auth/user";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "My profile — The Hub" };

export default async function ProfilePage() {
  const [profile, user] = await Promise.all([getProfile(), getUser()]);
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          My profile
        </h1>
        <p className="mt-1 text-stone-600">
          This is how you appear in the staff directory.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-card">
        <ProfileForm profile={profile} />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white px-6 py-4 text-sm shadow-card">
        <div>
          <p className="text-stone-500">Signed in as</p>
          <p className="font-medium text-stone-800">{user?.email}</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium capitalize text-stone-600">
          {profile.role}
        </span>
      </div>
    </div>
  );
}
