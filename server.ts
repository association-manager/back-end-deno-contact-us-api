import { ContactInterface } from './src/Interface/ContactInterface.ts';
import {connect} from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import * as expressive from "https://raw.githubusercontent.com/NMathar/deno-express/master/mod.ts";

const redisconnection = await connect({
  hostname: "127.0.0.1",
  port: 6379})

console.log(await redisconnection.echo('connection successful').then(echo=>echo).catch(err=>err));

const port = 3000;
const app = new expressive.App();

app.use(expressive.simpleLog());
app.use(expressive.bodyParser.json());
app.post("/am_api_contact_us/contact", async (req, res)=>{

  let contact: ContactInterface = req.data;

  if(!contact.contactName){
      res.empty(400);
      return res.json({"error" : "Un des champs est manquant"});
  }
  //must be an association's email
  const idUs = contact.idUs;
  contact.key = contact.email;

  //redis commands with pipeline
  const redis = redisconnection.pipeline();
  await redis.lpush(idUs, contact.key)
  await redis.hset(contact.key, "contact name", contact.contactName,
                              "first name", contact.firstName,
                              "email", contact.email,
                              "message", contact.message,
                              "idUs", contact.idUs);
  await redis.expire(contact.key, 48*3600);
  const result = await redis.flush().then(()=>1).catch(err=>err);
  if (result !== 1)
    return res.json({"success" : contact});
  else {
    res.empty(409)
    return res.json(result);
  }
});
app.get("/am_api_contact_us/all",  async (req,res) => res.json((await redisconnection.keys('*')).toString()));
app.get("/am_api_contact_us/contact/{id_us}", async (req,res) =>{
  const idUs= req.params.id_us;
  let emailValidation = new RegExp(/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2}|aero|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel)$/);
  if(!emailValidation.test(idUs)){
    res.empty(400);
    return res.json({"error" : "l'address email n'est pas vailde"});
  }
  
  const listOfContact = await redisconnection.lrange(idUs,0,-1);
  
  return res.json(listOfContact.map(async (contactKey)=> await redisconnection.hgetall(contactKey)));
});

const server = await app.listen(port);
console.log("app listening on port " + server.port);
