"use client";

import {
  useEffect,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import {
  useAuth,
} from "./AuthProvider";


interface ProtectedRouteProps {
  children: ReactNode;
}


export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {

  const router = useRouter();

  const {
    authenticated,
    loading,
  } = useAuth();


  useEffect(() => {

    if (
      !loading &&
      !authenticated
    ) {

      router.replace("/login");

    }

  }, [
    loading,
    authenticated,
    router,
  ]);


  if (loading) {

    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#0b0b12]
          text-white
        "
      >

        <div className="text-center">

          <div
            className="
              mx-auto
              mb-4
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-white/10
              border-t-violet-500
            "
          />

          <p
            className="
              text-sm
              text-slate-400
            "
          >
            Verificando sesión...
          </p>

        </div>

      </div>
    );

  }


  if (!authenticated) {

    return null;

  }


  return (
    <>
      {children}
    </>
  );

}
