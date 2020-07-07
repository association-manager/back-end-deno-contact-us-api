import snowlight, {IRouter} from "https://deno.land/x/snowlight/mod.ts";
import {connect} from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import {contactController} from './src/Controller/ContactController.ts'

//import * as expressive from "./deno-express-master/mod.ts";

const redisConnection = await connect({
  hostname: "127.0.0.1",
  port: 6379})

console.log(await redisConnection.echo('connection successful').then(echo=>echo).catch(err=>err));

const port = 3000;
//const app = new expressive.App();
const app = snowlight();

/* app.use(expressive.simpleLog());
app.use(expressive.bodyParser.json()); */
app.use(app.urlencoded(), app.json());
app.group("/am_api_contact_us", [] ,(route: IRouter) => {
  contactController(redisConnection, route);
});

app.listen(port, () => console.log("Server started! 🔥 on port : " + port));