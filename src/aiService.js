/**
 * AI Service for Senior UI/UX Comparison
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

const SYSTEM_PROMPT = `
You are a Senior UI/UX Designer at 10Pearls. Your job is to compare a Figma Design (Expected) against a Live Implementation Screenshot (Actual) and report ONLY genuine bugs.

CRITICAL DESIGN SYSTEM RULES FOR 10PEARLS:
1. Typography: The only acceptable font is "Proxima Nova". If the implementation uses a different fallback font but it looks visually similar in structure to Proxima Nova, DO NOT report it as a bug. However, if the weight is wrong (e.g. headings must be Bold/Semibold), flag it.
2. Colors: Pure White (#FFFFFF) and Dark Charcoal (#1A1A1A/Black) are primary. The EXACT accent color must be Lime Green (#C7F500). If the implementation uses a slightly different green, flag it.
3. Spacing: Vertical padding between sections should be generous (80px - 120px). If things look cramped, flag it.
4. UI Elements: Icons must be thin lime green line-art. 

YOUR INSTRUCTIONS:
- Do NOT flag minor pixel-shifts or slight text-rendering anti-aliasing differences.
- Focus on layout structure, missing elements, wrong colors, wrong text weights, and spacing issues.
- If you notice a typography difference but you judge it to be acceptable for the 10Pearls brand, IGNORE IT.

Return your analysis as a JSON array of objects, where each object has:
{
  "title": "Short name of the bug",
  "severity": "Low | Medium | High",
  "expected": "What the figma design shows",
  "actual": "What the implementation shows",
  "recommendation": "How to fix it"
}
If there are no bugs that violate the core aesthetics, return an empty array [].
Return ONLY valid JSON. No markdown wrappers like \`\`\`json.
`;

/**
 * Converts a base64 Data URL to the format required by Gemini API
 */
const prepareImageForGemini = (dataUrl) => {
  // data:image/png;base64,iVBORw0KG...
  const [mimeString, base64Data] = dataUrl.split(',');
  const mimeType = mimeString.match(/:(.*?);/)[1];
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType
    }
  };
};

/**
 * Helper to fetch a URL and convert to Base64 (mainly for the Figma Image)
 */
export const fetchUrlAsBase64 = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Runs the UI Comparison using Gemini Vision
 */
export const runAIAnalysis = async (apiKey, figmaImageDataUrl, actualImageDataUrl, metadata) => {
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const expectedImagePart = prepareImageForGemini(figmaImageDataUrl);
  const actualImagePart = prepareImageForGemini(actualImageDataUrl);

  const userPrompt = `
Here is the context for this comparison:
- Webpage URL: ${metadata.webpageUrl}
- Case Study URL: ${metadata.compareUrl}
- Meta Title: ${metadata.metaTitle}
- Meta Description: ${metadata.metaDesc}

Image 1 (First image) is the Expected Figma Design.
Image 2 (Second image) is the Actual Implementation Screenshot.

Please analyze them according to your system instructions and return the JSON bug report.
  `;

  const requestBody = {
    systemInstruction: {
      parts: [ { text: SYSTEM_PROMPT } ]
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: userPrompt },
          expectedImagePart,
          actualImagePart
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(`AI API Error: ${errData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  try {
    const jsonStr = data.candidates[0].content.parts[0].text;
    return JSON.parse(jsonStr);
  } catch(e) {
    console.error("Failed to parse AI response:", data);
    throw new Error("AI returned invalid data format.");
  }
};
