# Dinner Debt

A tool for calculating how much you owe someone for dinner.

https://quasarbright.github.io/dinner-debt

## Beta Features

Some experimental features are available through the settings panel:

### Receipt Upload (Beta)
Upload a photo of your receipt to automatically extract items, prices, and totals.

**To enable:**
1. Click the settings icon (⚙️) in the top-right corner
2. Toggle "Enable Beta Features"
3. Enter your OpenRouter API key
4. The receipt upload button will appear when adding items

**Note:** Receipt processing uses the OpenRouter API and will incur small costs (typically less than $0.01 per receipt) to your OpenRouter account. Your API key is stored locally in your browser's localStorage.

## Install

```sh
npm install
```

## Run locally

```sh
npm start
```

## Testing

The tests require an OpenRouter API key to test receipt processing functionality.

1. Copy the template file:
   ```sh
   cp .env.test.template .env.test
   ```

2. Edit `.env.test` and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your-actual-api-key-here
   ```

3. Run the tests:
   ```sh
   npm test
   ```

   Or run tests in watch mode:
   ```sh
   npm run test:watch
   ```

   Or run tests with coverage:
   ```sh
   npm run test:coverage
   ```

Get your API key from: https://openrouter.ai/keys

**Note:** The `.env.test` file is gitignored and should never be committed to version control.

## Deploy to GitHub pages

```sh
npm run deploy
```