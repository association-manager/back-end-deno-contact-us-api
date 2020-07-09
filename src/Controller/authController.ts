import { validateJwt } from "https://deno.land/x/djwt/validate.ts";

const key = "your-secret";

export const login = async (token: string | undefined) => {
  if (token) {
    return await validateJwt(token, key);
  } else false;
};
