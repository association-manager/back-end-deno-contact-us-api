import { Request } from './../../deno-express-master/mod';
import { ContactInterface } from "./../Interface/ContactInterface.ts";
import {
  contact,
  allContact,
  sendEmail,
} from "./../Controller/ContactController.ts";
import { assertEquals, test } from "https://deno.land/std/testing/asserts.ts";

const contactTest: ContactInterface = {
  "contactName": "Abdou",
  "firstName": "anica",
  "message": "Je ne vois pas de quoi tu parles",
  "email": "anica.abdou@deno.com",
  "idUs": "gio.gio@gmail.com",
};

test("method redis post contact ", async () => {
  const testContext = {
    request: async () => contactTest,
    response: {
      body: {
        "success": true,
        "contact": {
          "contactName": "Abdou",
          "firstname": "anica",
          "message": "Je ne vois pas de quoi tu parles",
          "email": "anica.abdou@deno.com",
          "idUs": "gio.gio@gmail.com",
          "key": "anica.abdou@deno.com",
        },
      },
    },
  };
  await contact(testContext);
  assertEquals(testContext.response.body, JSON.stringify({}));
});

test("method redis get all contact", async () => {
  const testContext = {
    Request: {
        body:''
    },
    response: {
      body: '',
    },
  };
  await allContact(testContext);
  assertEquals(testContext.response.body, JSON.stringify());
});

test("method redis sendEmail", async () => {
  const testContext = {
    request: {
      body: async () => ({"email" : contactTest}),
    },
    response: {
      body: '',
    },
  };
  await sendEmail(testContext);
  assertEquals(testContext.response.body, JSON.stringify({}));
});
