<script lang="ts">
  import type { Attachment } from "svelte/attachments";
  import type { LeaderboardEntry } from "$lib/api";
  import { Input } from "$lib/components/ui/input";
  import * as Table from "$lib/components/ui/table";
  import { p } from "../../router";

  const PAGE_SIZE = 30;

  type Props = {
    entries: LeaderboardEntry[];
    isLoading?: boolean;
    isError?: boolean;
  };

  let { entries, isLoading = false, isError = false }: Props = $props();

  let search = $state("");
  let visibleCount = $state(PAGE_SIZE);

  // Rank comes from the full list so it doesn't change while searching.
  const ranked = $derived(entries.map((entry, index) => ({ ...entry, rank: index + 1 })));
  const filtered = $derived.by(() => {
    const query = search.trim().toLowerCase();
    return query ? ranked.filter((entry) => entry.username.toLowerCase().includes(query)) : ranked;
  });
  const visible = $derived(filtered.slice(0, visibleCount));
  const hasMore = $derived(visibleCount < filtered.length);

  // Reveal the next page when the "Loading more..." row scrolls into view.
  const loadMore: Attachment<HTMLElement> = (element) => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) visibleCount += PAGE_SIZE;
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  };

  const headClass = "text-xs font-medium tracking-wide text-[hsl(246,7%,45%)] uppercase";
  const linkClass = "block p-2 font-medium text-slate-100 outline-none";
</script>

<section
  class="relative overflow-hidden rounded-2xl border border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] shadow-2xl"
>
  <div
    class="flex flex-col gap-3 border-b border-[hsl(246,11%,22%)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
  >
    <div>
      <p class="text-sm font-semibold text-slate-100">Leaderboard</p>
      <p class="text-xs text-[hsl(246,7%,45%)]">Displaying all the users on the leaderboard.</p>
    </div>
    <Input
      placeholder="Search users..."
      bind:value={search}
      oninput={() => (visibleCount = PAGE_SIZE)}
      class="h-8 w-full max-w-xs bg-[hsl(248,21%,13%)] text-xs text-slate-100 placeholder:text-[hsl(246,7%,45%)]"
    />
  </div>

  <div class="max-h-[600px] overflow-y-auto px-2 pt-1 pb-4 sm:px-4">
    <Table.Root>
      <Table.Header class="sticky top-0 bg-[hsl(250,21%,11%)]">
        <Table.Row class="hover:bg-transparent">
          <Table.Head class="w-[72px] {headClass}">#</Table.Head>
          <Table.Head class={headClass}>User</Table.Head>
          <Table.Head class="text-right {headClass}">Total deploys</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if isLoading}
          <Table.Row>
            <Table.Cell colspan={3} class="py-8 text-center text-slate-200">
              Loading leaderboard…
            </Table.Cell>
          </Table.Row>
        {:else if isError}
          <Table.Row>
            <Table.Cell colspan={3} class="py-8 text-center text-slate-200">
              Failed to load leaderboard.
            </Table.Cell>
          </Table.Row>
        {:else if visible.length === 0}
          <Table.Row>
            <Table.Cell colspan={3} class="py-8 text-center text-slate-200">
              {entries.length === 0
                ? "No users yet. Add one to see the leaderboard."
                : "No users match your search."}
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each visible as entry (entry.username)}
            {@const href = p("/users/:username", { params: { username: entry.username } })}
            <Table.Row
              class="cursor-pointer transition-colors focus-within:bg-slate-800/70 hover:bg-slate-800/70"
            >
              <Table.Cell class="p-0">
                <a {href} data-scroll-to-top="false" tabindex="-1" class={linkClass}>
                  {entry.rank}
                </a>
              </Table.Cell>
              <Table.Cell class="p-0">
                <a {href} data-scroll-to-top="false" class={linkClass}>{entry.username}</a>
              </Table.Cell>
              <Table.Cell class="p-0">
                <a {href} data-scroll-to-top="false" tabindex="-1" class="{linkClass} text-right">
                  {entry.totalDeploys.toLocaleString()}
                </a>
              </Table.Cell>
            </Table.Row>
          {/each}
          {#if hasMore}
            <tr {@attach loadMore}>
              <td colspan={3} class="py-4 text-center text-slate-400">Loading more...</td>
            </tr>
          {/if}
        {/if}
      </Table.Body>
    </Table.Root>
  </div>
</section>
