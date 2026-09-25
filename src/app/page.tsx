import { redirect } from "next/navigation";

// The dashboard is the app — there is no separate landing page.
export default function Home() {
    redirect("/dashboard");
}
