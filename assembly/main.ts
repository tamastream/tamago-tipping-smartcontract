import { Tip, TrackTips, tips } from './model';
import { context, ContractPromiseBatch, u128 } from "near-sdk-as";

// The maximum number of latest messages the contract returns.
const TAMA_PC = 3;
const TAMA_ADDR = "tamago.testnet";
const MIN_TIP = u128.from('10000000000000000000000');

export function addTip(trackId: string): void {
  assert(context.attachedDeposit >= MIN_TIP, "Minimum tip is " + MIN_TIP.toString());
  const amount = context.attachedDeposit;
  const tip = new Tip(amount);
  const rec_amount = u128.mul(u128.div(amount, u128.fromU32(100)), u128.fromU32(TAMA_PC));
  ContractPromiseBatch.create(_getReceiver(trackId)).transfer(u128.sub(amount, rec_amount));
  ContractPromiseBatch.create(TAMA_ADDR).transfer(rec_amount);
  _addTipToTrack(trackId, tip);
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

export function addTrack(trackId: string, receiver: string): void{
  assert(tips.get(trackId) == null, "Track has already been initialized");
  const trackTip = new TrackTips(receiver, trackId);
  tips.set(trackId, trackTip);
}

export function getTips(trackId: string): TrackTips | null{
  const trackTips = tips.get(trackId);
  assert(trackTips != null, "Track is undefined");
  return trackTips;
}