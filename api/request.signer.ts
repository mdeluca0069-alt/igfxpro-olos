export const signRequest = (payload: any, secret: string) => {
  const data = JSON.stringify(payload);
  return btoa(`${data}.${secret}`);
};