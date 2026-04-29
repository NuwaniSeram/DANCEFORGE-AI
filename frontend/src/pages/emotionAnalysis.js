import React, { useState, useEffect } from "react";
import { analyzeSongVerses } from "../services/emotionService";

const emotionNameMap = {
  Shringara: "Romantic",
  Hasya: "Joyful",
  Karuna: "Sad",
  Roudhra: "Angry",
  Veera: "Heroic",
  Bhayanakam: "Fearful",
  Bhibatsa: "Disgust",
  Adbhutha: "Wonder",
  Shantha: "Peaceful",
  Unknown: "Unknown",
  ModelUnavailable: "Model Unavailable"
};

const emotionThemes = {
  happy: {
    gradient: "linear-gradient(135deg, #FFD700 0%, #FFB347 100%)",
    light: "rgba(255, 215, 0, 0.1)",
    border: "rgba(255, 215, 0, 0.3)"
  },
  sad: {
    gradient: "linear-gradient(135deg, #4A90E2 0%, #2C6FB7 100%)",
    light: "rgba(74, 144, 226, 0.1)",
    border: "rgba(74, 144, 226, 0.3)"
  },
  romantic: {
    gradient: "linear-gradient(135deg, #FF6B95 0%, #FF4D7E 100%)",
    light: "rgba(255, 107, 149, 0.1)",
    border: "rgba(255, 107, 149, 0.3)"
  },
  angry: {
    gradient: "linear-gradient(135deg, #FF4757 0%, #FF1744 100%)",
    light: "rgba(255, 71, 87, 0.1)",
    border: "rgba(255, 71, 87, 0.3)"
  },
  peaceful: {
    gradient: "linear-gradient(135deg, #2ED573 0%, #1DB954 100%)",
    light: "rgba(46, 213, 115, 0.1)",
    border: "rgba(46, 213, 115, 0.3)"
  },
  energetic: {
    gradient: "linear-gradient(135deg, #FF7F50 0%, #FF5722 100%)",
    light: "rgba(255, 127, 80, 0.1)",
    border: "rgba(255, 127, 80, 0.3)"
  },
  nostalgic: {
    gradient: "linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)",
    light: "rgba(155, 89, 182, 0.1)",
    border: "rgba(155, 89, 182, 0.3)"
  },
  default: {
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    light: "rgba(102, 126, 234, 0.1)",
    border: "rgba(102, 126, 234, 0.3)"
  }
};

const sampleLyrics = `මගේ හිත දුකෙන් පිරීලා
ඔබ නැති ලෝකය නිහඬ වෙලා

සඳ එළිය මැකී ගියා
මතකය පමණක් ඉතිරි වෙලා`;

