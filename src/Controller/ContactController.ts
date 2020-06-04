import { Redis } from '../db/redisConnection.ts';
import { ContactInterface } from './../Interface/ContactInterface.ts';


export const create = async ({request, response})=>{

    const contact: ContactInterface = await request.body;

    if(!contact.contactName){
        return response.status(402).send(`<h2>Error data!</h2><p>${JSON.stringify(contact)}</p>`);
    }
    Redis.getRedis();
    Redis.commands.hset(contact.id, "name", contact.contactName,
                                    "first name", contact.firstName,
                                    "email", contact.email,
                                    "message", contact.message);
    Redis.commands.expire(contact.id, 48*3600);

    return response.status(201).send(`<h2>Data Insert</h2><p>${JSON.stringify(contact)}</p>`);
}

export const getAll= async () => {}