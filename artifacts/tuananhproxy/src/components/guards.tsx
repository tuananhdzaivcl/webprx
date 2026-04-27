import { useGetMe } from "@workspace/api-client-react";
import { ReactNode } from "react";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data: me, isLoading, isError } = useGetMe({ query: { retry: false } });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (isError || !me) {
    return <Redirect to="/dang-nhap" />;
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { data: me, isLoading, isError } = useGetMe({ query: { retry: false } });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (isError || !me || !me.isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
