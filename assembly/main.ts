import { Tip, ReturnObject, ReturnTip, LabelFees, tips, receiverIdx, senderIdx, trackIdx, accountToId, idToAccount, trackOwner, trackLabel } from './model';
import { context, ContractPromiseBatch, PersistentVector, u128, storage } from "near-sdk-as";

const TAMA_PC = 3;
const TAMA_ADDR = "tip.tamago.testnet";
const MASTER_ACCOUNT = "backend.tamago.testnet"

export function setMinTip(minTip: string): bool{
  assert(context.sender == MASTER_ACCOUNT, "Only " + MASTER_ACCOUNT + " can set min tip");
  const tip = u128.from(minTip);
  storage.set<u128>("m", tip);
  return true;
}

function _getMinTip(): u128{
  const minTip = storage.get<u128>("counter");
  if (minTip === null){
    return u128.from(50000000000000000000000);
  }
  return minTip;
}

export function addTip(trackId: string): ReturnObject<ReturnTip | null> | null {

  if (context.attachedDeposit < _getMinTip()) {
    return {
      success: false,
      error_code: 'MIN_TIP',
      error_message: "Minimum tip is " + _getMinTip.toString(),
      data: null
    };
  }

  const tId = u128.from(trackId).as<u32>();  
  if (!trackOwner.contains(tId)) {
    return {
      success: false,
      error_code: 'NO_OWNER',
      error_message: "Track has no owner",
      data: null
    };
  }  

  const ownerId = trackOwner.getSome(tId);
  const senderId = _accountToId(context.sender);
  const amount = context.attachedDeposit;  
  const tip = new Tip(tId, ownerId, senderId, amount);

  const rec_amount = u128.mul(u128.div(amount, u128.fromU32(100)), u128.fromU32(TAMA_PC));
  const track_amount = u128.sub(amount, rec_amount);

  // Check if the track has a label and, if it's the case, calculate fees
  if(trackLabel.contains(tId)){
    const label = trackLabel.getSome(tId);
    const label_amount =  u128.mul(u128.div(track_amount, u128.fromU32(100)), u128.fromU32(label.p));
    const artist_amout = u128.sub(track_amount, label_amount);
    ContractPromiseBatch.create( _idToAccount(u32(label.a) ).toString() ).transfer(label_amount);
    ContractPromiseBatch.create( _idToAccount(u32(ownerId) ).toString() ).transfer(artist_amout);
  }
  else{
    ContractPromiseBatch.create( _idToAccount(u32(ownerId) ).toString() ).transfer(u128.sub(amount, rec_amount));
  }

  ContractPromiseBatch.create( TAMA_ADDR ).transfer(rec_amount);

  let tipInd = storage.getPrimitive<u32>('tc', 0);
  tipInd++;

  storage.set<u32>('tc', u32(tipInd));

  // add to tip map
  tips.set(tipInd,tip);

  // update indexes
  let recIdx = receiverIdx.get(u32(ownerId), new Array<u32>());
  if (recIdx == null) recIdx = new Array<u32>();
  recIdx.push(tipInd);
  receiverIdx.set(u32(ownerId),recIdx);

  let senIdx = senderIdx.get(u32(senderId), new Array<u32>());
  if (senIdx == null) senIdx = new Array<u32>();
  senIdx.push(tipInd);
  senderIdx.set(u32(senderId),senIdx);

  let traIdx = trackIdx.get(tId, new Array<u32>());
  if (traIdx == null) traIdx = new Array<u32>();
  traIdx.push(tipInd);
  trackIdx.set(tId,traIdx);

  return {
    success: true,
    error_code: '',
    error_message: '',
    data: new ReturnTip(tId, _idToAccount(u32(ownerId)), context.sender, amount, tip.c)
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
  idToAccount.set(u32(userCount), account);
  storage.set<u32>('uc', u32(userCount));
  return userCount;  
}

function _idToAccount(id: u32): string {
  const account = idToAccount.get(id);
  return account ? account : '';    
}

export function addTrackLabel(trackId: string, receiver: string, labelId: string, percentage: string): bool {
  const trackTip = addTrack(trackId, receiver);
  const tId = u128.from(trackId).as<u32>();
  const tP = u128.from(percentage).as<u32>();
  const lf = new LabelFees(tP, _accountToId(labelId));
  trackLabel.set(tId, lf);
  return true && trackTip;
}

export function addTrack(trackId: string, receiver: string): bool {
  assert(context.sender == MASTER_ACCOUNT, "Only " + MASTER_ACCOUNT + " can initialize a track");
  const tId = u128.from(trackId).as<u32>();
  trackOwner.set(tId, _accountToId(receiver));
  return true;
}

export function getAccountId(account: string): string | null {
  if (accountToId.contains(account)) {
    return accountToId.getSome(account).toString();
  }
  return null;
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
    for (let i = 0; i < trackTips.length; i++) {
      const t = tips.get(u32(trackTips[i]));
      if (t != null) retTips.push(new ReturnTip(t.t, _idToAccount(t.r), _idToAccount(t.s), t.a, t.c));
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
    for (let i = 0; i < trackTips.length; i++) {
      const t = tips.get(trackTips[i]);    
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

export function getTipsReceivedTotal(receiver: string): ReturnObject<Map<string,u128>> {

  if (accountToId.contains(receiver)) {

    const rId = _accountToId(receiver);  
    if (receiverIdx.contains(rId)) {
      const receiverTips = receiverIdx.getSome(rId);
      let total = new u128(0);
      for (let i = 0; i < receiverTips.length; i++) {
        const t = tips.get(receiverTips[i]);    
        if (t) {
          const amt = t.a;
          if (amt) {
            total = u128.add(total, amt);          
          }
        }
      }
    
      const rtn = new Map<string,u128>();
      rtn.set("count",  new u128(receiverTips.length));
      rtn.set("total",  total);
      return {
        success: true,
        error_code:  '',
        error_message: '',
        data: rtn
      };
    }
  }

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

export function getTipsReceived(receiver: string): ReturnTip[] | null{

  if (accountToId.contains(receiver)) {
    const rId = _accountToId(receiver);  
    if (receiverIdx.contains(rId)) {
      const receiverTips = receiverIdx.getSome(rId);
      let retTips = new Array<ReturnTip>();
      for (let i = 0; i < receiverTips.length; i++) {
        const t = tips.get(receiverTips[i]);
        if (t != null) retTips.push(new ReturnTip(t.t, _idToAccount(t.r), _idToAccount(t.s), t.a, t.c));
      }
      return retTips;
    }
    return new Array<ReturnTip>();  
  }
  return new Array<ReturnTip>();  
}

export function getTipsSentTotal(sender: string): ReturnObject<Map<string,u128>> {

  if (accountToId.contains(sender)) {

    const sId = _accountToId(sender);  
    if (senderIdx.contains(sId)) {
      const senderTips = senderIdx.getSome(sId);
      let total = new u128(0);
      for (let i = 0; i < senderTips.length; i++) {
        const t = tips.get(senderTips[i]);    
        if (t) {
          const amt = t.a;
          if (amt) {
            total = u128.add(total, amt);          
          }
        }
      }
    
      const rtn = new Map<string,u128>();
      rtn.set("count",  new u128(senderTips.length));
      rtn.set("total",  total);
      return {
        success: true,
        error_code:  '',
        error_message: '',
        data: rtn
      };
    }
  }

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

export function getTipsSent(sender: string): ReturnTip[] | null{

  if (accountToId.contains(sender)) {
    const sId = _accountToId(sender);  
    if (senderIdx.contains(sId)) {
      const senderTips = senderIdx.getSome(sId);
      let retTips = new Array<ReturnTip>();
      for (let i = 0; i < senderTips.length; i++) {
        const t = tips.get(senderTips[i]);
        if (t != null) retTips.push(new ReturnTip(t.t, _idToAccount(t.r), _idToAccount(t.s), t.a, t.c));
      }
      return retTips;
    }
    return new Array<ReturnTip>();  
  }
  return new Array<ReturnTip>();  
}