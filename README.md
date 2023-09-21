# instabot

## What
Post to an Instagram account a GPT generated text above a DALL-E generated picture.

## How

1. `npm install` the dependencies of package.json

2. Update this code in app.js with your OpenAI API Key, Instagram account and password.

```
const envVars = {
    openaiApiKey: "######",
    igUsername: "laboratorio_desmotivacional",
    igPassword: "******",
}
```

3. Change the two prompts to something that suits your needs.

```
const chatGPTPrompt = "Crie um texto desmotivacional com no máximo 100 caracteres em tom de comédia. Exemplo 1: 'Não faça hoje o que você pode fazer amanhã'. Exemplo 2: 'Não deixe dizerem que você não consegue. Diga você mesmo: Eu não consigo'. ";
const DALLePrompt = "landscape to use as motivational background for a text that i'll put above";
```
