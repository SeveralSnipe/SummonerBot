const { verifyKey } = require('discord-interactions');
const nacl = require('tweetnacl');
const { Client, GatewayIntentBits } = require('discord.js');
const { InteractionType, InteractionResponseType } = require('discord-api-types/v9');
const axios = require('axios');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});
const BOT_TOKEN = process.env.BOT_TOKEN
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
exports.handler = async (event, context, callback) => {
    // Checking signature (requirement 1.)
    // Your public key can be found on your application in the Developer Portal
      const signature = event.headers['x-signature-ed25519']
      const timestamp = event.headers['x-signature-timestamp'];
      const strBody = event.body; // should be string, for successful sign
    
      const isVerified = nacl.sign.detached.verify(
        Buffer.from(timestamp + strBody),
        Buffer.from(signature, 'hex'),
        Buffer.from(PUBLIC_KEY, 'hex')
      );
    
      if (!isVerified) {
        return {
          statusCode: 401,
          body: JSON.stringify('invalid request signature'),
        };
      }

      if (!client.isReady()) {
        console.log('Logging in the bot...');
        await client.login(BOT_TOKEN);
        console.log('Bot logged in successfully.');
    }
    
    // Replying to ping (requirement 2.)
      const body = JSON.parse(strBody)
      console.log(`${body.id}`);
      console.log(body)
      if (body.type == 1) {
        return {
          statusCode: 200,
          body: JSON.stringify({ "type": 1 }),
        }
      }
      if (body.type === InteractionType.ApplicationCommand && body.data.name === 'summon') {
        try {
            await axios.post(`https://discord.com/api/v9/interactions/${body.id}/${body.token}/callback`, {
                type: InteractionResponseType.DeferredChannelMessageWithSource,
                data: {
                    content: 'Attempting to summon...',
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bot ${BOT_TOKEN}`
                }
            });

            const finalMessage = await handleInteraction(body);

            await axios.post(`https://discord.com/api/v9/webhooks/${body.application_id}/${body.token}`, {
                content: finalMessage,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            return { statusCode: 200, body: JSON.stringify({}) };
        } catch (error) {
            console.error('Error handling interaction:', error.response ? error.response.data : error.message);
            return { statusCode: 500, body: JSON.stringify('Error handling interaction') };
        }
    }
    };

let switching = false;

client.once('ready', () => {
    console.log('Bot is ready!');
});

async function switchUserBetweenChannels(member, destinationChannelId) {
    const startTime = Date.now();
    let switching = true;
    const guild = member.guild;
    console.log(guild);
    const channel1 = guild.channels.cache.find(ch => ch.name === 'Portal 1');
    const channel2 = guild.channels.cache.find(ch => ch.name === 'Portal 2');
    const channelId1 = channel1.id;
    const channelId2 = channel2.id;
    console.log(channelId1);
    console.log(channelId2);
    console.log(`Starting to switch user between channels ${channelId1} and ${channelId2}`);

    while (switching && (Date.now() - startTime < 30000)) {
        try {
            if (!member.voice.channelId) {
                console.log('User left the channel.');
                switching = false;
                break;
            }
            if (!member.voice.selfMute || !member.voice.selfDeaf){
                console.log('User has been summoned');
                switching = false;
                break;
            }

            const currentChannelId = member.voice.channelId === channelId1 ? channelId2 : channelId1;
            console.log(channelId1);
            console.log(channelId2);
            console.log(`Switching user to channel ${currentChannelId}`);
            await member.voice.setChannel(currentChannelId);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Error while switching channels:', error);
            switching = false;
        }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    if (switching) {
        console.log('User did not get summoned after 30 seconds')
        return false;
    }
    else{
        console.log('Final move to destination channel');
        await member.voice.setChannel(destinationChannelId);
        return duration;
    }
}

async function handleInteraction(body) {
    const interaction = body;
    if (interaction.type === InteractionType.ApplicationCommand) {
        console.log(interaction.data);

        const commandName = interaction.data.name;
        const options = interaction.data.options;

        console.log(commandName);

        if (commandName === 'summon') {
            const targetOption = options.find(option => option.name === 'target');
            const destinationOption = options.find(option => option.name === 'destination');

            if (!targetOption) {
                return 'User not found!';
            }

            if (!destinationOption) {
                return 'Destination channel not found!';
            }

            try{
                const channel1 = client.channels.cache.find(ch => ch.name === 'Portal 1');
                const channel2 = client.channels.cache.find(ch => ch.name === 'Portal 2');
            }
            catch{
                return 'Either of Portal 1 or Portal 2 channels are not available!';
            }

            const targetUserId = targetOption.value;
            const destinationChannelId = destinationOption.value;
            const guildId = interaction.guild_id;
            const guild = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(targetUserId);

            if (!member.voice.channelId) {
                return 'User is not in a voice channel!';
            }

            if (!member.voice.selfMute || !member.voice.selfDeaf) {
                return 'User is not muted and deafened!';
            }
            
            const duration = await switchUserBetweenChannels(member, destinationChannelId);
            if (!duration) {
                return 'User could not be summoned after 30 seconds!';
            }
            else{
                return `User was summoned after ${duration} seconds!`;
            }
        }
    }

    return 'Command not recognized!';
}

