require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // obligatoire pour lire le contenu des messages
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

// ============================================
// Écoute des messages du salon hub
// ============================================
client.on('messageCreate', async (message) => {
  // On ne traite que les messages du salon hub qui viennent d'un webhook
  if (message.channel.id !== HUB_CHANNEL_ID) return;
  if (!message.webhookId) return;

  console.log('Message reçu du hub MyPuls');
  console.log('Contenu :', message.content);
  console.log('Embeds :', JSON.stringify(message.embeds, null, 2));

  // On regarde le contenu + les embeds pour détecter le type
  const content = (message.content || '').toLowerCase();
  const embedText = message.embeds.map(e => {
    return `${e.title || ''} ${e.description || ''} ${(e.fields || []).map(f => `${f.name} ${f.value}`).join(' ')}`;
  }).join(' ').toLowerCase();

  const fullText = `${content} ${embedText}`;

  try {
    // Pour l'instant on considère qu'il n'y a qu'un modèle (alicelyd)
    const model = MODELS["alicelyd"];

    let channelId = null;
    let title = '';
    let color = 0x57F287;

    if (fullText.includes('abonné') || fullText.includes('subscriber') || fullText.includes('new_subscriber') || fullText.includes('abonnement')) {
      channelId = model.newSubChannel;
      title = `🆕 Nouvel abonné — ${model.name}`;
    } else if (fullText.includes('paiement') || fullText.includes('payment') || fullText.includes('payé') || fullText.includes('tip') || fullText.includes('purchase')) {
      channelId = model.paymentChannel;
      title = `💰 Paiement — ${model.name}`;
      color = 0xFEE75C;
    } else {
      console.log('→ Type d’événement non reconnu');
      return;
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error('Salon introuvable');
      return;
    }

    // On renvoie le message original (contenu + embeds)
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
// (Optionnel) Ancienne route webhook (au cas où)
// ============================================
app.post('/webhook/:modelKey', async (req, res) => {
  res.status(200).send('OK'); // on laisse pour ne pas casser
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
