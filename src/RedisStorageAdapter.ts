import {
    Chunk,
    StorageAdapter,
    type StorageKey,
  } from "@automerge/automerge-repo"

import {RedisClientType} from "redis"

export class RedisStorageAdapter extends StorageAdapter {

  client: RedisClientType

  constructor(client: RedisClientType){
    super()
    this.client = client;
  }

  async load(key: StorageKey): Promise<Uint8Array | undefined>{
    console.log("load " +key)
    return new Promise((resolve, reject) => {
      this.client.get(key.join(":"))
      .then((reply) => {
        if(reply === undefined || reply === null){
          resolve(undefined);
        }
        else{
          resolve(Buffer.from(reply, "base64"));
        }
      })
      .catch((err)=>{
        reject(err)
      })
    })
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    console.log("save " + key)  
    return new Promise((resolve, reject) => {
        this.client.set(key.join(":"), Buffer.from(data).toString("base64")); //this is probably wrong. TODO: see what string encoding is best for this.
      })
      
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    console.log("loadrange")
      return new Promise((resolve, reject) => {
        this.client.keys(keyPrefix.join(":").concat(":*"))
      .then(async (keys) => {
        let chunks = await Promise.all(keys.map(async key => {
          let splitKey = key.split(":");
          return {
              key: splitKey,
              data: await this.load(splitKey)
          }
          
        }))
        resolve(chunks);
      })
      .catch((err)=>{
        reject(err)
      })
      })
  }

  async remove(key: StorageKey): Promise<void> {
    console.log("remove")
      return new Promise((resolve, reject)=>{
        try{
          this.client.del(key.join(":"))
          resolve()
        }
        catch(err){
          reject(err)
        }
      })    
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    console.log("removeRange")
    return new Promise((resolve, reject) => {
      this.client.keys(keyPrefix.join(":").concat(":*"))
    .then(async (keys) => {
      await Promise.all(keys.map((async key => {
        return this.remove(key.split(":"))
      })))
      resolve();
    })
    .catch((err)=>{
      reject(err)
    })
    })
  }
}