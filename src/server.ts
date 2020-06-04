import { create } from './src/Controller/UserController.ts';
import * as express from "https://raw.githubusercontent.com/NMathar/deno-express/master/mod.ts";


(async () => {
  const port = 3000;
  const app = new express.App();
  app.use(express.simpleLog());
  app.use(express.static_("./public"));
  app.use(express.bodyParser.json());
  app.post("/api/user", create);
  app.get("/api/todos", async (req, res) => {
    await res.json([{ name: "Buy some milk" }]);
  });
  // route with dynamic parameter
  app.get("/api/user/{user_id}", async (req, res) => {
    await res.json([{ id: req.params.user_id, name: "Jim Doe", phone: "12425323" }]);
  });
  const server = await app.listen(port);
  console.log("app listening on port " + server.port);
})();