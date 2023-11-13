import {
    Chunk,
    StorageAdapter,
    type StorageKey,
  } from "@automerge/automerge-repo"

export class RedisStorageAdapter extends StorageAdapter {
  async load(key: StorageKey): Promise<Uint8Array | undefined>{
    return new Promise((resolve, reject) => {
      reject("Not implemented");
    })
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
      
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
      return new Promise((resolve, reject) => {
        reject("Not implemented");
      })
  }

  async remove(key: StorageKey): Promise<void> {
      
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
      
  }
}