<script lang="ts">
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { toast } from "svelte-sonner";
  import { ApiError, api } from "$lib/api";
  import * as Dialog from "$lib/components/ui/dialog";
  import { celebrate } from "$lib/confetti";

  const brandButton =
    "flex h-[42px] items-center justify-center rounded-lg border border-brand bg-brand px-3 py-2 text-base leading-6 text-white transition-transform duration-50 hover:border-brand-hover hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

  let open = $state(false);
  let username = $state("");

  const queryClient = useQueryClient();
  const addUser = createMutation(() => ({
    mutationFn: (username: string) => api.addUser(username.trim()),
    onSuccess: (added) => {
      toast.success(`${added.username} added to the leaderboard!`);
      celebrate();
      username = "";
      open = false;
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status < 500
          ? error.message
          : "Failed to add user. Please try again.",
      );
    },
  }));

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    addUser.mutate(username);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger class={brandButton}>Add username</Dialog.Trigger>
  <Dialog.Content class="sm:max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Add username</Dialog.Title>
      <Dialog.Description>Enter the Railway username to add to the leaderboard.</Dialog.Description>
    </Dialog.Header>

    <form class="grid gap-4" {onsubmit}>
      <label class="grid gap-2 text-sm font-medium text-foreground">
        Username
        <input
          class="w-full rounded-md border border-border px-3 py-2 text-sm ring-offset-background outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          placeholder="username"
          bind:value={username}
          disabled={addUser.isPending}
          required
        />
      </label>

      <div class="rounded-md border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
        <p class="mb-2 font-medium text-foreground">How to find your Railway username</p>
        <ol class="list-decimal space-y-1 pl-4">
          <li>
            Go to
            <a
              href="https://railway.com/account"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-foreground underline underline-offset-2"
            >
              railway.com/account
            </a>
          </li>
          <li>Set your username.</li>
          <li>Enable your public profile.</li>
        </ol>
      </div>

      <Dialog.Footer>
        <button type="submit" disabled={addUser.isPending} class={brandButton}>
          {addUser.isPending ? "Adding..." : "Save"}
        </button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
