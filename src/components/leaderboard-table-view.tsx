"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  applyLeaderboardDialogOpenChange,
  applyLeaderboardRowClick,
  CLICKABLE_ROW_CLASSNAME,
  type LeaderboardDialogState,
} from "@/lib/leaderboard-dialog-state";

const PAGE_SIZE = 30;

type UserDetailsDialogLikeProps = {
  username?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

type LeaderboardEntryBase = {
  username: string;
  totalDeploys: number;
};

type LeaderboardTableViewProps<TEntry extends LeaderboardEntryBase> = {
  entries: TEntry[];
  isLoading?: boolean;
  isError?: boolean;
  UserDetailsDialogComponent?: React.ComponentType<UserDetailsDialogLikeProps>;
};

function FallbackUserDetailsDialog() {
  return null;
}

export function LeaderboardTableView<TEntry extends LeaderboardEntryBase>({
  entries,
  isLoading = false,
  isError = false,
  UserDetailsDialogComponent = FallbackUserDetailsDialog,
}: LeaderboardTableViewProps<TEntry>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [dialogState, setDialogState] = React.useState<LeaderboardDialogState>({
    selectedUsername: "",
    open: false,
  });
  const loadMoreRef = React.useRef<HTMLTableRowElement>(null);

  const columns = React.useMemo<ColumnDef<TEntry>[]>(
    () => [
      {
        accessorKey: "username",
        header: ({ column }) => {
          return <div className="capitalize">{column.id}</div>;
        },
        cell: ({ row }) => (
          <div className="lowercase">{row.getValue("username")}</div>
        ),
      },
      {
        accessorKey: "totalDeploys",
        header: ({ column }) => {
          return <div className="capitalize text-right">{column.id}</div>;
        },
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {row.getValue("totalDeploys")}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: entries,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const allRows = table.getRowModel().rows;
  const visibleRows = allRows.slice(0, visibleCount);
  const hasMore = visibleCount < allRows.length;

  const handleRowClick = React.useCallback((row: (typeof allRows)[number]) => {
    setDialogState((currentState) =>
      applyLeaderboardRowClick(currentState, row.getValue("username")),
    );
  }, []);

  const handleDialogOpenChange = React.useCallback((open: boolean) => {
    setDialogState((currentState) =>
      applyLeaderboardDialogOpenChange(currentState, open),
    );
  }, []);

  React.useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasMore) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] shadow-2xl">
      <div className="relative">
        <div className="flex flex-col gap-3 border-b border-[hsl(246,11%,22%)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold text-slate-100">Leaderboard</p>
            <p className="text-xs text-[hsl(246,7%,45%)]">
              Displaying all the users on the leaderboard.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Input
              placeholder="Search users..."
              value={
                (table.getColumn("username")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) => {
                table.getColumn("username")?.setFilterValue(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="h-8 w-full max-w-xs bg-[hsl(248,21%,13%)] text-xs text-slate-100 placeholder:text-[hsl(246,7%,45%)]"
            />
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto px-2 pb-4 pt-1 sm:px-4">
          <Table>
            <TableHeader className="sticky top-0 bg-[hsl(250,21%,11%)]">
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
              ) : visibleRows.length > 0 ? (
                <>
                  {visibleRows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className={CLICKABLE_ROW_CLASSNAME}
                      data-state={row.getIsSelected() && "selected"}
                      onClick={() => handleRowClick(row)}
                    >
                      <TableCell className="font-medium text-slate-100">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-slate-100">
                        {row.original.username}
                      </TableCell>
                      <TableCell className="text-right text-slate-100">
                        {row.original.totalDeploys.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {hasMore && (
                    <TableRow ref={loadMoreRef}>
                      <TableCell
                        colSpan={3}
                        className="py-4 text-center text-slate-400"
                      >
                        Loading more...
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
      </div>

      <UserDetailsDialogComponent
        username={dialogState.selectedUsername}
        open={dialogState.open}
        onOpenChange={handleDialogOpenChange}
        showTrigger={false}
      />
    </section>
  );
}
