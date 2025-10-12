# Dinner Debt

A tool for calculating how much you owe someone for dinner.

https://quasarbright.github.io/dinner-debt

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