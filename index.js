require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // obligatoire
  ],
});

const app = express();
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================
const HUB_CHANNEL_ID = '1538350784197169352'; // Salon où arrive le webhook MyPuls

const MODELS = {
  "alicelyd": {
    name: "Alicelyd",
    newSubChannel: "1470220774815039553",
    paymentChannel: "1470221301078560789"
  }
  // Tu ajouteras les autres modèles ici plus tard
};

// Mémoire des messages déjà traités (anti-doublon)
const processedMessages = new Set();

// ============================================
// Écoute des messages du salon hub
// ============================================
client.on('messageCreate', async (message) => {
  // On ne traite que les messages du salon hub qui viennent d'un webhook
  if (message.channel.id !== HUB_CHANNEL_ID) return;
  if (!message.webhookId) return;

  // Anti-doublon
  if (processedMessages.has(message.id)) {
    console.log('Message déjà traité, on ignore');
    return;
  }
  processedMessages.add(message.id);

  // On nettoie la mémoire après 5 minutes
  setTimeout(() => processedMessages.delete(message.id), 5 * 60 * 1000);

  console.log('Message reçu du hub MyPuls');
  console.log('Contenu :', message.content);
  console.log('Embeds :', JSON.stringify(message.embeds, null, 2));

  const content = (message.content || '').toLowerCase();
  const embedText = message.embeds.map(e => {
    return `${e.title || ''} ${e.description || ''} ${(e.fields || []).map(f => `${f.name} ${f.value}`).join(' ')}`;
  }).join(' ').toLowerCase();

  const fullText = `${content} ${embedText}`;

  try {
    const model = MODELS["alicelyd"];

    let channelId = null;
    let title = '';

    if (fullText.includes('abonné') || fullText.includes('subscriber') || fullText.includes('new_subscriber') || fullText.includes('abonnement')) {
      channelId = model.newSubChannel;
      title = `🆕 Nouvel abonné — ${model.name}`;
    } else if (fullText.includes('paiement') || fullText.includes('payment') || fullText.includes('payé') || fullText.includes('tip') || fullText.includes('purchase')) {
      channelId = model.paymentChannel;
      title = `💰 Paiement — ${model.name}`;
    } else {
      console.log('→ Type d’événement non reconnu');
      return;
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error('Salon introuvable');
      return;
    }

    await channel.send({
      content: message.content || null,
      embeds: message.embeds,
      files: [...message.attachments.values()]
    });

    console.log(`→ Message envoyé dans le salon : ${title}`);
  } catch (error) {
    console.error('Erreur lors du renvoi :', error);
  }
});

// ============================================
// Route webhook (optionnelle)
// ============================================
app.post('/webhook/:modelKey', async (req, res) => {
  res.status(200).send('OK');
});

// ============================================
client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
});

console.log("Token présent ?", !!process.env.DISCORD_TOKEN);
console.log("Longueur du token :", process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);
console.log("Début du token :", process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.substring(0, 10) : "AUCUN");

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
