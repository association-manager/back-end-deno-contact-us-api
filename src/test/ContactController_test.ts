import { ContactInterface } from "./../Interface/ContactInterface.ts";
import {
  contact,
  allContact,
  sendEmail,
} from "./../Controller/ContactController.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

const contactTest: ContactInterface = {
  contactName: "Abdou",
  firstName: "anica",
  message: "Je ne vois pas de quoi tu parles",
  email: "anica.abdou@deno.com",
  idUs: "gio.gio@gmail.com",
};

Deno.test("method redis post contact ", async () => {
  const testContext: any = {
    request: {
      body: async () => contactTest
    },
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
  assertEquals(
    testContext.response.body,
    JSON.stringify({
      "success": true,
      "contact": {
        "contactName": "Abdou",
        "firstname": "anica",
        "message": "Je ne vois pas de quoi tu parles",
        "email": "anica.abdou@deno.com",
        "idUs": "gio.gio@gmail.com",
        "key": "anica.abdou@deno.com",
      },
    }),
  );
});

Deno.test("method redis post contact error", async () => {
  const testContext: any = {
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
  assertEquals(
    testContext.response.body,
    JSON.stringify({
      "error": "Un des champs est manquant",
    }),
  );
});

Deno.test("method redis get all contact", async () => {
  const testContext: any = {
    Request: {
      body: "",
    },
    response: {
      body: {
        "success": true,
        "result": ["contact name", "gio.gio@gmail.com", "test"],
      },
    },
  };
  await allContact(testContext);
  assertEquals(
    testContext.response.body,
    JSON.stringify(
      {
        "success": true,
        "result": ["contact name", "gio.gio@gmail.com", "test"],
      },
    ),
  );
});

Deno.test("method redis get contact for an association", async () => {
  const testContext: any = {
    Request: {
      body: "",
    },
    response: {
      body: {
        "success": true,
        "result": [
          "anica.abdou@deno.com",
          "contact name",
          "gio.gio@gmail.com",
          "test",
        ],
      },
    },
  };
  await allContact(testContext);
  assertEquals(
    testContext.response.body,
    JSON.stringify(
      {
        "success": true,
        "result": [
          "anica.abdou@deno.com",
          "contact name",
          "gio.gio@gmail.com",
          "test",
        ],
      },
    ),
  );
});

Deno.test("method redis sendEmail", async () => {
  const testContext: any = {
    request: {
      params: { "id_us": "gio.gio@gmail.com" },
    },
    response: {
      body: { success: true, "result": "l'email a envoyé" },
    },
  };
  await sendEmail(testContext);
  assertEquals(
    testContext.response.body,
    JSON.stringify({ success: true, "result": "l'email a envoyé" }),
  );
});

Deno.test("method redis sendEmail error", async () => {
  const testContext: any = {
    request: {
      param: { "id_us": "error@gmail.com" },
    },
    response: {
      body: "",
    },
  };
  await sendEmail(testContext);
  assertEquals(
    testContext.response.body,
    JSON.stringify({ success: false }),
  );
});
