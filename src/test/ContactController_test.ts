
import {contact, allContact, sendEmail}  from './../Controller/ContactController.ts';
import { assertEquals, test} from 'https://deno.land/std/testing/asserts.ts';

test('method redis post contat ', async () => {
    const testContext= {
        request: {
            body: async() => ({})
        },
        response: {
            body :""
        }
    }
    await contact(testContext);
    assertEquals(testContext.response.body, JSON.stringify())
});

test('method redis get all contact', async () => {
    const testContext= {
        request : {
            body: async() => ({})
        },
        response: {
            body:""
        }
    }
    await allContact(testContext);
    assertEquals(testContext.response.body, JSON.stringify())
});

test('method redis sendEmail', async () => {
    const testContext= {
        request : {
            body: async() => ({})
        },
        response: {
            body:""
        }
    }
    await sendEmail(testContext);
    assertEquals(testContext.response.body, JSON.stringify())
});