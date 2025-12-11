"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { AddUsernameDialog } from "@/components/add-username-dialog";
import {
  Table,
  TableBody,
  TableCaption,
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

  return (
    <div className="py-4">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-bold">Railboard</h1>
        <p>Railboard is a simple leaderboard for Railway deployments.</p>

        <AddUsernameDialog />
      </div>

      <div className="py-60">
        <Table>
          <TableCaption>Railway deployments leaderboard.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Total deploys</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3}>Loading leaderboard…</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={3}>Failed to load leaderboard.</TableCell>
              </TableRow>
            ) : leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <TableRow key={entry._id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {entry.username}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.totalDeploys.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3}>
                  No users yet. Add one to see the leaderboard.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
