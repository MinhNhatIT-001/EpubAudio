// Device TTS has no seek API. This index estimates spoken time at word boundaries.
export function speechTimeline(text, rate=1) {
  const points=[];let time=0;
  for(const match of text.matchAll(/\S+/gu)) {
    points.push({offset:match.index,time});
    const punctuation=/[.!?…]$/.test(match[0])?.3:/[,;:]$/.test(match[0])?.15:0;
    time+=(.26+punctuation)/Math.max(.5,rate);
  }
  points.push({offset:text.length,time});return points;
}
export function timeAtOffset(points,offset) {
  let lo=0,hi=points.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(points[mid].offset<=offset)lo=mid;else hi=mid-1;}
  return points[lo]?.time || 0;
}
export function offsetAtTime(points,time) {
  let lo=0,hi=points.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(points[mid].time<=time)lo=mid;else hi=mid-1;}
  return points[lo]?.offset || 0;
}
