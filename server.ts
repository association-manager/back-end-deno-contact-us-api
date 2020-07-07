import { ContactInterface } from './src/Interface/ContactInterface.ts';
import {connect} from "https://denopkg.com/keroxp/deno-redis/mod.ts";
//import * as expressive from "./deno-express-master/mod.ts";
import snowlight, {IRequest, IResponse, IRouter} from "https://deno.land/x/snowlight/mod.ts";

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
  route.post("/contact", async (req : IRequest, res : IResponse)=>{

    let contact: ContactInterface = req.body;

    if(!contact.contactName){
        res.status(400);
        return res.json({"error" : "Un des champs est manquant"});
    }
    //must be an association's email
    const idUs = contact.idUs;
    contact.key = contact.email;

    //redis commands with pipeline
    const redis = redisConnection.pipeline();
    await redis.lpush(idUs, contact.key)
    await redis.hset(contact.key, "contact name", contact.contactName,
                                "first name", contact.firstName,
                                "email", contact.email,
                                "message", contact.message,
                                "idUs", contact.idUs);
    await redis.expire(contact.key, 48*3600);
    const result = await redis.flush().then(()=>1).catch(err=>err);
    if (result == 1)
      return res.json({"success" : contact});
    else {
      res.status(409)
      return res.json(result);
    }
  });

  route.get("/all",  async (req : IRequest, res : IResponse) => {

    const result = await redisConnection.keys('*');
    return await res.json({"success" : result});  
  });

  route.get("/contact/:id_us", async (req : IRequest, res : IResponse) => {
    const idUs= req.params.id_us;
    let emailValidation = new RegExp(/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2}|aero|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel)$/);
    if(!emailValidation.test(idUs)){
      res.status(400);
      return res.json({"error" : "l'address email n'est pas vailde"});
    }
    let contacts: any= []; 
    const listOfContactsAsso = await redisConnection.lrange(idUs,0,-1);

  for(let i=0; i < listOfContactsAsso.length-1; i++)
    contacts.push(await redisConnection.hgetall(listOfContactsAsso[i]).then(data=>data).catch(()=> new Error("donnée introuvable avec la clé demandée")));

    return await res.json({"contact" : contacts });
  });
  
});

app.listen(port, () => console.log("Server started! 🔥 on port : " + port));