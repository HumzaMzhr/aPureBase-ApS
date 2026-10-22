/** Approved Stage 1.9.3 live delivery profile. Cached assets are unchanged. */
export const realtimeIsabellaSpeed=.95;
// Session 09b238c8: sample-weighted input RMS .02248858, peak .23245239.
// Calibrate to .08 RMS (about -22 dBFS), giving .82692 peak on that run.
// Keep a fixed calibration so quiet/silent blocks are not normalized upwards.
// The renderer still limits every block to .98 peak, including hotter future PCM.
export const realtimeIsabellaGain=.08/.02248858340253303;
export const deliveryGainPolicy='isabella-calibrated-headroom-v2';