function EmotionAnalysis() {
  const [lyrics, setLyrics] = useState("");
  const [language, setLanguage] = useState("Unknown");
  const [prepared, setPrepared] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSegment, setActiveSegment] = useState(null);

  useEffect(() => {
    const styleId = "emotion-analysis-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const countSinhalaChars = (text) => (text.match(/[\u0D80-\u0DFF]/g) || []).length;
  const countEnglishChars = (text) => (text.match(/[A-Za-z]/g) || []).length;

  const detectLanguage = (text) => {
    const si = countSinhalaChars(text);
    const en = countEnglishChars(text);

    if (si === 0 && en === 0) return "Unknown";
    if (si > 0 && en === 0) return "Sinhala";
    if (en > 0 && si === 0) return "English";

    const total = si + en;
    const siRatio = si / total;
    const enRatio = en / total;

    if (siRatio > 0.75) return "Mostly Sinhala";
    if (enRatio > 0.75) return "Mostly English";
    return "Mixed";
  };

  const getLanguageMessage = (lang) => {
    if (lang === "Sinhala") return "Sinhala lyrics detected.";
    if (lang === "English") return "English lyrics detected. This will be processed using Mistral AI.";
    if (lang === "Mixed") return "Mixed language detected.";
    if (lang === "Mostly Sinhala") return "Mostly Sinhala detected. Non-Sinhala parts will be handled carefully.";
    if (lang === "Mostly English") return "Mostly English detected. This will be processed using Mistral AI.";
    return "No clear lyrics detected.";
  };

  const removeEmojisAndNoise = (text) => {
    return text
      .replace(/https?:\/\/\S+/g, "")
      .replace(/www\.\S+/g, "")
      .replace(/[^\u0D80-\u0DFFA-Za-z0-9\s.,!?;:'"()\-—–\n]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const splitSmartVerses = (text) => {
    const s = (text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    if (!s) return [];

    if (/\n\s*\n/.test(s)) {
      return s
        .split(/\n\s*\n+/)
        .map((block) =>
          block
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .join("\n")
        )
        .filter(Boolean);
    }

    const lines = s
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const verses = [];
    for (let i = 0; i < lines.length; i += 4) {
      verses.push(lines.slice(i, i + 4).join("\n"));
    }

    return verses;
  };

  const removeDuplicates = (verses) => {
    const seen = new Set();
    const unique = [];
    let duplicateCount = 0;

    verses.forEach((v) => {
      const key = v.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(key)) {
        duplicateCount++;
      } else {
        seen.add(key);
        unique.push(v);
      }
    });

    return { unique, duplicateCount };
  };

  const getInputQuality = (verses, lang) => {
    if (!verses.length) return "Poor";
    if (lang === "Unknown") return "Poor";
    if (verses.length < 2) return "Fair";
    if (verses.length >= 2 && verses.length <= 40) return "Good";
    return "Review Needed";
  };

  const segmentLyrics = (text) => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  const getDisplayEmotion = (emotion) => {
    return emotionNameMap[emotion] || emotion;
  };

  const getEmotionTheme = (emotion) => {
    const displayEmotion = getDisplayEmotion(emotion).toLowerCase();

    if (displayEmotion.includes("joy")) return emotionThemes.happy;
    if (displayEmotion.includes("sad")) return emotionThemes.sad;
    if (displayEmotion.includes("romantic")) return emotionThemes.romantic;
    if (displayEmotion.includes("angry")) return emotionThemes.angry;
    if (displayEmotion.includes("peace")) return emotionThemes.peaceful;
    if (displayEmotion.includes("heroic")) return emotionThemes.energetic;
    if (displayEmotion.includes("fear")) return emotionThemes.nostalgic;
    if (displayEmotion.includes("disgust")) return emotionThemes.angry;
    if (displayEmotion.includes("wonder")) return emotionThemes.default;

    return emotionThemes.default;
  };

  const handlePrepareLyrics = () => {
    if (!lyrics.trim()) {
      alert("Please enter lyrics first.");
      return;
    }

    const originalLanguage = detectLanguage(lyrics);
    const cleanedText = removeEmojisAndNoise(lyrics);
    const cleanedLanguage = detectLanguage(cleanedText);

    const rawVerses = splitSmartVerses(cleanedText);
    const { unique, duplicateCount } = removeDuplicates(rawVerses);

    const originalLineCount = lyrics.split("\n").filter((l) => l.trim()).length;
    const removedNoise = lyrics.length - cleanedText.length;

    const preparedData = {
      originalLanguage,
      cleanedLanguage,
      originalLineCount,
      verseCount: unique.length,
      duplicateCount,
      removedNoise: removedNoise > 0 ? removedNoise : 0,
      quality: getInputQuality(unique, cleanedLanguage),
      cleanedText: unique.join("\n\n"),
      verses: unique,
      warning: getLanguageMessage(cleanedLanguage)
    };

    setPrepared(preparedData);
    setResults([]);
  };

  const handleAnalyzeSong = async () => {
    if (!prepared) {
      alert("Please click Prepare Lyrics first.");
      return;
    }

    const textToAnalyze = prepared.cleanedText;

    if (!textToAnalyze.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      const verseResults = await analyzeSongVerses(textToAnalyze);

      const analysisResults = verseResults.map((r) => ({
        segment: r.verse,
        emotion: r.emotion,
        percentage: Number(r.percentage || 0),
        top3: r.top3 || [],
        language: r.language || "Unknown"
      }));

      setResults(analysisResults);
    } catch (err) {
      console.error(err);
      alert("Emotion analysis failed. Check backend is running and accessible.");
    } finally {
      setLoading(false);
    }
  };

  const canAnalyze =
    prepared &&
    prepared.verseCount > 0 &&
    prepared.cleanedLanguage !== "Unknown";

  const styles = {
    mainContent: {
      flex: 1,
      padding: "3rem",
      maxWidth: "1600px",
      width: "100%",
      margin: "0 auto"
    },
    fusionDashboard: {
      background: "rgba(20, 20, 30, 0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "24px",
      padding: "3rem",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
    },
    dashboardHeader: {
      marginBottom: "3rem",
      textAlign: "center"
    },
    dashboardTitle: {
      fontSize: "3rem",
      fontWeight: 800,
      background: "linear-gradient(135deg, #ff6b9d 0%, #c44569 50%, #a8d8ea 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      marginBottom: "1rem",
      letterSpacing: "-1px"
    },
    dashboardSubtitle: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "1.2rem",
      maxWidth: "760px",
      margin: "0 auto",
      lineHeight: "1.6"
    },
    fusionContent: {
      display: "flex",
      flexDirection: "column",
      gap: "2rem"
    },
    inputSection: {
      marginBottom: "2rem"
    },
    inputContainer: {
      background: "rgba(20, 20, 30, 0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "24px",
      padding: "2.5rem",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
    },
    sectionTitle: {
      color: "#ffffff",
      fontSize: "1.8rem",
      fontWeight: 700,
      marginBottom: "1rem"
    },
    sectionDescription: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "1rem",
      marginBottom: "1.5rem",
      lineHeight: "1.5"
    },
    textareaWrapper: {
      marginBottom: "1.5rem"
    },
    textareaLabel: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "0.75rem"
    },
    labelText: {
      color: "#a8d8ea",
      fontWeight: 600,
      fontSize: "0.95rem",
      letterSpacing: "0.5px"
    },
    lineCount: {
      color: "rgba(168, 216, 234, 0.7)",
      fontSize: "0.85rem",
      background: "rgba(168, 216, 234, 0.1)",
      padding: "0.25rem 0.75rem",
      borderRadius: "12px"
    },
    textarea: {
      width: "100%",
      padding: "1.2rem 1.5rem",
      background: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "16px",
      fontSize: "1rem",
      color: "#ffffff",
      fontFamily: "inherit",
      resize: "vertical",
      minHeight: "180px",
      transition: "all 0.3s ease"
    },
    liveInfo: {
      marginTop: "0.8rem",
      padding: "0.9rem 1rem",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "14px",
      color: "rgba(255,255,255,0.78)"
    },
    languageBadge: {
      display: "inline-block",
      marginLeft: "0.5rem",
      padding: "0.25rem 0.7rem",
      background: "rgba(255,107,157,0.18)",
      border: "1px solid rgba(255,107,157,0.35)",
      color: "#fff",
      borderRadius: "999px",
      fontWeight: 700
    },
    buttonRow: {
      display: "flex",
      gap: "1rem",
      flexWrap: "wrap",
      marginTop: "1.2rem"
    },
    primaryButton: {
      flex: 1,
      minWidth: "220px",
      padding: "1.1rem 2rem",
      background: "linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)",
      color: "white",
      border: "none",
      borderRadius: "16px",
      fontSize: "1rem",
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 15px rgba(255, 107, 157, 0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem"
    },
    secondaryButton: {
      flex: 1,
      minWidth: "180px",
      padding: "1.1rem 2rem",
      background: "rgba(255,255,255,0.08)",
      color: "#ffffff",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "16px",
      fontSize: "1rem",
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.3s ease"
    },
    disabledBtn: {
      opacity: 0.5,
      cursor: "not-allowed"
    },
    loadingSpinner: {
      width: "20px",
      height: "20px",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTopColor: "white",
      animation: "spin 1s linear infinite"
    },
    preparedSection: {
      background: "rgba(20, 20, 30, 0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "24px",
      padding: "2.5rem",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
    },
    reportGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
      gap: "1rem",
      marginBottom: "1.5rem"
    },
    reportBox: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      padding: "1rem"
    },
    reportLabel: {
      color: "rgba(255,255,255,0.55)",
      fontSize: "0.8rem",
      textTransform: "uppercase"
    },
    reportValue: {
      color: "#fff",
      fontSize: "1.3rem",
      fontWeight: 700,
      marginTop: "0.4rem"
    },
    warning: {
      background: "rgba(255,165,0,0.12)",
      border: "1px solid rgba(255,165,0,0.35)",
      color: "#ffcc80",
      padding: "1rem",
      borderRadius: "14px",
      marginBottom: "1rem"
    },
    versePreview: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      padding: "1rem",
      maxHeight: "300px",
      overflowY: "auto"
    },
    verseItem: {
      padding: "0.9rem",
      marginBottom: "0.8rem",
      background: "rgba(255,255,255,0.05)",
      borderRadius: "12px",
      color: "rgba(255,255,255,0.85)",
      lineHeight: 1.6,
      whiteSpace: "pre-line"
    },
    resultsSection: {
      background: "rgba(20, 20, 30, 0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "24px",
      padding: "2.5rem",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
    },
    resultsHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "2rem",
      flexWrap: "wrap",
      gap: "1rem"
    },
    statsContainer: {
      display: "flex",
      gap: "2rem",
      flexWrap: "wrap"
    },
    statItem: {
      textAlign: "center"
    },
    statNumber: {
      fontSize: "2rem",
      fontWeight: 700,
      background: "linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      marginBottom: "0.25rem"
    },
    statLabel: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "0.9rem",
      textTransform: "uppercase",
      letterSpacing: "1px"
    },
    segmentsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
      gap: "1.5rem",
      marginBottom: "2rem"
    },
    segmentCard: {
      background: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "20px",
      padding: "1.5rem",
      transition: "all 0.3s ease",
      cursor: "pointer"
    },
    cardHover: {
      transform: "translateY(-4px)",
      boxShadow: "0 12px 40px rgba(255, 107, 157, 0.3)",
      borderColor: "rgba(255, 107, 157, 0.4)"
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1rem"
    },
    segmentNumber: {
      fontSize: "1.5rem",
      fontWeight: 700,
      color: "#ff6b9d",
      background: "rgba(255, 107, 157, 0.1)",
      width: "36px",
      height: "36px",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    emotionBadge: (theme) => ({
      padding: "0.5rem 1rem",
      background: theme.light,
      border: `1px solid ${theme.border}`,
      borderRadius: "20px",
      fontSize: "0.85rem",
      fontWeight: 600,
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    }),
    languageSmallBadge: {
      marginLeft: "0.5rem",
      padding: "0.25rem 0.55rem",
      background: "rgba(168,216,234,0.12)",
      border: "1px solid rgba(168,216,234,0.25)",
      borderRadius: "999px",
      color: "#a8d8ea",
      fontSize: "0.75rem",
      fontWeight: 700
    },
    segmentText: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: "0.95rem",
      lineHeight: "1.6",
      marginBottom: "1rem",
      fontStyle: "italic",
      whiteSpace: "pre-line"
    },
    visualizationSection: {
      background: "rgba(20, 20, 30, 0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "24px",
      padding: "2.5rem",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      marginTop: "2rem"
    },
    visualizationHeader: {
      marginBottom: "2rem"
    },
    visualizationTitle: {
      color: "#ffffff",
      fontSize: "1.8rem",
      fontWeight: 700,
      marginBottom: "0.5rem"
    },
    visualizationDescription: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "1rem"
    },
    chartContainer: {
      position: "relative",
      minHeight: "420px",
      padding: "2rem 0 3rem 0"
    },
    chartLine: {
      position: "absolute",
      bottom: "60px",
      left: 0,
      right: 0,
      height: "2px",
      background: "rgba(255, 255, 255, 0.1)"
    },
    barsWrapper: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "stretch",
      gap: "1.25rem",
      width: "100%",
      padding: "0.5rem 0"
    },
    barContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flex: 1,
      maxWidth: "60px"
    },
    barLabel: {
      marginTop: "0.75rem",
      textAlign: "center"
    },
    barSegment: {
      color: "#ffffff",
      fontSize: "0.9rem",
      fontWeight: 600
    },
    barEmotion: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "0.75rem",
      marginTop: "0.25rem"
    },
    legendContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: "1rem",
      justifyContent: "center",
      marginTop: "2rem",
      padding: "1.5rem",
      background: "rgba(255, 255, 255, 0.03)",
      borderRadius: "16px",
      border: "1px solid rgba(255, 255, 255, 0.05)"
    },
    legendItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem 1rem",
      background: "rgba(255, 255, 255, 0.05)",
      borderRadius: "20px",
      border: "1px solid rgba(255, 255, 255, 0.1)"
    },
    legendColor: (gradient) => ({
      width: "16px",
      height: "16px",
      borderRadius: "4px",
      background: gradient
    }),
    legendText: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: "0.85rem"
    },
    insightsSection: {
      marginTop: "2rem",
      padding: "2rem",
      background: "rgba(255, 165, 0, 0.1)",
      backdropFilter: "blur(10px)",
      borderRadius: "20px",
      border: "1px solid rgba(255, 165, 0, 0.3)"
    },
    insightsTitle: {
      color: "#ffa500",
      fontSize: "1.5rem",
      fontWeight: 700,
      marginBottom: "1.5rem"
    },
    insightsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "1.5rem"
    },
    insightCard: {
      padding: "1.5rem",
      background: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(10px)",
      borderRadius: "16px",
      borderLeft: "4px solid #ffa500"
    },
    insightTitle: {
      color: "#ffffff",
      fontSize: "1.1rem",
      fontWeight: 600,
      marginBottom: "0.75rem"
    },
    insightContent: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: "0.95rem",
      lineHeight: "1.5"
    }
  };

  const createEmotionBadge = (theme, emotion, percentage) => {
    const safePercentage = Number(percentage || 0);

    return React.createElement(
      "div",
      {
        style: styles.emotionBadge(theme)
      },
      [
        React.createElement(
          "span",
          { key: "emotion", style: { fontWeight: 700 } },
          emotion
        ),
        React.createElement(
          "span",
          {
            key: "percent",
            style: { marginLeft: "6px", opacity: 0.85 }
          },
          `${safePercentage.toFixed(1)}%`
        )
      ]
    );
  };

  const segmentCards = results.map((item, index) => {
    const theme = getEmotionTheme(item.emotion);
    const isActive = activeSegment === index;

    return React.createElement(
      "div",
      {
        key: index,
        style: {
          ...styles.segmentCard,
          ...(isActive ? styles.cardHover : {}),
          animation: "fadeIn 0.5s ease"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.transform = styles.cardHover.transform;
          e.currentTarget.style.boxShadow = styles.cardHover.boxShadow;
          e.currentTarget.style.borderColor = styles.cardHover.borderColor;
          setActiveSegment(index);
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          setActiveSegment(null);
        }
      },
      [
        React.createElement(
          "div",
          { key: "header", style: styles.cardHeader },
          [
            React.createElement(
              "div",
              { key: "number", style: styles.segmentNumber },
              String(index + 1).padStart(2, "0")
            ),
            React.createElement(
              "div",
              {
                key: "badges",
                style: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }
              },
              [
                createEmotionBadge(theme, getDisplayEmotion(item.emotion), item.percentage),
                item.language && item.language !== "Unknown" &&
                  React.createElement(
                    "span",
                    { key: "lang", style: styles.languageSmallBadge },
                    item.language
                  )
              ]
            )
          ]
        ),
        React.createElement(
          "p",
          { key: "text", style: styles.segmentText },
          `"${item.segment}"`
        ),
        item.top3 &&
          item.top3.length > 0 &&
          React.createElement(
            "div",
            {
              key: "top3",
              style: { color: "rgba(255,255,255,0.65)", fontSize: "0.9rem" }
            },
            "Top 3: " +
              item.top3
                .map((t) => `${getDisplayEmotion(t.emotion)} ${Number(t.percentage || 0).toFixed(1)}%`)
                .join(" | ")
          )
      ]
    );
  });

  const visualizationBars = results.map((item, index) => {
    const top3 =
      item.top3 && item.top3.length > 0
        ? item.top3
        : [{ emotion: item.emotion, percentage: item.percentage }];

    return React.createElement(
      "div",
      {
        key: index,
        style: {
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "1rem",
          width: "240px",
          minWidth: "240px",
          maxWidth: "240px"
        }
      },
      [
        React.createElement(
          "div",
          {
            key: "title",
            style: {
              color: "#ffffff",
              fontWeight: 700,
              marginBottom: "1rem",
              textAlign: "center"
            }
          },
          `Verse ${index + 1}`
        ),

        React.createElement(
          "div",
          {
            key: "chartWrap",
            style: {
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-evenly",
              gap: "10px",
              height: "220px",
              padding: "0.5rem 0 0.75rem 0",
              borderBottom: "1px solid rgba(255,255,255,0.12)"
            }
          },
          top3.map((emo, emoIndex) => {
            const theme = getEmotionTheme(emo.emotion);
            const pct = Number(emo.percentage || 0);

            return React.createElement(
              "div",
              {
                key: `${index}-${emoIndex}`,
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  width: "58px"
                }
              },
              [
                React.createElement(
                  "div",
                  {
                    key: "percent",
                    style: {
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "0.8rem",
                      marginBottom: "0.4rem",
                      fontWeight: 600
                    }
                  },
                  `${pct.toFixed(1)}%`
                ),
                React.createElement("div", {
                  key: "bar",
                  title: `${getDisplayEmotion(emo.emotion)} - ${pct.toFixed(1)}%`,
                  style: {
                    width: "40px",
                    height: `${Math.max(18, Math.min(180, pct * 1.8))}px`,
                    background: theme.gradient,
                    borderRadius: "10px 10px 0 0",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                    transition: "height 0.5s ease"
                  }
                }),
                React.createElement(
                  "div",
                  {
                    key: "label",
                    style: {
                      color: "#ffffff",
                      fontSize: "0.68rem",
                      marginTop: "0.55rem",
                      textAlign: "center",
                      lineHeight: "1.15",
                      wordBreak: "break-word"
                    }
                  },
                  getDisplayEmotion(emo.emotion)
                )
              ]
            );
          })
        )
      ]
    );
  });

  const legendLabels = [
  "Shringara",
  "Hasya",
  "Karuna",
  "Roudhra",
  "Veera",
  "Bhayanakam",
  "Bhibatsa",
  "Adbhutha",
  "Shantha"
];

