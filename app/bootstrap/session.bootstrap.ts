export async function restoreSession(): Promise<boolean> {
  const token = localStorage.getItem("access_token");
  return Boolean(token);
}
