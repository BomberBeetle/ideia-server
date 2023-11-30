// @ts-check
import express from "express"
import { WebSocketServer } from "ws";
import { Repo, PeerId } from "@automerge/automerge-repo"
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket"
import { RedisStorageAdapter } from "./RedisStorageAdapter.js"
import os from "os"
import { Server } from "http";
import { RedisClientType, createClient } from "redis";
import IdeaDoc from "./IdeiaDoc.js";
import DocStruct from "./DocStruct.js";
import {v4} from "uuid"
import cors from "cors"

export class IdeaServer {
  
  socket: WebSocketServer

  server: Server

  redisClient: RedisClientType
  
  readyResolvers : ((value: any) => void)[] = []

  isReady = false

  
  repo : Repo

  constructor() {

    var hostname = os.hostname()

    this.socket = new WebSocketServer({ noServer: true })

    this.redisClient = createClient();

    const config = {
      network: [new NodeWSServerAdapter(this.socket)],
      storage: new RedisStorageAdapter(this.redisClient),
      peerId: `storage-server-${hostname}` as PeerId,
      sharePolicy: async () => false,
    }
    this.repo = new Repo(config)
  }

  async start(){

    try {
      await this.redisClient.connect()
    }
    catch(err){
      throw err;
    }

    const app = express()
    app.use(express.static("public"))
    app.use(cors());

    const PORT =
    process.env.PORT !== undefined ? parseInt(process.env.PORT) : 3030

    app.post("/register",express.json(), (req, res) => {
      if(!!req.body.email && !!req.body.password){
        this.redisClient.keys("users:*").then(async (keys)=>{
          for(let i = 0; i<keys.length; i++){
            let mail = await this.redisClient.get(`${keys[i]}:email`);
            if(mail == req.body.email){
              res.sendStatus(403);
              return;
            }
          }
          let newId = v4();
          this.redisClient.set(`users:${newId}:password`, req.body.password)
          this.redisClient.set(`users:${newId}:email`, req.body.email)
          this.redisClient.set(`users:${newId}`, newId)
          res.json({
            id: newId
          })
        })
        
      }
      else{
        res.sendStatus(403)
      }
    })

    app.post("/login",express.json(), (req,res) => {
      if(!!req.body.email && !!req.body.password){
        this.redisClient.keys("users:*").then(async (keys)=>{
          for(let i = 0; i<keys.length; i++){
            let mail = await this.redisClient.get(`${keys[i]}:email`);
            if(mail == req.body.email){
              let pass = await this.redisClient.get(`${keys[i]}:password`);
              if(pass == req.body.password){
                let idUs = await this.redisClient.get(`${keys[i]}`)
                res.json({
                  id: idUs
                })
                return;
              }
            }
          }
          res.sendStatus(403)
          return;
        }).catch((err) => {
          res.sendStatus(500)
        })  
      }
      
    })

    app.get("/", (req, res) => {
      res.send(`Server running`)
    })

    app.post("/doc/create", express.json(), (req, res)=>{
       let ownerId = req.body.userId
       let newAutomergeDoc = this.repo.create<DocStruct>()
       newAutomergeDoc.change((d) => {
        d.title = "Novo Documento"
        d.content = ""
       })
       let doc : IdeaDoc = {
        document_id: newAutomergeDoc.documentId,
        owner: ownerId,
        allowedUserIds: [ownerId]
       }
       this.redisClient.set(`docs:${ownerId}:${doc.document_id}`, JSON.stringify(doc))
       res.json(doc)
    })

    app.get("/doc/", express.json(),(req,res)=>{
      let docId = req.body.document_id;
      let userId = req.body.userId
      let ownerId = req.body.ownerId
      this.redisClient.get(`docs:${ownerId}:${docId}`).then(
        (val)=>{
          if (val === null){
            res.sendStatus(404)
            return
          }
          let doc : IdeaDoc = JSON.parse(val);
          if(doc.allowedUserIds.includes(userId)){
            res.json(doc)
          }
          else{
            res.sendStatus(403)
          }
        }
      ).catch((err)=>{
        console.log(err)
        res.sendStatus(500)
      })

    })

    app.get("/doc/all", (req, res)=> {
      let ownerId = req.get("Owner-Id")
      console.log("all " + ownerId)
      this.redisClient.keys(`docs:${ownerId}:*`).then((keys)=>{
        Promise.all(keys.map(async (key) => JSON.parse(await this.redisClient.get(key)))).then((docs)=>res.json(docs))
      })
    })

    app.post("/doc/delete", express.json(), (req, res)=>{
      
    })

    this.server = app.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`)
      this.isReady = true
      this.readyResolvers.forEach((resolve) => resolve(true))
    })
    
    this.server.on("upgrade", (request, socket, head) => {
      this.socket.handleUpgrade(request, socket, head, (socket) => {
        this.socket.emit("connection", socket, request)
      })
    })
  }

  async ready() {
    if (this.isReady) {
      return true
    }

    return new Promise((resolve) => {
      this.readyResolvers.push(resolve)
    })
  }

  close() {
    this.socket.close()
    this.server.close()
  }
}