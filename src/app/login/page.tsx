import type { Metadata } from "next";

import Login from "@/features/Login/Login";

export const metadata: Metadata = {
  title: "Sign in · Ferry Track",
};

export default function Page() {
  return <Login />;
}
