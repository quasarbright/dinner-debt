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
  // Check if file is HEIC format (not supported by OpenAI)
  if (file.type === 'image/heic' || file.type === 'image/heif' || 
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    throw new Error('HEIC/HEIF format is not supported. Please convert to JPEG or PNG first.');
  }
  
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
  // Compress image and convert to JPEG (handles HEIC and other formats)
  console.log('Original image:', file.size, 'bytes, type:', file.type);
  const compressed = await compressImage(file);
  console.log('Compressed image:', compressed.size, 'bytes, type:', compressed.type);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}

async function compressImage(file: File, maxSizeBytes: number = 1024 * 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate dimensions to fit within reasonable size
        let width = img.width;
        let height = img.height;
        const maxDimension = 2048; // Max width or height
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        // Start with quality 0.9 and reduce if needed
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // If still too large and quality can be reduced, try again
            if (blob.size > maxSizeBytes && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
            } else {
              console.log(`Compressed image: ${file.size} bytes -> ${blob.size} bytes (quality: ${quality.toFixed(1)})`);
              resolve(blob);
            }
          }, 'image/jpeg', quality);
        };
        
        tryCompress();
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
