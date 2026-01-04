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
  // Simulate backend latency
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Mock believable output
  return {
    emotion: getRandomItem(NAVARASA),
    intensity: getRandomItem(INTENSITY),
  };
};
