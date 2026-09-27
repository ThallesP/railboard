<script lang="ts">
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import { Router } from "sv-router";
  import { Toaster } from "svelte-sonner";
  import { ApiError } from "$lib/api";
  import "./router";

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Retrying won't change a 4xx answer (e.g. a user that isn't on the leaderboard).
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 3,
      },
    },
  });
</script>

<QueryClientProvider client={queryClient}>
  <div class="container mx-auto">
    <Router />
  </div>
  <Toaster />
</QueryClientProvider>
