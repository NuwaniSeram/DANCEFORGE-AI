const NAVARASA = [
  "Shringara",
  "Hasya",
  "Karuna",
  "Raudra",
  "Veera",
  "Bhayanaka",
  "Bibhatsa",
  "Adbutha",
  "Shantha",
];

const INTENSITY = ["low", "medium", "high"];

const getRandomItem = (arr) =>
  arr[Math.floor(Math.random() * arr.length)];

export const predictEmotion = async (segment) => {
  
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // e output
  return {
    emotion: getRandomItem(NAVARASA),
    intensity: getRandomItem(INTENSITY),
  };
};
