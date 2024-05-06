async function checkUserHasToken() {
  return fetch("/checkHasToken", { method: 'GET', credentials: 'include' });
}


module.exports = {
  checkUserHasToken: checkUserHasToken
}