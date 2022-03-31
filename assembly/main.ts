import { Tip, TrackTips, ReturnObject, tips, receivers } from './model';
import { context, ContractPromiseBatch, PersistentVector, u128 } from "near-sdk-as";

// The maximum number of latest messages the contract returns.
const TAMA_PC = 3;
const TAMA_ADDR = "tamago.testnet";
const MIN_TIP = u128.from('10000000000000000000000');
const MASTER_ACCOUNT = "backend.tamago.testnet"

export function addTip(trackId: string): ReturnObject<bool> | null {
  assert(context.attachedDeposit >= MIN_TIP, "Minimum tip is " + MIN_TIP.toString());
  const amount = context.attachedDeposit;
  const tip = new Tip(amount);
  const rec_amount = u128.mul(u128.div(amount, u128.fromU32(100)), u128.fromU32(TAMA_PC));
  ContractPromiseBatch.create(_getReceiver(trackId)).transfer(u128.sub(amount, rec_amount));
  ContractPromiseBatch.create(TAMA_ADDR).transfer(rec_amount);
  _addTipToTrack(trackId, tip);
  _addTipToReceiver(_getReceiver(trackId), tip);
  return {
    success: true,
    error_code: '',
    error_message: '',
    data: true
  };
}

function _getReceiver(trackId: string): string {
  let track = tips.get(trackId);
  assert(track != null, "Impossible to send tip as track hasn't been initialized yet");
  if (track == null){
    return "";
  }
  assert(track.receiver != null && track.receiver != "", "Impossible to send tip as receiver isn't set");
  return track.receiver
}

function _addTipToTrack(trackId: string, tip: Tip): TrackTips | null{
  let trackTips = tips.get(trackId);
  assert(trackTips != null, "Track is undefined");
  if (trackTips == null){
    return null;
  }
  trackTips.total = u128.add(trackTips.total, tip.amount);
  trackTips.tips.push(tip);
  tips.set(trackId, trackTips);
  return trackTips;
}

function _addTipToReceiver(receiver: string, tip: Tip): void{
  let receiverTips = receivers.get(receiver);
  if (receiverTips == null){
    receiverTips = new PersistentVector<Tip>(receiver);
  }
  receiverTips.push(tip);
  receivers.set(receiver, receiverTips);
  return;
}

export function addTrack(trackId: string, receiver: string): bool {
  assert(context.sender == MASTER_ACCOUNT, "Only " + MASTER_ACCOUNT + " can initialize a track");
  //assert(tips.get(trackId) == null, "Track has already been initialized");
  if (tips.get(trackId) == null) {
    const trackTip = new TrackTips(receiver, trackId);
    tips.set(trackId, trackTip);
    return true;
  } 
  return false;
}

export function getTipsTrack(trackId: string, elements: number=10, offset: number=0): Tip[] | null{
  const trackTips = tips.get(trackId);
  //assert(trackTips != null, "Track is undefined");
  if (trackTips == null){
    return null;
  }
  let retTips = new Array<Tip>();
  for (let i = offset * elements; i < (offset * elements + elements) && i < trackTips.tips.length; i++){
    retTips.push(trackTips.tips[i as i32]);
  }
  return retTips;
}

export function getTipsTrackTotal(trackId: string): u128{
  const trackTips = tips.get(trackId);
  //assert(trackTips != null, "Track is undefined");
  if (trackTips == null){
    return new u128(0);
  }
  return trackTips.total;
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

export function getTipsReceivedTotal(receiverId: string): ReturnObject<u128> {
  const receiverTips = receivers.get(receiverId);
  //assert(receiverTips != null, "Receiver is undefined");
  if (receiverTips == null){
    return {
      success: false,
      error_code:  'RECEIVER_UNDEFINED',
      error_message: "Receiver is undefined",
      data: new u128(0);
    };
  }
  let total = new u128(0);
  for (let i = 0; i <= receiverTips.length; i++){
    total = u128.add(total, receiverTips[i].amount);
  }
  return {
    success: true,
    error_code: '',
    error_message: '',
    data: total
  };
}