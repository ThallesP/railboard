export function normalizeUsername(username?: string) {
  return username?.trim() ?? "";
}

export function shouldFetchUserDetails(open: boolean, username: string) {
  return open && username.length > 0;
}
