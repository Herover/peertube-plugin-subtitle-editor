export const formatTime = (stamp: number) => {
  const minutes = Math.floor(stamp/60);
  const seconds = (Math.floor((stamp%60)*100))/100;

  return ("" + minutes).padStart(2, "0") + ":" + ("" + seconds).padStart(2, "0");
};
