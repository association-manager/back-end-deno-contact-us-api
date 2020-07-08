import { Router, RouterContext } from "https://deno.land/x/oak/mod.ts";
import { ContactInterface } from "../Interface/ContactInterface.ts";
import { connect } from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import axiod from "https://deno.land/x/axiod/mod.ts";

const redisConnection = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

console.log(
  await redisConnection.echo("connection successful").then((echo) => echo)
    .catch((err) => err),
);

export const contactController = new Router();

export const contact = async (context: RouterContext) => {
  const contact: ContactInterface = (await context.request.body()).value;

  if (!contact.contactName) {
    context.response.status = 400;
    context.response.body = JSON.stringify(
      { "error": "Un des champs est manquant" },
    );
  }
  //must be an association's email
  const idUs = contact.idUs;
  contact.key = contact.email;

  //redis commands with pipeline
  const redis = redisConnection.pipeline();
  await redis.lpush(idUs, contact.key);
  await redis.hset(
    contact.key,
    "contact name",
    contact.contactName,
    "first name",
    contact.firstName,
    "email",
    contact.email,
    "message",
    contact.message,
    "idUs",
    contact.idUs,
  );
  await redis.expire(contact.key, 48 * 3600);
  const result = await redis.flush().then(() => 1).catch((err) => err);
  if (result == 1) {
    context.response.body = await JSON.stringify({ success: true, contact });
  } else {
    context.response.status = 409;
    context.response.body = await result;
  }
};

export const allContact = async (context: RouterContext) => {
  const result = await redisConnection.keys("*");
  context.response.body = await JSON.stringify({ success: true, result });
};

export const sendEmail = async (context: RouterContext<{ id_us: string }>) => {
  const idUs: string = context.params.id_us;

  let emailValidation = new RegExp(
    /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2}|aero|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel)$/,
  );
  if (!emailValidation.test(idUs)) {
    context.response.status = 400;
    context.response.body = JSON.stringify(
      { success: false, error: "l'address email n'est pas vailde" },
    );
  }
  let contacts: any = [];
  const listOfContactsAsso = await redisConnection.lrange(idUs, 0, -1);

  for (let i = 0; i < listOfContactsAsso.length - 1; i++) {
    contacts.push(
      await redisConnection.hgetall(listOfContactsAsso[i]).then((data) => data)
        .catch(() => new Error("donnée introuvable avec la clé demandée")),
    );
  }

  await axiod
    .post("apiSymfony/contact/us", {
      "email": contacts,
    })
    .then((response) =>
      context.response.body = JSON.stringify({ success: true, response })
    )
    .catch((error) =>
      context.response.body = JSON.stringify({ success: false, error })
    );
};
contactController
  .prefix("/am_api_contact_us")
  .post("/contact", contact)
  .get("/all", allContact)
  .get<{ id_us: string }>("/send-email/:id_us", sendEmail);

export default contactController;
