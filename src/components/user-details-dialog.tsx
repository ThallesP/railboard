"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "../../convex/_generated/api";

type UserDetailsDialogProps = {
  username: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function UserDetailsDialog({ username }: UserDetailsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const now = React.useMemo(() => (open ? Date.now() : 0), [open]);

  const { data, isLoading, isError } = useQuery(
    convexQuery(api.users.getUserDetails, {
      username,
      now,
      limit: 60,
    }),
    {
      enabled: open,
    },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs text-slate-200 hover:bg-slate-800/70 hover:text-white"
        >
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {data?.user.name ?? data?.user.username ?? username}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {data?.user.username ?? username} · User details and deployment
            history.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-4 text-sm text-slate-300">
            Loading user details...
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-4 text-sm text-rose-200">
            Failed to load user details.
          </div>
        ) : !data ? (
          <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-4 text-sm text-slate-300">
            This user is no longer on the leaderboard.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Total deploys
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {data.stats.currentTotalDeploys.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Deploys (24h)
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {data.stats.deploysLast24h.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Deploys (7d)
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {data.stats.deploysLast7d.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Deploys (30d)
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {data.stats.deploysLast30d.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Avg/day (30d)
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {data.stats.averagePerDayLast30d.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Last updated
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {dateTimeFormatter.format(data.stats.lastTrackedAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  First tracked
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {dateTimeFormatter.format(data.stats.firstTrackedAt)}
                </p>
              </div>
              <div className="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Profile
                </p>
                <div className="mt-2 text-sm text-slate-200">
                  {data.user.name ? (
                    <div>{data.user.name}</div>
                  ) : (
                    <div className="text-slate-400">No name provided</div>
                  )}
                  {data.user.website ? (
                    <a
                      href={data.user.website}
                      className="mt-1 block text-xs text-slate-300 underline decoration-slate-600 underline-offset-2"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {data.user.website}
                    </a>
                  ) : (
                    <div className="mt-1 text-xs text-slate-400">
                      No website on file
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Deployments over time</span>
                <span>Last {data.samplesShown} samples</span>
              </div>
              <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-[hsl(246,11%,22%)]">
                <table className="w-full text-sm">
                  <thead className="bg-[hsl(250,21%,11%)] text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deployments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-center text-slate-400"
                        >
                          No deployment history available yet.
                        </td>
                      </tr>
                    ) : (
                      data.deployments.map((entry) => (
                        <tr
                          key={`${entry.createdAt}-${entry.totalDeploys}`}
                          className="border-t border-[hsl(246,11%,22%)]"
                        >
                          <td className="px-3 py-2 text-left text-slate-200">
                            {dateTimeFormatter.format(entry.createdAt)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-200">
                            {entry.totalDeploys.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-200">
                            +{entry.delta.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
