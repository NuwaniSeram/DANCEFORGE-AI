import React, { useState, useEffect } from "react";
import { predictEmotion } from "../services/emotionService";

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

const intensityScale = {
  low: { height: 40, label: "Low" },
  medium: { height: 80, label: "Medium" },
  high: { height: 120, label: "High" }
};

function EmotionAnalysis() {
  const [lyrics, setLyrics] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSegment, setActiveSegment] = useState(null);

  // Inject CSS animations
  useEffect(() => {
    const styleId = 'emotion-analysis-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
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

  const segmentLyrics = (text) => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  const getEmotionTheme = (emotion) => {
    const lowerEmotion = emotion.toLowerCase();
    for (const [key, theme] of Object.entries(emotionThemes)) {
      if (lowerEmotion.includes(key)) return theme;
    }
    return emotionThemes.default;
  };

  const handleAnalyzeSong = async () => {
    if (!lyrics.trim()) return;

    setLoading(true);
    setResults([]);

    const segments = segmentLyrics(lyrics);
    const analysisResults = [];

    for (let i = 0; i < segments.length; i++) {
      const response = await predictEmotion(segments[i]);

      analysisResults.push({
        segment: segments[i],
        emotion: response.emotion,
        intensity: response.intensity,
      });
    }

    setResults(analysisResults);
    setLoading(false);
  };

  // Main Styles
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
      maxWidth: "600px",
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
      minHeight: "150px",
      transition: "all 0.3s ease"
    },
    textareaFocus: {
      outline: "none",
      borderColor: "rgba(255, 107, 157, 0.5)",
      background: "rgba(255, 255, 255, 0.08)",
      boxShadow: "0 0 0 4px rgba(255, 107, 157, 0.1)"
    },
    analyzeButton: {
      padding: "1.2rem 2.5rem",
      background: "linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)",
      color: "white",
      border: "none",
      borderRadius: "16px",
      fontSize: "1rem",
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 15px rgba(255, 107, 157, 0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      width: "100%"
    },
    buttonHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(255, 107, 157, 0.5)"
    },
    loadingSpinner: {
      width: "20px",
      height: "20px",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTopColor: "white",
      animation: "spin 1s linear infinite"
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
      marginBottom: "2rem"
    },
    statsContainer: {
      display: "flex",
      gap: "2rem"
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
    intensityDot: (intensity) => ({
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: intensity === "high" ? "#FF4757" : intensity === "medium" ? "#FF7F50" : "#2ED573"
    }),
    segmentText: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: "0.95rem",
      lineHeight: "1.6",
      marginBottom: "1rem",
      fontStyle: "italic"
    },
    intensityBar: {
      width: "100%",
      height: "6px",
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "3px",
      overflow: "hidden"
    },
    intensityFill: (theme, width) => ({
      height: "100%",
      width: `${width}%`,
      background: theme.gradient,
      borderRadius: "3px",
      transition: "width 0.5s ease"
    }),
    intensityLabel: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "0.5rem"
    },
    intensityText: {
      color: "rgba(255, 255, 255, 0.7)",
      fontSize: "0.85rem"
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
      height: "300px",
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
      justifyContent: "space-between",
      alignItems: "flex-end",
      height: "100%",
      padding: "0 1rem"
    },
    barContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flex: 1,
      maxWidth: "60px"
    },
    emotionBar: (theme, intensity, isActive) => ({
      width: "40px",
      height: `${intensityScale[intensity].height}px`,
      background: theme.gradient,
      borderRadius: "8px 8px 0 0",
      transition: "all 0.3s ease",
      cursor: "pointer",
      transform: isActive ? "scale(1.05)" : "scale(1)",
      boxShadow: isActive ? `0 10px 30px ${theme.border}` : "0 5px 15px rgba(0, 0, 0, 0.2)"
    }),
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

  // Helper functions
  const createEmotionBadge = (theme, emotion, intensity) => {
    return React.createElement(
      "div",
      {
        style: styles.emotionBadge(theme)
      },
      [
        emotion,
        React.createElement("div", {
          key: "dot",
          style: styles.intensityDot(intensity)
        })
      ]
    );
  };

  // Create textarea element
  const textarea = React.createElement("textarea", {
    rows: 10,
    style: styles.textarea,
    placeholder: "Enter your Sinhala song lyrics here...\n\nExample:\nමල් පැණි පිපි රෑ\nසැමදා සිහින මා\nසෙනෙහස පුරා ගිය\nසැමදා සිහින මා...",
    value: lyrics,
    onChange: (e) => setLyrics(e.target.value),
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
  });

  // Create analyze button
  const analyzeButton = React.createElement("button", {
    onClick: handleAnalyzeSong,
    disabled: loading,
    style: {
      ...styles.analyzeButton,
      ...(loading ? { opacity: 0.8, cursor: "not-allowed" } : {})
    },
    onMouseEnter: (e) => {
      if (!loading) {
        e.target.style.transform = styles.buttonHover.transform;
        e.target.style.boxShadow = styles.buttonHover.boxShadow;
      }
    },
    onMouseLeave: (e) => {
      if (!loading) {
        e.target.style.transform = "none";
        e.target.style.boxShadow = styles.analyzeButton.boxShadow;
      }
    }
  }, loading ? [
    React.createElement("div", {
      key: "spinner",
      style: styles.loadingSpinner
    }),
    "Analyzing Emotional Journey..."
  ] : [
    React.createElement("span", { key: "icon" }, "🎭"),
    "Analyze Emotional Flow"
  ]);

  // Create segment cards
  const segmentCards = results.map((item, index) => {
    const theme = getEmotionTheme(item.emotion);
    const isActive = activeSegment === index;
    
    const intensityWidth = item.intensity === "low" ? 33 : item.intensity === "medium" ? 66 : 100;
    
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
          e.currentTarget.style.borderColor = styles.segmentCard.border;
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
            createEmotionBadge(theme, item.emotion, item.intensity)
          ]
        ),
        React.createElement(
          "p",
          { key: "text", style: styles.segmentText },
          `"${item.segment}"`
        ),
        React.createElement(
          "div",
          { key: "intensity", style: styles.intensityBar },
          React.createElement("div", {
            style: styles.intensityFill(theme, intensityWidth)
          })
        ),
        React.createElement(
          "div",
          { key: "label", style: styles.intensityLabel },
          [
            React.createElement(
              "span",
              { key: "text", style: styles.intensityText },
              "Intensity"
            ),
            React.createElement(
              "span",
              { key: "value", style: { ...styles.intensityText, color: "#ffffff", fontWeight: 600 } },
              intensityScale[item.intensity].label
            )
          ]
        )
      ]
    );
  });

  // Create visualization bars
  const visualizationBars = results.map((item, index) => {
    const theme = getEmotionTheme(item.emotion);
    const isActive = activeSegment === index;
    
    return React.createElement(
      "div",
      {
        key: index,
        style: styles.barContainer,
        onMouseEnter: () => setActiveSegment(index),
        onMouseLeave: () => setActiveSegment(null)
      },
      [
        React.createElement(
          "div",
          {
            key: "bar",
            style: styles.emotionBar(theme, item.intensity, isActive),
            title: `${item.emotion} - ${intensityScale[item.intensity].label} Intensity`
          }
        ),
        React.createElement(
          "div",
          { key: "label", style: styles.barLabel },
          [
            React.createElement(
              "div",
              { key: "segment", style: styles.barSegment },
              `S${index + 1}`
            ),
            React.createElement(
              "div",
              { key: "emotion", style: styles.barEmotion },
              item.emotion.split(" ")[0]
            )
          ]
        )
      ]
    );
  });

  // Create legend items
  const legendItems = Object.entries(emotionThemes).map(([emotion, theme]) => {
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
          emotion.charAt(0).toUpperCase() + emotion.slice(1)
        )
      ]
    );
  });

  // Calculate insights
  const getDominantEmotion = () => {
    if (results.length === 0) return "N/A";
    const emotionCounts = {};
    results.forEach(item => {
      emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
    });
    return Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  };

  const getIntensityPattern = () => {
    if (results.length < 2) return "Constant";
    const intensities = results.map(r => r.intensity);
    const hasRise = intensities.some((val, i, arr) => i > 0 && 
      (val === "high" && arr[i-1] === "low" || val === "high" && arr[i-1] === "medium"));
    const hasFall = intensities.some((val, i, arr) => i > 0 && 
      (val === "low" && arr[i-1] === "high" || val === "low" && arr[i-1] === "medium"));
    
    if (hasRise && hasFall) return "Dynamic";
    if (hasRise) return "Building";
    if (hasFall) return "Calming";
    return "Steady";
  };

  const getDanceComplexity = () => {
    if (results.length === 0) return "Low";
    const emotionTypes = new Set(results.map(r => r.emotion));
    const hasHighIntensity = results.some(r => r.intensity === "high");
    
    if (emotionTypes.size > 3 && hasHighIntensity) return "High";
    if (emotionTypes.size > 2) return "Medium";
    return "Low";
  };

  return React.createElement(
    "div",
    { style: styles.mainContent },
    React.createElement(
      "div",
      { style: styles.fusionDashboard },
      [
        // Header
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
              "Analyze Sinhala song emotions and visualize the perfect dance choreography journey"
            )
          ]
        ),

        // Main Content
        React.createElement(
          "div",
          { key: "content", style: styles.fusionContent },
          [
            // Input Section
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
                    "Enter your Sinhala song lyrics below. Each line will be analyzed for emotional content to help plan your dance choreography."
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
                            `${lyrics.split('\n').filter(l => l.trim()).length} segments`
                          )
                        ]
                      ),
                      textarea
                    ]
                  ),
                  analyzeButton
                ]
              )
            ),

            // Results Section
            results.length > 0 && React.createElement(
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
                            React.createElement("div", { key: "number", style: styles.statNumber }, results.length),
                            React.createElement("div", { key: "label", style: styles.statLabel }, "Segments")
                          ]
                        ),
                        React.createElement(
                          "div",
                          { key: "emotions", style: styles.statItem },
                          [
                            React.createElement("div", { key: "number", style: styles.statNumber }, 
                              new Set(results.map(r => r.emotion)).size
                            ),
                            React.createElement("div", { key: "label", style: styles.statLabel }, "Emotions")
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

            // Visualization Section
            results.length > 0 && React.createElement(
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
                      "Visual trajectory showing emotional intensity throughout the song, perfect for choreography planning"
                    )
                  ]
                ),
                React.createElement(
                  "div",
                  { key: "chart", style: styles.chartContainer },
                  [
                    React.createElement("div", { key: "line", style: styles.chartLine }),
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

            // Insights Section
            results.length > 0 && React.createElement(
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
                        React.createElement("div", { key: "title", style: styles.insightTitle }, "Dominant Emotion"),
                        React.createElement("div", { key: "content", style: styles.insightContent }, getDominantEmotion())
                      ]
                    ),
                    React.createElement(
                      "div",
                      { key: "pattern", style: styles.insightCard },
                      [
                        React.createElement("div", { key: "title", style: styles.insightTitle }, "Intensity Pattern"),
                        React.createElement("div", { key: "content", style: styles.insightContent }, getIntensityPattern())
                      ]
                    ),
                    React.createElement(
                      "div",
                      { key: "complexity", style: styles.insightCard },
                      [
                        React.createElement("div", { key: "title", style: styles.insightTitle }, "Dance Complexity"),
                        React.createElement("div", { key: "content", style: styles.insightContent }, getDanceComplexity())
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