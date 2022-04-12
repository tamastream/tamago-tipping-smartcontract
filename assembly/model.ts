import { context, u128, PersistentVector, PersistentMap } from "near-sdk-as";

const initDate = 1640995200000000000;

/** 
 * Exporting a new class Comment so it can be used outside of this file.
 */
@nearBindgen
export class Tip {  // class written to chain as JSON, hence the short variable names
  t: u32; // trackId
  a: u128; // amount
  r: u32; // receiver id
  s: u32; // sender id
  c: u32; // date created
  constructor(public trackId:u32, receiverId: u32, senderId: u32, amount: u128) {
    this.t = trackId;
    this.a = amount;
    this.r = receiverId;
    this.s = senderId;
    this.c = u32((context.blockTimestamp - initDate) / 10 ** 9);
  }
}

@nearBindgen
export class ReturnTip {  // class written to chain as JSON, hence the short variable names
  trackId: u32; // trackId
  amount: u128; // amount
  receiver: string; // receiver id
  sender: string; // sender id
  createdAt: u32; // date created
  constructor(public track:u32, receiver: string, sender: string, amount: u128, created: u32) {
    this.trackId = track;
    this.amount = amount;
    this.receiver = receiver;
    this.sender = sender;
    this.createdAt = created;
  }
}


/** 
 * Exporting a new class Comment so it can be used outside of this file.
 */
/*
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
 */
 
 @nearBindgen
 export class ReturnObject<T>{
  success: bool; 
  error_code: string;
  error_message: string;
  data: T;
}

export const accountToId = new PersistentMap<string, u32>("ai");
export const idToAccount = new PersistentMap<u32, string>("ia");
export const tips        = new PersistentMap<u32, Tip>("t"); // 1 {1, 2, 11} // 2 {2, 2, 11}
export const receiverIdx = new PersistentMap<u32, Array<u32>>("rx"); // reciever1 [1,2]
export const senderIdx   = new PersistentMap<u32, Array<u32>>("sx"); // sender1 [1] // sender2 [2]
export const trackIdx    = new PersistentMap<u32, Array<u32>>("tx"); // 12 (trackid)  [1,2]
export const trackOwner  = new PersistentMap<u32, u32>("to"); // 1 2 - user 1 owns track 2

/**
 * collections.vector is a persistent collection. Any changes to it will
 * be automatically saved in the storage.
 * The parameter to the constructor needs to be unique across a single contract.
 * It will be used as a prefix to all keys required to store data in the storage.
 */
//export const tips = new PersistentMap<string, TrackTips>("");
//export const receivers = new PersistentMap<string, PersistentVector<Tip>>("r");