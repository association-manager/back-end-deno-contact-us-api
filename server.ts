import { create, getAll } from './src/Controller/ContactController.ts';
import * as expressive from "https://raw.githubusercontent.com/NMathar/deno-express/master/mod.ts";


(async () => {
  const port = 3000;
  const app = new expressive.App();
  app.use(expressive.simpleLog());
  app.use(expressive.static_("./public"));
  app.use(expressive.bodyParser.json());
  app.post("/am_api_contact_us/contact", create);
  app.get("/am_api_contact_us/all", getAll);
  // route with dynamic parameter
  app.get("/am_api_contact_us/contact/{us_id}", async (req, res) => {
    await res.json([{ id: req.params.user_id, name: "Jim Doe", phone: "12425323" }]);
  });
  const server = await app.listen(port);
  console.log("app listening on port " + server.port);
})();