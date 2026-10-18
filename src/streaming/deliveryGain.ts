import {deliveryGainPolicy,realtimeIsabellaGain} from '../config/realtimeDelivery';
/** Called only after request/byte/range verification. Changes a renderer copy,
 * never the receipt-bound PCM. One linear gain per block preserves the waveform;
 * headroom protection reduces gain instead of hard clipping individual samples. */
export function deliveryGain(samples:Float32Array,enabled:boolean){
 let preGainPeak=0,squares=0;for(const value of samples){if(!Number.isFinite(value))throw new Error('Invalid playback sample.');preGainPeak=Math.max(preGainPeak,Math.abs(value));squares+=value*value;}
 const requestedGain=enabled?realtimeIsabellaGain:1;
 const gainApplied=enabled?Math.min(requestedGain,preGainPeak? .98/preGainPeak:requestedGain):1;
 let postGainPeak=0,postSquares=0,clippingEvents=0;for(let n=0;n<samples.length;n++){samples[n]*=gainApplied;postGainPeak=Math.max(postGainPeak,Math.abs(samples[n]));postSquares+=samples[n]*samples[n];if(Math.abs(samples[n])>=1)clippingEvents++;}
 return{gainPolicy:enabled?deliveryGainPolicy:'unity',samples:samples.length,preGainPeak,preGainRms:samples.length?Math.sqrt(squares/samples.length):0,requestedGain,effectiveGain:gainApplied,gainApplied,postGainPeak,postGainRms:samples.length?Math.sqrt(postSquares/samples.length):0,clippingEvents,peakProtectionEvents:enabled&&gainApplied<requestedGain?1:0};
}
