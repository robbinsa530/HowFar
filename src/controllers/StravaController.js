async function checkUserHasToken() {
  return fetch("http://127.0.0.1:3001/checkHasToken", { method: 'GET', credentials: 'include' });
}


module.exports = {
  checkUserHasToken: checkUserHasToken
}