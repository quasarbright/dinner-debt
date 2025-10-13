// Processes receipt images using OpenRouter Vision API to extract items, totals, and tip information.
// Uses AI vision models to parse receipt photos and return structured data.

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import imageCompression from 'browser-image-compression';
import type { ReceiptData } from './types';

export async function processReceipt(
  file: File,
  apiKey: string
): Promise<ReceiptData> {
  // Safety check: Prevent accidental API calls during tests (unless explicitly allowed)
  if (process.env.NODE_ENV === 'test' && process.env.ALLOW_RECEIPT_API_CALLS !== 'true') {
    throw new Error(
      'Receipt processor cannot be called in test environment to prevent accidental API costs. ' +
      'Use the automatic mock in __mocks__/receiptProcessor.ts instead, or set ' +
      'ALLOW_RECEIPT_API_CALLS=true for integration tests.'
    );
  }

  // Check if file is HEIC format (not supported by OpenAI)
  if (file.type === 'image/heic' || file.type === 'image/heif' || 
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    throw new Error('HEIC/HEIF format is not supported. Please convert to JPEG or PNG first.');
  }
  
  // Compress image and convert to appropriate format
  console.log('Original image:', file.size, 'bytes, type:', file.type);
  const compressed = await compressImage(file);
  console.log('Compressed image:', compressed.size, 'bytes, type:', compressed.type);
  
  // Convert to base64 or Buffer depending on environment
  const imageData = await fileToImageData(compressed);
  
  // Create OpenRouter provider
  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    headers: {
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
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
            image: imageData,
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

async function fileToImageData(blob: Blob): Promise<string | Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      
      // In Node.js environment (tests), convert to Uint8Array
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result));
        } else if (typeof result === 'string') {
          // If it's a data URL, extract the base64 part and convert to Uint8Array
          const base64Match = result.match(/^data:image\/\w+;base64,(.+)$/);
          if (base64Match) {
            const base64 = base64Match[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            resolve(bytes);
          } else {
            reject(new Error('Invalid data URL format'));
          }
        }
      } else {
        // In browser, return data URL
        resolve(result as string);
      }
    };
    reader.onerror = reject;
    
    // In Node.js, read as ArrayBuffer; in browser, read as data URL
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      reader.readAsArrayBuffer(blob);
    } else {
      reader.readAsDataURL(blob);
    }
  });
}

async function compressImage(file: File, maxSizeBytes: number = 1024 * 1024): Promise<Blob> {
  const options = {
    maxSizeMB: maxSizeBytes / (1024 * 1024), // Convert bytes to MB
    maxWidthOrHeight: 2048,
    useWebWorker: false, // Disable web workers for better compatibility in tests
    fileType: 'image/jpeg',
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed image: ${file.size} bytes -> ${compressedFile.size} bytes`);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image');
  }
}
