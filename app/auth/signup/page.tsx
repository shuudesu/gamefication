import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = {
  title: "Cadastro // GAMEFICATION",
};

export default function SignupPage() {
  return (
    <AuthShell subtitle="cadastro">
      <Suspense fallback={null}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
