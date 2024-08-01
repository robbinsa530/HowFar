export function getErrorMsgFromPositionError(err) {
  let errMsg;
  switch (err.code) {
    case 1: // PERMISSION_DENIED
      console.error("getCurrentPosition err: PERMISSION_DENIED");
      errMsg = "Location permissions denied. Please change this in site settings in your browser.";
      break;
    case 2: // POSITION_UNAVAILABLE
      console.error("getCurrentPosition err: POSITION_UNAVAILABLE");
      errMsg = "Failed to locate.";
      break;
    case 3: // TIMEOUT
      console.error("getCurrentPosition err: TIMEOUT");
      errMsg = "Timed out trying to locate.";
      break;
  }
  return errMsg;
}