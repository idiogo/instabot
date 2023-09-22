const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs');
const { IgApiClient } = require('instagram-private-api');
const axios = require('axios');
const sharp = require("sharp");
const express = require('express')
const app = express()
const port = 80

app.get('/', (req, res) => {
  res.send('Hello World!')
  generateAndPostImage(chatGPTPrompt);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const chatGPTPrompt = "Crie um texto desmotivacional com no máximo 100 caracteres em tom de comédia. Exemplo 1: 'Não faça hoje o que você pode fazer amanhã'. Exemplo 2: 'Não deixe dizerem que você não consegue. Diga você mesmo: Eu não consigo'. ";
const DALLePrompt = "landscape to use as motivational background for a text that i'll put above";

const imageConfig = {
    w: 1024, 
    h: 1024,
    fontFamily: 'Futura',
    fill: '#000',
    fontSize: '50px',
    fontWeight: 'bold',
    inlineSize: '50px',
}

const envVars = {
    openaiApiKey: "######",
    igUsername: "laboratorio_desmotivacional",
    igPassword: "******",
}


// Initialize OpenAI API client
const configuration = new Configuration({
    apiKey: envVars.openaiApiKey,
  });
const openaiApi = new OpenAIApi(configuration);

// Initialize Instagram API client
const ig = new IgApiClient();

// Function to generate a response from ChatGPT
async function generateChatResponse(prompt) {

    const response = await openaiApi.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    //   console.log('Chat response:', response.data.choices);

    const chatResult = response.data.choices[0].text.trim();
    return chatResult;
}

// Function to generate an image using DALL-E
async function generateDalleImage(text) {
    const response = await openaiApi.createImage({
        prompt: text,
        n: 1,
        size: imageConfig.w+"x"+imageConfig.h,
    });

    const image = response.data.data[0].url;

    // console.log(image)

    return image;
}

// Function to log in to Instagram
async function loginToInstagram(username, password) {
  await ig.state.generateDevice(username);
  await ig.account.login(username, password);
}

// Function to post image and text on Instagram
async function postToInstagram(imagePath, caption) {
    const publishResult = await ig.publish.photo({
        file: fs.readFileSync(imagePath),
        caption: caption,
    });

    return publishResult;
}

// Main function to generate the image and post it on Instagram
async function generateAndPostImage(prompt) {
  try {
    console.log('Gerando texto no ChatGPT...');
    const chatResponse = await generateChatResponse(prompt);
    console.log('Texto gerado:', chatResponse);
    console.log('Gerando background no DALL-E...');
    const image = await generateDalleImage(DALLePrompt);
    console.log('Background gerado. Baixando arquivo...');
    const imageBuffer = await downloadImage(image);
    const base64Image = await convertImageToBase64(imageBuffer);
    console.log('Arquivo salvo.');

    const imagePath = 'image.jpg';
    const outputPath = 'image_output.jpg';

    // Save the image locally
    await fs.writeFileSync(imagePath, base64Image, 'base64');

    // addTextToImage(imagePath, chatResponse, outputPath);
    console.log('Borrando imagem e mesclando texto...');
    await addTextOnImage(chatResponse);

    // Log in to Instagram
    console.log('Logando no Instagram...');
    await loginToInstagram(envVars.igUsername, envVars.igPassword);

    // Post the image on Instagram
    console.log('Postando no Instagram...');
    const publishResult = await postToInstagram(outputPath, chatResponse);

    const igResult = {
        Account: publishResult.media.user.username,
        Caption: publishResult.media.caption.text,
        Image: publishResult.media.image_versions2.candidates[0].url,
    }

    console.log('Postagem completa:', igResult);     
  } catch (error) {
    console.error('Error:', error);
  }
}

async function downloadImage(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data, 'binary');
      return imageBuffer;
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }
  
  async function convertImageToBase64(imageBuffer) {
    try {
      const base64String = imageBuffer.toString('base64');
      return base64String;
    } catch (error) {
      console.error('Error converting image to Base64:', error);
      throw error;
    }
  }
  
async function addTextOnImage(text) {
  try {
    const width = 900;
    const height = 900;

    //use text variable to create a array that each element is 4 words of the text 
    const textArray = text.split(" ");
    const textArrayLength = textArray.length;
    var linesArray = [];
    var finalText = '';

    var j = 0;
    const prefix = (lineNumber) => {
        return '<text x="50%" y="' + lineNumber * 10 + '%" text-anchor="middle" class="title">';
    };
    const postfix = '</text>';
    linesArray[j] = prefix(j);
    for (let i = 0; i < textArrayLength; i++) {
        if (i % 4 == 0) {
            j++;
            linesArray[j] = postfix + prefix(j) + textArray[i];
        }else{
            linesArray[j] = linesArray[j] + ' ' + textArray[i];
        }
    }
    linesArray[j+1] = '</text>';
    finalText = linesArray.join('');

    const svgImage = `
    <svg width="${width}" height="${height}">
      <style>
      .title { 
        fill: ${imageConfig.fill}; 
        font-size: ${imageConfig.fontSize}; 
        font-weight: ${imageConfig.fontWeight};
        font-family: ${imageConfig.fontFamily};
        inline-size: ${imageConfig.inlineSize};
        overflow-wrap: break-word;}
      </style>
        ${finalText}
    </svg>
    `;

    const svgBuffer = Buffer.from(svgImage);
    const image = await sharp("image.jpg")
        .blur(5)
        .composite([
            {
            input: svgBuffer,
            top: (imageConfig.h - height) / 2 ,
            left: (imageConfig.w - width) / 2,
            },
        ])      
        // .webp( { quality: 100 } )
        .toFile("image_output.jpg");
  } catch (error) {
    console.log(error);
  }
}
