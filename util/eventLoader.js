const reqEvent = (event) => require(`../events/${event}`)

module.exports = (client) => {
	client.on('ready', () => reqEvent('ready')(client));
	client.on('messageUpdate', reqEvent('messageUpdate'));

/*
	client.on('guildBanAdd', reqEvent('guildBanAdd'));
	client.on('guildBanRemove', reqEvent('guildBanRemove'));
	client.on('roleCreate', reqEvent('roleCreate'));
	client.on('roleDelete', reqEvent('roleDelete'));

*/

};
