export const formatTime = (stamp: number) => {
  const hours = Math.floor(stamp / 60 / 60);
  const minutes = Math.floor(stamp / 60) - hours * 60;
  const seconds = Math.floor(stamp % 60)
  const miliseconds = Math.floor((stamp * 1000) % 1000)

  return ("" + hours).padStart(2, "0")
    + ":"
    + ("" + minutes).padStart(2, "0")
    + ":"
    + ("" + seconds).padStart(2, "0")
    + ":"
    + ("" + miliseconds).padStart(3, "0");
};
