require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const app = express();
app.use(express.json());

// ============================================
// CONFIGURATION DES MODÈLES
// ============================================
// Pour ajouter un nouveau modèle, copie-colle un bloc et change les IDs
const MODELS = {
  "alicelyd": {
    name: "Alicelyd",
    hubChannel: "1538350784197169352",           // Salon hub (où arrive le webhook MyPuls)
    newSubChannel: "1470220774815039553",        // Salon nouveaux abonnés
    paymentChannel: "1470221301078560789"        // Salon paiements
  },

  "julieof": {
    name: "Juliefp",
    hubChannel: "1538894979798274120",
    newSubChannel: "1470222620271050754",
    paymentChannel: "1470223132827713632"
  },

  "julieMym": {
    name: "TaprofJulie",
    hubChannel: "1538987177319338104",
    newSubChannel: "1470229295791083683",
    paymentChannel: "1470229760360579154"
  }
};

// Mémoire anti-doublon
const processedMessages = new Set();

// ============================================
// Écoute des messages des salons hub
// ============================================
client.on('messageCreate', async (message) => {
  // On ignore tout ce qui n'est pas un webhook
  if (!message.webhookId) return;

  // Anti-doublon
  if (processedMessages.has(message.id)) {
    console.log('Message déjà traité, on ignore');
    return;
  }
  processedMessages.add(message.id);
  setTimeout(() => processedMessages.delete(message.id), 5 * 60 * 1000);

  // On cherche le modèle qui correspond à ce salon hub
  let model = null;
  for (const key in MODELS) {
    if (MODELS[key].hubChannel === message.channel.id) {
      model = MODELS[key];
      break;
    }
  }

  // Si ce n'est pas un de nos salons hub → on ignore
  if (!model) return;

  console.log(`Message reçu du hub de ${model.name}`);
  console.log('Contenu :', message.content);

  const content = (message.content || '').toLowerCase();
  const embedText = message.embeds.map(e => {
    return `${e.title || ''} ${e.description || ''} ${(e.fields || []).map(f => `${f.name} ${f.value}`).join(' ')}`;
  }).join(' ').toLowerCase();

  const fullText = `${content} ${embedText}`;

  try {
    let channelId = null;
    let title = '';

    if (
      fullText.includes('abonné') ||
      fullText.includes('subscriber') ||
      fullText.includes('new_subscriber') ||
      fullText.includes('abonnement')
    ) {
      channelId = model.newSubChannel;
      title = `🆕 Nouvel abonné — ${model.name}`;
    } else if (
      fullText.includes('paiement') ||
      fullText.includes('payment') ||
      fullText.includes('payé') ||
      fullText.includes('tip') ||
      fullText.includes('purchase')
    ) {
      channelId = model.paymentChannel;
      title = `💰 Paiement — ${model.name}`;
    } else {
      console.log(`[${model.name}] Type d'événement non reconnu`);
      return;
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`[${model.name}] Salon introuvable`);
      return;
    }

    await channel.send({
      content: message.content || null,
      embeds: message.embeds,
      files: [...message.attachments.values()]
    });

    console.log(`→ [${model.name}] Message envoyé : ${title}`);
  } catch (error) {
    console.error(`[${model.name}] Erreur :`, error);
  }
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
