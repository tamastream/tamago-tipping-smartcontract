import { context, u128, PersistentVector, PersistentMap } from "near-sdk-as";

const initDate = 1640995200000000000;
/** 
 * Exporting a new class Comment so it can be used outside of this file.
 */
@nearBindgen
export class Tip {
  sender: string;
  constructor(public amount: u128) {
    this.amount = amount;
    this.sender = context.sender;
  }
}

/** 
 * Exporting a new class Comment so it can be used outside of this file.
 */
 @nearBindgen
 export class TrackTips {
  tips: PersistentVector<Tip>;
  total: u128;
  created: u32;
  constructor(public receiver: string, trackId: string) {
    this.total =  u128.from('0');
    this.tips = new PersistentVector<Tip>(trackId);
    this.receiver = receiver;
    this.created = u32((context.blockTimestamp - initDate) / 10 ** 9);
  }
 }
 
 

/**
 * collections.vector is a persistent collection. Any changes to it will
 * be automatically saved in the storage.
 * The parameter to the constructor needs to be unique across a single contract.
 * It will be used as a prefix to all keys required to store data in the storage.
 */
export const tips = new PersistentMap<string, TrackTips>("");
export const receivers = new PersistentMap<string, PersistentVector<Tip>>("r");