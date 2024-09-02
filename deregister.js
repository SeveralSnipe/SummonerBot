const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');

const rest = new REST().setToken(token);


rest.delete(Routes.applicationCommand(clientId, '1267457385442709657'))
	.then(() => console.log('Successfully deleted application command'))
	.catch(console.error);