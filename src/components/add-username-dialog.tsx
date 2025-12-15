"use client";

import { useConvexAction } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { ConvexError } from "convex/values";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "../../convex/_generated/api";
import confetti from "canvas-confetti";

export function AddUsernameDialog() {
  const [username, setUsername] = useState("");
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useMutation({
    mutationFn: useConvexAction(api.leaderboard.addUser),
    onSuccess: (data: { username: string; totalDeploys: number }) => {
      toast.success(`${data.username} added to the leaderboard!`);
      const end = Date.now() + 1000; // 1 second
      const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
      const frame = () => {
        if (Date.now() > end) return;
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          startVelocity: 60,
          origin: { x: 0, y: 0.5 },
          colors: colors,
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          startVelocity: 60,
          origin: { x: 1, y: 0.5 },
          colors: colors,
        });
        requestAnimationFrame(frame);
      };
      frame();
      setUsername("");
      setOpen(false);
    },
    onError: (error) => {
      if (error instanceof ConvexError) {
        toast.error(error.data);
      } else {
        toast.error("Failed to add user. Please try again.");
      }
    },
  });

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      mutate({ username });
    },
    [mutate, username]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group/button flex h-[42px] items-center justify-center space-x-3 rounded-lg border border-pink-500 bg-pink-500 px-3 py-2 text-base leading-6 text-white transition-transform duration-50 hover:border-pink-600 hover:bg-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 disabled:cursor-not-allowed disabled:bg-pink-500 disabled:border-pink-500 disabled:opacity-50 disabled:active:scale-100 active:scale-95"
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
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-hidden ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              placeholder="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isPending}
              required
            />
          </label>

          <div className="rounded-md border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">
              How to find your Railway username
            </p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                Go to{" "}
                <a
                  href="https://railway.com/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  railway.com/account
                </a>
              </li>
              <li>Set your username.</li>
              <li>Enable your public profile.</li>
            </ol>
          </div>

          <DialogFooter>
            <button
              type="submit"
              disabled={isPending}
              className="group/button flex h-[42px] items-center justify-center space-x-3 rounded-lg border border-pink-500 bg-pink-500 px-3 py-2 text-base leading-6 text-white transition-transform duration-50 hover:border-pink-600 hover:bg-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 disabled:cursor-not-allowed disabled:bg-pink-500 disabled:border-pink-500 disabled:opacity-50 disabled:active:scale-100 active:scale-95"
            >
              {isPending ? "Adding..." : "Save"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
