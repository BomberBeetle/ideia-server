#!/usr/bin/env node
// @ts-check

import { IdeaServer } from "./server.js"

const server = new IdeaServer()

server.start().catch((err)=>{
    throw err;
})

