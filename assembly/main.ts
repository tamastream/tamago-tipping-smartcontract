import { Tip, TrackTips, tips } from './model';
import { context, ContractPromiseBatch } from "near-sdk-as";

// The maximum number of latest messages the contract returns.
const TAMA_PC = 0.03;
const TAMA_ADDR = "tamago.testnet";

export function addTip(trackId: string): void {
  const amount = context.attachedDeposit;
  const tip = new Tip(amount);
  ContractPromiseBatch.create(_getReceiver(trackId)).transfer(amount * (1 - TAMA_PC));
  ContractPromiseBatch.create(TAMA_ADDR).transfer(amount * (TAMA_PC));
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
  trackTips.total += tip.amount;
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