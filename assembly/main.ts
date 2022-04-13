import { Tip, ReturnObject, ReturnTip, tips, receiverIdx, senderIdx, trackIdx, accountToId, idToAccount, trackOwner } from './model';
import { context, ContractPromiseBatch, PersistentVector, u128, storage } from "near-sdk-as";

// The maximum number of latest messages the contract returns.
const TAMA_PC = 3;
const TAMA_ADDR = "tamago.testnet";
const MIN_TIP = u128.from('200000000000000000000000');
const MASTER_ACCOUNT = "backend.tamago.testnet"

export function addTip(trackId: string): ReturnObject<u32> | null {

  if (context.attachedDeposit < MIN_TIP) {
    return {
      success: false,
      error_code: 'MIN_TIP',
      error_message: "Minimum tip is " + MIN_TIP.toString(),
      data: 0
    };
  }

  const tId = u128.from(trackId).as<u32>();  
  if (!trackOwner.contains(tId)) {
    return {
      success: false,
      error_code: 'NO_OWNER',
      error_message: "Track has no owner",
      data: 0
    };
  }  

  const ownerId = trackOwner.getSome(tId);
  const receiverId = _accountToId(context.sender);
  const amount = context.attachedDeposit;  
  const tip = new Tip(tId, ownerId, receiverId, amount);

  const rec_amount = u128.mul(u128.div(amount, u128.fromU32(100)), u128.fromU32(TAMA_PC));

  ContractPromiseBatch.create( _idToAccount(u32(ownerId)).toString() ).transfer(u128.sub(amount, rec_amount));
  ContractPromiseBatch.create( TAMA_ADDR ).transfer(rec_amount);

  let tipInd = storage.getPrimitive<u32>('tc', 0);
  tipInd++;

  // add to tip map
  tips.set(tipInd,tip);

  // update indexes
  let recIdx = receiverIdx.get(u32(ownerId), new Array<u32>());
  if (recIdx == null) recIdx = new Array<u32>();
  recIdx.push(tipInd);
  receiverIdx.set(u32(ownerId),recIdx);

  let senIdx = senderIdx.get(u32(receiverId), new Array<u32>());
  if (senIdx == null) senIdx = new Array<u32>();
  senIdx.push(tipInd);
  senderIdx.set(u32(receiverId),senIdx);

  let traIdx = trackIdx.get(tId, new Array<u32>());
  if (traIdx == null) traIdx = new Array<u32>();
  traIdx.push(tipInd);
  trackIdx.set(tId,traIdx);


  return {
    success: true,
    error_code: '',
    error_message: '',
    data: tipInd
  };

}

function _accountToId(account: string): u32 {
  assert(account != '', "Account is blank");

  if (accountToId.contains(account)) {
    return accountToId.getSome(account);
  }

  let userCount = storage.getPrimitive<u32>('uc', 0);
  userCount++;
  accountToId.set(account, u32(userCount));
  storage.set<u32>('uc', u32(userCount));
  return userCount;
  
}

function _idToAccount(id: u32): string {
  const account = idToAccount.get(id);
  return account ? account : '';  
}

export function addTrack(trackId: string, receiver: string): bool {
  assert(context.sender == MASTER_ACCOUNT, "Only " + MASTER_ACCOUNT + " can initialize a track");
  const tId = u128.from(trackId).as<u32>();
  trackOwner.set(tId, _accountToId(receiver));
  return true;
}

export function getTrackOwner(trackId: string): string | null {  
  const tId = u128.from(trackId).as<u32>();
  if (trackOwner.contains(tId)) {
    return _idToAccount(trackOwner.getSome(tId));
  }
  return null;
}

export function getTipsTrack(trackId: string): ReturnTip[] | null{
  const tId = u128.from(trackId).as<u32>();
  const trackTips = trackIdx.get(tId);
  if (trackTips != null){
    let retTips = new Array<ReturnTip>();
    for (let i = 1; i < trackTips.length; i++) {
      const t = tips.get(u32(i));
      if (t != null) retTips[i as u32] = new ReturnTip(t.t, _idToAccount(t.r), _idToAccount(t.s), t.a, t.c);
    }
    return retTips;
  }
  
  return new Array<ReturnTip>();  
}

export function getTipsTrackTotal(trackId: string): ReturnObject<Map<string,u128>>{
  const tId = u128.from(trackId).as<u32>();

  if (trackIdx.contains(tId)) {
    const trackTips = trackIdx.getSome(tId);  

    let total = new u128(0);
    for (let i = 1; i < trackTips.length; i++) {
      const t = tips.get(i as u32);    
      if (t) {
        const amt = t.a;
        if (amt) {
          total = u128.add(total, amt);          
        }
      }
    }
  
    const rtn = new Map<string,u128>();
    rtn.set("count",  new u128(trackTips.length));
    rtn.set("total",  total);
    return {
      success: true,
      error_code:  '',
      error_message: '',
      data: rtn
    };
  }

  const rtn = new Map<string,u128>();
  rtn.set("count",  new u128(0));
  rtn.set("total",  new u128(0));
  return {
      success: true,
      error_code:  '',
      error_message: '',
      data: rtn
  }
  
}

/*
export function getTipsSent(): Tip[] | null {
  let retTips = new Array<Tip>();

}

export function getTipsReceived(receiverId: string, elements: number=10, offset: number=0): Tip[] | null {
  const receiverTips = receivers.get(receiverId);
  //assert(receiverTips != null, "Receiver is undefined");
  if (receiverTips == null){
    return null;
  }
  let retTips = new Array<Tip>();
  for (let i = offset * elements; i < (offset * elements + elements) && i < receiverTips.length; i++){
    retTips.push(receiverTips[i as i32]);
  }
  return retTips;
}

export function getTipsReceivedTotal(receiverId: string): ReturnObject<Map<string,u128>> {
  const receiverTips = receivers.get(receiverId);
  if (receiverTips == null){
    const rtn = new Map<string,u128>();
    rtn.set("count",  new u128(0));
    rtn.set("total",  new u128(0));
    return {
      success: true,
      error_code:  '',
      error_message: '',
      data: rtn
    };
  }

  let total = new u128(0);
  for (let i = 0; i <= receiverTips.length; i++){
    total = u128.add(total, receiverTips[i].amount);
  }
  const rtn = new Map<string,u128>();
  rtn.set("count",  new u128(receiverTips.length));
  rtn.set("total",  total);
  return {
    success: true,
    error_code: '',
    error_message: '',
    data: rtn
  };
}
*/
