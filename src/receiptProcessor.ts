import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export interface ReceiptData {
  items: Array<{
    name: string;
    cost: number;
  }>;
  subtotal?: number;
  total?: number;
  tipIncludedInTotal: boolean;
  tip?: number;
}

export async function processReceipt(
  file: File,
  apiKey: string
): Promise<ReceiptData> {
  // Convert image to base64
  const base64Image = await fileToBase64(file);
  
  // Create OpenRouter provider
  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    headers: {
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Dinner Debt',
    }
  });
  
  // Call vision API with tool calling
  console.log('Calling OpenRouter API...');
  const result = await generateText({
    model: openrouter.chat('openai/gpt-4o-mini'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: base64Image,
          },
          {
            type: 'text',
            text: `Extract all items from this receipt and return valid JSON.

Return your response as valid JSON with this structure:
{
  "items": [{"name": "string", "cost": number}, ...],
  "subtotal": number,
  "total": number,
  "tipIncludedInTotal": boolean,
  "tip": number (optional, only if explicitly shown and NOT included in total)
}

Important edge cases:
- If tip is hand-written, set tipIncludedInTotal to false and set tip to the amount of the tip.
- Ignore hand-written total if present. For subtotal and total, use the printed values.
- Otherwise, if gratuity/tip is included in the printed total and there is no hand-written tip: set tipIncludedInTotal to true and tip to 0.
- If an item shows "x2" or quantity multiplier: create separate duplicate items`
          }
        ]
      }
    ]
  });
  
  // Parse the response
  const responseText = result.text;
  console.log('AI Response:', responseText);
  
  // Check if response looks like HTML (error response)
  if (responseText.trim().startsWith('<')) {
    console.error('Received HTML response instead of JSON:', responseText.substring(0, 200));
    throw new Error('OpenRouter returned an error. Check your API key and credits.');
  }
  
  // Extract JSON from response (it might be wrapped in markdown code blocks)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON found in response:', responseText);
    throw new Error(`Could not parse response from AI. Response was: ${responseText.substring(0, 100)}...`);
  }
  
  try {
    const parsedData = JSON.parse(jsonMatch[0]) as ReceiptData;
    return parsedData;
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Attempted to parse:', jsonMatch[0]);
    throw new Error('Failed to parse JSON from AI response');
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

