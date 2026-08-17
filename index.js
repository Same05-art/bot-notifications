require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
app.use(express.json());

// ============================================
// CONFIGURATION DES MODÈLES
// ============================================
const MODELS = {
  "alicelyd": {
    name: "Alicelyd",
    newSubChannel: "1470220774815039553",
    paymentChannel: "1470221301078560789"
  }
  // Tu ajouteras les autres modèles ici plus tard
};

// ============================================

app.post('/webhook/:modelKey', async (req, res) => {
  try {
    const modelKey = req.params.modelKey.toLowerCase();
    const model = MODELS[modelKey];

    if (!model) {
      console.log(`Modèle inconnu : ${modelKey}`);
      return res.status(404).send('Model not found');
    }

    const data = req.body;
    console.log(`[${model.name}] Payload reçu :`, JSON.stringify(data, null, 2));

    const eventType = (data.type || data.event || data.event_type || data.action || '').toLowerCase();

    const isNewSub = eventType.includes('sub') || eventType.includes('subscriber') || eventType.includes('abonnement') || eventType.includes('new_subscriber');
    const isPayment = eventType.includes('payment') || eventType.includes('paid') || eventType.includes('paiement') || eventType.includes('tip') || eventType.includes('purchase');

    let channelId = null;
    let title = '';
    let color = 0x57F287;

    if (isNewSub) {
      channelId = model.newSubChannel;
      title = `🆕 Nouvel abonné — ${model.name}`;
    } else if (isPayment) {
      channelId = model.paymentChannel;
      title = `💰 Paiement — ${model.name}`;
      color = 0xFEE75C;
    } else {
      console.log(`[${model.name}] Type d'événement non reconnu :`, eventType);
      return res.status(200).send('Ignored');
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`Salon introuvable pour ${model.name}`);
      return res.status(500).send('Channel not found');
    }

    const fanName = data.username || data.user?.username || data.fan || data.fan_name || data.subscriber || 'Inconnu';
    const amount = data.amount || data.price || data.total || data.value || null;

    let description = `**Fan :** ${fanName}`;
    if (amount) description += `\n**Montant :** ${amount}`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    res.status(200).send('OK');

  } catch (error) {
    console.error(error);
    res.status(500).send('Error');
  }
});

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
