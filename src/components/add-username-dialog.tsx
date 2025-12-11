"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "../../convex/_generated/api";

export function AddUsernameDialog() {
  const [username, setUsername] = useState("");
  const { mutate } = useMutation({
    mutationFn: useConvexMutation(api.leaderboard.addUser),
  });

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      mutate({ username });
      setUsername("");
    },
    [mutate, username],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          Add username
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add username</DialogTitle>
          <DialogDescription>
            Enter the Railway username to add to the leaderboard.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Username
            <input
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-hidden ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="@username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <DialogFooter>
            <DialogClose asChild>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                Save
              </button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
