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
const MODELS = {
  "alicelyd": {
    name: "Alicelyd",
    hubChannel: "1538350784197169352",
    newSubChannel: "1470220774815039553",
    paymentChannel: "1470221301078560789"
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

// Mémoire anti-doublon (basée sur le contenu)
const processedMessages = new Map();

// ============================================
// Écoute des messages des salons hub
// ============================================
client.on('messageCreate', async (message) => {
  // On ignore tout ce qui n'est pas un webhook
  if (!message.webhookId) return;

  // === Anti-doublon amélioré ===
  const contentKey = (message.content || '').slice(0, 180).trim();
  const now = Date.now();

  if (processedMessages.has(contentKey)) {
    const lastTime = processedMessages.get(contentKey);
    if (now - lastTime < 45 * 1000) { // ignore si même contenu dans les 45 dernières secondes
      console.log('Message similaire déjà traité récemment → ignoré');
      return;
    }
  }

  processedMessages.set(contentKey, now);

  // Nettoyage automatique après 5 minutes
  setTimeout(() => {
    processedMessages.delete(contentKey);
  }, 5 * 60 * 1000);

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
