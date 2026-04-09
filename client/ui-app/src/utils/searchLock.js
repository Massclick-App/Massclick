<<<<<<< Updated upstream

let lastSearchKey = null;
let lastTime = 0;

export const shouldSendSearch = (key) => {
  const now = Date.now();

  if (lastSearchKey === key && now - lastTime < 2000) {
    return false;
  }

  lastSearchKey = key;
  lastTime = now;
  return true;
=======

let lastSearchKey = null;
let lastTime = 0;

export const shouldSendSearch = (key) => {
  const now = Date.now();

  if (lastSearchKey === key && now - lastTime < 2000) {
    return false;
  }

  lastSearchKey = key;
  lastTime = now;
  return true;
>>>>>>> Stashed changes
};