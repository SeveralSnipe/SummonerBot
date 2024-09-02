const { REST } = require('@discordjs/rest');
const { Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');

const rest = new REST({ version: '10' }).setToken(token);

const commands = [
    new SlashCommandBuilder()
        .setName('summon')
        .setDescription('Summon a user to a specified channel (Requires voice channels Portal 1 and Portal 2)')
        .addUserOption(option => option.setName('target').setDescription('The user to summon').setRequired(true))
        .addChannelOption(option => option.setName('destination').setDescription('The destination channel after summoning').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
].map(command => command.toJSON());

rest.put(Routes.applicationCommands(clientId), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);
