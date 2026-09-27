<script lang="ts">
  import { p } from "../router";
</script>

<div
  class="flex min-h-screen flex-col items-center justify-center gap-4 bg-[hsl(250,24%,9%)] px-4 text-center"
>
  <h1>Page not found</h1>
  <p class="text-slate-400">There's nothing on the tracks here.</p>
  <a href={p("/")} class="text-sm font-medium text-slate-100 underline underline-offset-4">
    Back to the leaderboard
  </a>
</div>
