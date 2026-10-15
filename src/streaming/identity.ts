let identity=0;
/** Monotonic within a browser lifetime. Reload closes the peer before IDs can be reused. */
export function nextStreamIdentity(){identity=(identity+1)>>>0;if(!identity)identity=1;return identity;}
