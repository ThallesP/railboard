import { createRouter } from "sv-router";
import Home from "./routes/Home.svelte";
import Index from "./routes/Index.svelte";
import NotFound from "./routes/NotFound.svelte";
import UserDetails from "./routes/UserDetails.svelte";

export const { p, navigate, isActive, route } = createRouter({
  // Home is a layout: the leaderboard stays mounted while user dialogs open on top of it.
  "/": {
    "/": Index,
    "/users/:username": UserDetails,
    layout: Home,
  },
  "*": NotFound,
});