const legendItems = legendLabels.map((emotion) => {
  const displayEmotion = getDisplayEmotion(emotion);
  const theme = getEmotionTheme(emotion);

  return React.createElement(
    "div",
    { key: emotion, style: styles.legendItem },
    [
      React.createElement("div", {
        key: "color",
        style: styles.legendColor(theme.gradient)
      }),
      React.createElement(
        "span",
        { key: "text", style: styles.legendText },
        `${emotion} (${displayEmotion})`
      )
    ]
  );
});

  const getDominantEmotion = () => {
    if (results.length === 0) return "N/A";

    const emotionCounts = {};
    results.forEach((item) => {
      const displayEmotion = getDisplayEmotion(item.emotion);
      emotionCounts[displayEmotion] = (emotionCounts[displayEmotion] || 0) + 1;
    });

    return Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0][0];
  };

  const getEmotionDiversity = () => {
    if (results.length === 0) return "0 unique emotions";
    const uniqueCount = new Set(results.map((r) => r.emotion)).size;
    return `${uniqueCount} unique emotions`;
  };

  const getPeakEmotionalVerse = () => {
    if (results.length === 0) return "N/A";

    let peakIndex = 0;
    for (let i = 1; i < results.length; i++) {
      if ((results[i].percentage || 0) > (results[peakIndex].percentage || 0)) {
        peakIndex = i;
      }
    }

    return `Verse ${peakIndex + 1} (${getDisplayEmotion(results[peakIndex].emotion)}, ${Number(
      results[peakIndex].percentage || 0
    ).toFixed(1)}%)`;
  };

  const getMostCommonTransition = () => {
    if (results.length < 2) return "No transition";

    const transitionCounts = {};

    for (let i = 0; i < results.length - 1; i++) {
      const transition = `${getDisplayEmotion(results[i].emotion)} → ${getDisplayEmotion(
        results[i + 1].emotion
      )}`;
      transitionCounts[transition] = (transitionCounts[transition] || 0) + 1;
    }

    const topTransition = Object.entries(transitionCounts).sort((a, b) => b[1] - a[1])[0];

    return topTransition ? topTransition[0] : "No transition";
  };

  return React.createElement(
    "div",
    { style: styles.mainContent },
    React.createElement(
      "div",
      { style: styles.fusionDashboard },
      [
        React.createElement(
          "div",
          { key: "header", style: styles.dashboardHeader },
          [
            React.createElement(
              "h1",
              { key: "title", style: styles.dashboardTitle },
              "Emotion Rhythm Analyzer"
            ),
            React.createElement(
              "p",
              { key: "subtitle", style: styles.dashboardSubtitle },
              "Prepare Sinhala or English lyrics, detect language, clean input, split verses, and visualize the emotional journey for dance choreography."
            )
          ]
        ),

        React.createElement(
          "div",
          { key: "content", style: styles.fusionContent },
          [
            React.createElement(
              "section",
              { key: "input", style: styles.inputSection },
              React.createElement(
                "div",
                { style: styles.inputContainer },
                [
                  React.createElement(
                    "h2",
                    { key: "title", style: styles.sectionTitle },
                    "Song Lyrics Analysis"
                  ),
                  React.createElement(
                    "p",
                    { key: "description", style: styles.sectionDescription },
                    "Enter Sinhala or English song lyrics. Use blank lines to separate verses. If no blank lines are used, the system groups every 4 lines as one verse."
                  ),
                  React.createElement(
                    "div",
                    { key: "textarea-wrapper", style: styles.textareaWrapper },
                    [
                      React.createElement(
                        "div",
                        { key: "label", style: styles.textareaLabel },
                        [
                          React.createElement(
                            "span",
                            { key: "text", style: styles.labelText },
                            "Lyrics Input"
                          ),
                          React.createElement(
                            "span",
                            { key: "count", style: styles.lineCount },
                            `${lyrics.split("\n").filter((l) => l.trim()).length} lines`
                          )
                        ]
                      ),
                      React.createElement("textarea", {
                        key: "textarea",
                        rows: 10,
                        style: styles.textarea,
                        placeholder:
                          "Paste song lyrics here...\n\nExample:\nමගේ හිත දුකෙන් පිරීලා\nඔබ නැති ලෝකය නිහඬ වෙලා\n\nසඳ එළිය මැකී ගියා\nමතකය පමණක් ඉතිරි වෙලා",
                        value: lyrics,
                        onChange: (e) => {
                          const value = e.target.value;
                          setLyrics(value);
                          setLanguage(detectLanguage(value));
                          setPrepared(null);
                          setResults([]);
                        },
                        onFocus: (e) => {
                          e.target.style.outline = "none";
                          e.target.style.borderColor = "rgba(255, 107, 157, 0.5)";
                          e.target.style.background = "rgba(255, 255, 255, 0.08)";
                          e.target.style.boxShadow = "0 0 0 4px rgba(255, 107, 157, 0.1)";
                        },
                        onBlur: (e) => {
                          e.target.style.outline = "";
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                          e.target.style.background = "rgba(255, 255, 255, 0.05)";
                          e.target.style.boxShadow = "";
                        }
                      })
                    ]
                  ),

                  React.createElement(
                    "div",
                    { key: "live-language", style: styles.liveInfo },
                    [
                      React.createElement("span", { key: "label" }, "Live detected language:"),
                      React.createElement(
                        "span",
                        { key: "badge", style: styles.languageBadge },
                        language
                      ),
                      React.createElement(
                        "div",
                        {
                          key: "msg",
                          style: { marginTop: "0.5rem", color: "rgba(255,255,255,0.6)" }
                        },
                        getLanguageMessage(language)
                      )
                    ]
                  ),

                  React.createElement(
                    "div",
                    { key: "buttons", style: styles.buttonRow },
                    [
                      React.createElement(
                        "button",
                        {
                          key: "prepare",
                          style: styles.primaryButton,
                          onClick: handlePrepareLyrics
                        },
                        [
                          React.createElement("span", { key: "icon" }, "🧹"),
                          "Prepare Lyrics"
                        ]
                      ),

                      React.createElement(
                        "button",
                        {
                          key: "sample",
                          style: styles.secondaryButton,
                          onClick: () => {
                            setLyrics(sampleLyrics);
                            setLanguage(detectLanguage(sampleLyrics));
                            setPrepared(null);
                            setResults([]);
                          }
                        },
                        "🎵 Try Sample"
                      ),

                      React.createElement(
                        "button",
                        {
                          key: "clear",
                          style: styles.secondaryButton,
                          onClick: () => {
                            setLyrics("");
                            setLanguage("Unknown");
                            setPrepared(null);
                            setResults([]);
                          }
                        },
                        "🗑 Clear"
                      )
                    ]
                  )
                ]
              )
            ),

            prepared &&
              React.createElement(
                "section",
                { key: "prepared", style: styles.preparedSection },
                [
                  React.createElement(
                    "h2",
                    { key: "title", style: styles.sectionTitle },
                    "Input Quality Report"
                  ),

                  prepared.warning &&
                    React.createElement(
                      "div",
                      { key: "warning", style: styles.warning },
                      prepared.warning
                    ),

                  React.createElement(
                    "div",
                    { key: "grid", style: styles.reportGrid },
                    [
                      ["Detected Language", prepared.cleanedLanguage],
                      ["Original Lines", prepared.originalLineCount],
                      ["Prepared Verses", prepared.verseCount],
                      ["Duplicates Removed", prepared.duplicateCount],
                      ["Noise Removed", prepared.removedNoise],
                      ["Input Quality", prepared.quality]
                    ].map(([label, value]) =>
                      React.createElement(
                        "div",
                        { key: label, style: styles.reportBox },
                        [
                          React.createElement(
                            "div",
                            { key: "label", style: styles.reportLabel },
                            label
                          ),
                          React.createElement(
                            "div",
                            { key: "value", style: styles.reportValue },
                            value
                          )
                        ]
                      )
                    )
                  ),

                  React.createElement(
                    "h2",
                    {
                      key: "preview-title",
                      style: { ...styles.sectionTitle, fontSize: "1.3rem" }
                    },
                    "Prepared Verse Preview"
                  ),

                  React.createElement(
                    "div",
                    { key: "preview", style: styles.versePreview },
                    prepared.verses.map((v, i) =>
                      React.createElement(
                        "div",
                        { key: i, style: styles.verseItem },
                        [
                          React.createElement(
                            "strong",
                            { key: "label" },
                            `Verse ${i + 1}: `
                          ),
                          React.createElement("span", { key: "text" }, v)
                        ]
                      )
                    )
                  ),

                  React.createElement(
                    "div",
                    { key: "analyze-row", style: styles.buttonRow },
                    [
                      React.createElement(
                        "button",
                        {
                          key: "analyze",
                          onClick: handleAnalyzeSong,
                          disabled: loading || !canAnalyze,
                          style: {
                            ...styles.primaryButton,
                            ...(loading || !canAnalyze ? styles.disabledBtn : {})
                          }
                        },
                        loading
                          ? [
                              React.createElement("div", {
                                key: "spinner",
                                style: styles.loadingSpinner
                              }),
                              "Analyzing Emotional Journey..."
                            ]
                          : [
                              React.createElement("span", { key: "icon" }, "🎭"),
                              "Analyze Emotional Flow"
                            ]
                      )
                    ]
                  )
                ]
              ),

            results.length > 0 &&
              React.createElement(
                "section",
                { key: "results", style: styles.resultsSection },
                [
                  React.createElement(
                    "div",
                    { key: "header", style: styles.resultsHeader },
                    [
                      React.createElement(
                        "h2",
                        { key: "title", style: styles.sectionTitle },
                        "Emotional Segments"
                      ),
                      React.createElement(
                        "div",
                        { key: "stats", style: styles.statsContainer },
                        [
                          React.createElement(
                            "div",
                            { key: "segments", style: styles.statItem },
                            [
                              React.createElement(
                                "div",
                                { key: "number", style: styles.statNumber },
                                results.length
                              ),
                              React.createElement(
                                "div",
                                { key: "label", style: styles.statLabel },
                                "Segments"
                              )
                            ]
                          ),
                          React.createElement(
                            "div",
                            { key: "emotions", style: styles.statItem },
                            [
                              React.createElement(
                                "div",
                                { key: "number", style: styles.statNumber },
                                new Set(results.map((r) => getDisplayEmotion(r.emotion))).size
                              ),
                              React.createElement(
                                "div",
                                { key: "label", style: styles.statLabel },
                                "Emotions"
                              )
                            ]
                          ),
                          React.createElement(
                            "div",
                            { key: "dominant", style: styles.statItem },
                            [
                              React.createElement(
                                "div",
                                { key: "number", style: styles.statNumber },
                                getDominantEmotion()
                              ),
                              React.createElement(
                                "div",
                                { key: "label", style: styles.statLabel },
                                "Dominant"
                              )
                            ]
                          )
                        ]
                      )
                    ]
                  ),
                  React.createElement(
                    "div",
                    { key: "grid", style: styles.segmentsGrid },
                    segmentCards
                  )
                ]
              ),

            results.length > 0 &&
              React.createElement(
                "section",
                { key: "visualization", style: styles.visualizationSection },
                [
                  React.createElement(
                    "div",
                    { key: "header", style: styles.visualizationHeader },
                    [
                      React.createElement(
                        "h3",
                        { key: "title", style: styles.visualizationTitle },
                        "Emotional Journey Visualization"
                      ),
                      React.createElement(
                        "p",
                        { key: "description", style: styles.visualizationDescription },
                        "Each verse shows the top predicted emotions throughout the song, useful for planning choreography flow and emotional transitions."
                      )
                    ]
                  ),
                  React.createElement(
                    "div",
                    { key: "chart", style: styles.chartContainer },
                    [
                      React.createElement("div", {
                        key: "line",
                        style: styles.chartLine
                      }),
                      React.createElement(
                        "div",
                        { key: "bars", style: styles.barsWrapper },
                        visualizationBars
                      )
                    ]
                  ),
                  React.createElement(
                    "div",
                    { key: "legend", style: styles.legendContainer },
                    legendItems
                  )
                ]
              ),

            results.length > 0 &&
              React.createElement(
                "section",
                { key: "insights", style: styles.insightsSection },
                [
                  React.createElement(
                    "h3",
                    { key: "title", style: styles.insightsTitle },
                    "Dance Choreography Insights"
                  ),
                  React.createElement(
                    "div",
                    { key: "grid", style: styles.insightsGrid },
                    [
                      React.createElement(
                        "div",
                        { key: "dominant", style: styles.insightCard },
                        [
                          React.createElement(
                            "div",
                            { key: "title", style: styles.insightTitle },
                            "Dominant Emotion"
                          ),
                          React.createElement(
                            "div",
                            { key: "content", style: styles.insightContent },
                            getDominantEmotion()
                          )
                        ]
                      ),
                      React.createElement(
                        "div",
                        { key: "diversity", style: styles.insightCard },
                        [
                          React.createElement(
                            "div",
                            { key: "title", style: styles.insightTitle },
                            "Emotion Diversity"
                          ),
                          React.createElement(
                            "div",
                            { key: "content", style: styles.insightContent },
                            getEmotionDiversity()
                          )
                        ]
                      ),
                      React.createElement(
                        "div",
                        { key: "peak", style: styles.insightCard },
                        [
                          React.createElement(
                            "div",
                            { key: "title", style: styles.insightTitle },
                            "Peak Emotional Verse"
                          ),
                          React.createElement(
                            "div",
                            { key: "content", style: styles.insightContent },
                            getPeakEmotionalVerse()
                          )
                        ]
                      ),
                      React.createElement(
                        "div",
                        { key: "transition", style: styles.insightCard },
                        [
                          React.createElement(
                            "div",
                            { key: "title", style: styles.insightTitle },
                            "Most Common Transition"
                          ),
                          React.createElement(
                            "div",
                            { key: "content", style: styles.insightContent },
                            getMostCommonTransition()
                          )
                        ]
                      )
                    ]
                  )
                ]
              )
          ].filter(Boolean)
        )
      ]
    )
  );
}

export default EmotionAnalysis;