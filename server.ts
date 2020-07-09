// Importing some console colors
import { bold, yellow } from "https://deno.land/std@0.60.0/fmt/colors.ts";
import { Application, Context, Status } from "https://deno.land/x/oak/mod.ts";
// import { login } from "./src/Controller/authController.ts";
import contactController from "./src/Controller/ContactController.ts";
import * as flags from "https://deno.land/std/flags/mod.ts"

const app = new Application();
const DEFAULT_PORT = 3000
const {args} = Deno;
const argsPort = flags.parse(args).port;
const port= argsPort? Number(argsPort) : DEFAULT_PORT;

function notFound(context: Context) {
  context.response.status = Status.NotFound;
  context.response.body = JSON.stringify(
    { "404 - Not Found": `Path ${context.request.url} not found.` },
  );
}

//authorization middleware
/* app.use(async (ctx, next)=>{
  const authorization = ctx.request.headers.get('Authorization');
  const tokenValid = await login(authorization?.replace('Bearer', '')
  
  if(tokenValid){
    await next();
    return
  }
  ctx.response.body = JSON.stringify({error : "Not authotized"})
}) */

app.use(contactController.routes());
app.use(contactController.allowedMethods());

// A basic 404 page
app.use(notFound);

app.addEventListener("listen", ({ hostname, port }) => {
  console.log(
    bold("Server started! 🔥 listening on ") + yellow(`${hostname}:${port}`),
  );
});

await app.listen({ hostname: "127.0.0.1", port: port });
console.log(bold("Finished."));
