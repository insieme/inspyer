function zipWith(fn, as, bs) {
  const len = (as.length < bs.length) ? as.length : bs.length;
  var acc = [];
  for(var i=0; i < len; i++) {
    acc.push(fn(as[i], bs[i]));
  }
  return acc
}
