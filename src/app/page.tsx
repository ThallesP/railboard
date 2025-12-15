"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { AddUsernameDialog } from "@/components/add-username-dialog";
import { api } from "../../convex/_generated/api";
import { Leaderboard } from "./leaderboard-table";

export default function Home() {
  const { data: leaderboard } = useQuery(convexQuery(api.leaderboard.get));

  return (
    <div className="min-h-screen bg-[hsl(250,24%,9%)] text-[hsl(0,0%,100%)]">
      <div className="relative isolate min-h-screen overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
        {/* Global background layer (no gradients) */}
        <div className="absolute inset-0 -z-10 bg-[hsl(250,21%,11%/0.92)] backdrop-blur" />

        <div className="relative mx-auto flex max-w-5xl flex-col gap-8">
          <header className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Railboard
            </h1>
            <p className="max-w-2xl text-lg text-slate-300 sm:text-lg">
              Track how many times you've deployed your projects across all
              projects and compete for the top spot.
            </p>
            <div className="mt-1">
              <AddUsernameDialog />
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] p-4 shadow-lg backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Total deploys
              </p>
              <p className="mt-3 text-3xl font-semibold sm:text-4xl">
                {leaderboard?.totalDeploys?.toLocaleString() ?? "—"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Sum of all deployments listed below.
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] p-4 shadow-lg backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Tracked users
              </p>
              <p className="mt-3 text-3xl font-semibold sm:text-4xl">
                {leaderboard?.totalUsers?.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Unique users currently on the leaderboard.
              </p>
            </div>
          </div>

          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
