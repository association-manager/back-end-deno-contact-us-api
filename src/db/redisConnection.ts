import * as denoRedis from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import env from '../../.env';

export class Redis {

  static client: any;

  static getRedis = async (): Promise<Redis> => {
    if (Redis.client != null) {
      return Redis.client;
    } else {
      Redis.client = await denoRedis.connect(env.DATABASE_REDIS);
      return Redis.client;
    }
  }

  static commands = denoRedis.command();
  // Disconnects
  static getDisconnect = async ():Promise<Redis> => await Redis.client.disconnect();

 
}