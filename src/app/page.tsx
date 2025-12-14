"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { AddUsernameDialog } from "@/components/add-username-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../../convex/_generated/api";

export default function Home() {
  const {
    data: leaderboard,
    isLoading,
    isError,
  } = useQuery(convexQuery(api.leaderboard.list));

  const totalDeploys = leaderboard?.reduce(
    (sum, entry) => sum + (entry?.totalDeploys ?? 0),
    0,
  );
  const totalUsers = leaderboard?.length ?? 0;
  const currentPage = 1;
  const totalPages = Math.max(1, Math.ceil(totalUsers / 10));

  return (
    <div className="min-h-screen bg-[hsl(250,24%,9%)] text-[hsl(0,0%,100%)]">
      <div className="relative isolate min-h-screen overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
        {/* Global background layer (no gradients) */}
        <div className="absolute inset-0 -z-10 bg-[hsl(250,21%,11%/0.92)] backdrop-blur" />

        <div className="relative mx-auto flex max-w-5xl flex-col gap-8">
          <header className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Simple Railway deploy leaderboard
            </h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Track how many times your Railway projects have been deployed. Add
              your username and keep an eye on the scoreboard.
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
                {totalDeploys?.toLocaleString() ?? "—"}
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
                {totalUsers.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Unique users currently on the leaderboard.
              </p>
            </div>
          </div>

          {/* Main table card */}
          <section className="relative overflow-hidden rounded-2xl border border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] shadow-2xl">
            <div className="relative">
              <div className="flex items-center justify-between border-b border-[hsl(246,11%,22%)] px-4 py-3 sm:px-6">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Leaderboard
                  </p>
                  <p className="text-xs text-[hsl(246,7%,45%)]">
                    Top deployers across your Railway projects.
                  </p>
                </div>
                <div className="hidden rounded-full bg-[hsl(248,21%,13%)] px-3 py-1 text-xs text-slate-200 sm:inline-flex">
                  Page {currentPage} of {totalPages}
                </div>
              </div>

              <div className="px-2 pb-4 pt-1 sm:px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[72px] text-xs font-medium uppercase tracking-wide text-[hsl(246,7%,45%)]">
                        #
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[hsl(246,7%,45%)]">
                        User
                      </TableHead>
                      <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-[hsl(246,7%,45%)]">
                        Total deploys
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-8 text-center text-slate-200"
                        >
                          Loading leaderboard…
                        </TableCell>
                      </TableRow>
                    ) : isError ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-8 text-center text-slate-200"
                        >
                          Failed to load leaderboard.
                        </TableCell>
                      </TableRow>
                    ) : leaderboard && leaderboard.length > 0 ? (
                      leaderboard.map((entry, index) => (
                        <TableRow
                          key={entry._id}
                          className="hover:bg-slate-800/60"
                        >
                          <TableCell className="font-medium text-slate-100">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium text-slate-100">
                            {entry.username}
                          </TableCell>
                          <TableCell className="text-right text-slate-100">
                            {entry.totalDeploys.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-8 text-center text-slate-200"
                        >
                          No users yet. Add one to see the leaderboard.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Static pagination UI, Railway-style */}
              <div className="flex flex-col gap-3 border-t border-[hsl(246,11%,22%)] px-4 py-3 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(248,21%,13%)] px-3 py-1 text-[11px] sm:text-xs">
                  <span className="text-[hsl(246,7%,45%)]">Rows per page</span>
                  <span className="font-medium text-slate-100">10</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-xs text-[hsl(246,7%,45%)] sm:hidden">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] px-3 py-1 text-xs text-slate-200 transition hover:bg-[hsl(246,18%,15%)] disabled:opacity-50"
                    disabled
                  >
                    Previous
                  </button>
                  <div className="inline-flex items-center gap-1 rounded-full border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] px-1 py-0.5">
                    <button
                      type="button"
                      className="rounded-full bg-[hsl(0,0%,100%)] px-2 py-1 text-xs font-medium text-[hsl(250,24%,9%)]"
                    >
                      1
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-2 py-1 text-xs text-slate-300 hover:bg-[hsl(246,18%,15%)]"
                    >
                      2
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-2 py-1 text-xs text-slate-300 hover:bg-[hsl(246,18%,15%)]"
                    >
                      3
                    </button>
                    <span className="px-2 py-1 text-xs text-slate-500">…</span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-800/80 disabled:opacity-50"
                    disabled
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
