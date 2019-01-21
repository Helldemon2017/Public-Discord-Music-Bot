const config = require('../config.json');

module.exports = client => {
  let pluralnonpluralservers = (client.guilds.size > 1) ? 'Servers' : 'Server';
  let pluralnonpluralusers = (client.users.size > 1) ? 'Users' : 'User';

  console.log(`\n\n${client.user.username} is online.\nOperating on ${client.guilds.size} ${pluralnonpluralservers}.\nOperating for ${client.users.size} ${pluralnonpluralusers}.\n\n`);
  client.user.setActivity('Booting..');

  function setActivity() {
    const Gameinfo = [`Using ${(((process.memoryUsage().heapUsed)/1024)/1024).toFixed(0)}MBs of RAM`, 'Source: https://github.com/Helldemon2017', 'Developer: dragonangel#9595', 'Discord: https://discord.gg/ebbD2nZ', 'Invite: ', `Running on ${client.guilds.size} ${pluralnonpluralservers}`, `Running for ${client.users.size} ${pluralnonpluralusers}`, `Use ${config.prefix}help`];
    var info = Gameinfo[Math.floor(Math.random() * Gameinfo.length)];

    client.user.setActivity(info);
    console.log(`[Console] Activity set to (${info})`);
  };
setInterval(setActivity, 120000);
};
