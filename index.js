const Discord = require('discord.js')
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const queue = new Map();
const client = new Discord.Client({disableEveryone: true});
const fs = require('fs' );
let config = require('./config.json');
var servers = {};
let prefix = config.prefix;
const youtube = new YouTube(config.YT_KEY);
require('./util/eventLoader.js')(client);

client.on("message", async message => {

 if(message.author.bot) return;
  if(message.channel.type === "dm") return;

    var args2 = message.content.substring(config.prefix.length).split(" ");
    if (!message.content.startsWith(config.prefix)) return;
  var searchString = args2.slice(1).join(' ');
  var url = args2[1] ? args2[1].replace(/<(.+)>/g, '$1') : '';
  var serverQueue = queue.get(message.guild.id);
    switch (args2[0].toLowerCase()) {
      case "play":
    var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
      if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
      var playlist = await youtube.getPlaylist(url);
      var videos = await playlist.getVideos();
      for (const video of Object.values(videos)) {
        var video2 = await youtube.getVideoByID(video.id);
        await handleVideo(video2, message, voiceChannel, true);
      }
        const playlistembed = new Discord.RichEmbed()
        .setColor(`GREEN`)
        .setDescription(`✅ ${playlist.title} has been added to the queue!`)
      return message.channel.send(playlistembed);
    } else {
      try {
        var video = await youtube.getVideo(url);
      } catch (error) {
        try {
          var videos = await youtube.searchVideos(searchString, 9);
          var index = 0;
          let selectionemb = new Discord.RichEmbed()
          .setTitle(`:notes: Song selection`)
          .setDescription(`${videos.map(video2 => `**${++index} -** [${video2.title}](${video2.url})`).join('\n')}`)
          .setFooter('🔎 Please provide a number to select one of the search results ranging from 1-9.')
          .setColor('#0fe709')
          message.channel.send(selectionemb).then(message => {
            message.delete(11000)
          })
          // eslint-disable-next-line max-depth
          try {
            var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 10, {
              maxMatches: 1,
              time: 10000,
              errors: ['time']
            });
          } catch (err) {
            console.error(err);
            let noinvemb = new Discord.RichEmbed()
            .setDescription('No or invalid value entered, cancelling video selection.')
            .setColor('#e41016')
            return message.channel.send(noinvemb).then(message => {
              message.delete(5000)
            })
          }
          var videoIndex = parseInt(response.first().content);
          var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
        } catch (err) {
          console.error(err);
          return message.channel.send('Can\'t find the video');
        }
      }
      return handleVideo(video, message, voiceChannel);
    }
        break;
      case "skip":
    if (!message.member.voiceChannel) return message.channel.send('You are not in a voice channel!');
    if (!serverQueue) return message.channel.send('There is nothing playing.');
    serverQueue.connection.dispatcher.end('Skip command has been used!');
        message.channel.send(':ok_hand: Skipped!')
    return undefined;
        break;
      case "np":
    if (!serverQueue) return message.channel.send('There is nothing playing.');
        let nowplayingemb = new Discord.RichEmbed()
        .setDescription(`🎶 Now playing: **${serverQueue.songs[0].title}**`)
        .setColor(`GREEN`)
    return message.channel.send(nowplayingemb);
break;
 case "queue":
    if (!serverQueue) return message.channel.send('No music playing right now.');
        let queueemb = new Discord.RichEmbed()
        .setAuthor(`${message.guild.name} Queue list `)
        .setDescription(`${serverQueue.songs.map(song => `**•** [${song.title}](https://www.youtube.com/watch?v=${song.id}})`).join('\n')}\n\n🎶 **Now playing:** ${serverQueue.songs[0].title}`)
        .setColor(`GREEN`)
    return message.channel.send(queueemb)
break;
 case "stop":
    if (!message.member.voiceChannel) return message.channel.send('Please connect to a voice channel.');
     let stopemb = new Discord.RichEmbed()
     .setColor(`GREEN`)
     message.guild.me.voiceChannel.leave();
  return message.channel.send('**Successfully Leaved**')
  break;
}
async function handleVideo(video, message, voiceChannel, playlist = false) {
  var serverQueue = queue.get(message.guild.id);
  console.log(video);
  var song = {
    id: video.id,
    title: video.title,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    channel: video.channel.title,
    durationm: video.duration.minutes,
    durations: video.duration.seconds,
    durationh: video.duration.hours,
    publishedAt: video.publishedAt,
  };
  if (!serverQueue) {
    var queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };
    queue.set(message.guild.id, queueConstruct);

    queueConstruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      var listener = await voiceChannel.join();
      connection.on('error', console.error);
      queueConstruct.connection = connection;
      play(message.guild, queueConstruct.songs[0]);
    } catch (error) {
      queue.delete(message.guild.id);
      return message.channel.send(`I could not join the voice channel: ${error}`);
    }
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    if (playlist) return undefined;
    let queueemb = new Discord.RichEmbed()
    .setAuthor(`Added to ${message.guild.name} Queue list`, message.author.displayAvatarURL)
    .setColor(`0xff3262`)
    .addField(`Publisher:`, `${song.channel}`, true)
    .addField(`Video ID:`, song.id , true)
    .setFooter(`Video Published At ${song.publishedAt}`)
    .addField(`Duration:`, `**${song.durationh}** hours, **${song.durationm}** minutes, **${song.durations}** seconds`, true)
    .setThumbnail(`https://i.ytimg.com/vi/${song.id}/sddefault.jpg`)
    .setDescription(`[${song.title}](https://www.youtube.com/watch?v=${song.id}})`)
    .setColor(`GREEN`)
    return message.channel.send(queueemb).then(msg => {
      message.delete(10000)
    })
  }
  return undefined;
}
  function play(guild, song) {
  var serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  console.log(serverQueue.songs);

  const dispatcher = serverQueue.connection.playStream(ytdl(song.url))

  .on('end', reason => {
      if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
      else console.log(reason);
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
  .on('error', error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    let playingemb = new Discord.RichEmbed()
    .setTitle(`:notes: Now playing`)
    .setColor(`GREEN`)
    .addField(`Publisher:`, `${song.channel}`, true)
    .addField(`Video ID:`, song.id, true)
    .setFooter(`Video Published At ${song.publishedAt}`)
    .addField(`Duration:`, `**${song.durationh}** hours, **${song.durationm}** minutes, **${song.durations}** seconds`, true)
    .setThumbnail(`https://i.ytimg.com/vi/${song.id}/sddefault.jpg`)
    .setDescription(`[${song.title}](https://www.youtube.com/watch?v=${song.id}})`)
    .setTimestamp()

    serverQueue.textChannel.send(playingemb);

}
  let messageArray = message.content.split(" ");
  let cmd = messageArray[0];
  let args = messageArray.slice(1);

    if(cmd === `${prefix}help`) {
  let bicon = client.user.displayAvatarURL;
  let support0 = new Discord.RichEmbed()
.setAuthor(client.user.username)
.setThumbnail(bicon)
.setColor("RANDOM")
.setTitle("**My Commands**")
.addField(`${prefix}play`,"To Play Music")
.addField(`${prefix}skip`,"To Skip Music")
.addField(`${prefix}np`,"To See Now Playing Music")
.addField(`${prefix}queue`,"To See Server Queue")
.addField(`${prefix}stop`,"To Leave The Vc")
.addField(`${prefix}radio`,"Listen To Radio")
.setTimestamp()
.setFooter(`Requested by ${message.author.tag}`);

message.channel.send(support0);
  }
   if (cmd === `${prefix}radio`) {
               //  if(!args[0]) return message.channel.send(`Invalid input pls use ${prefix}radio list for more help.`)
             //    if(`${args[0]}` == 'list') {
                let bicon = client.user.displayAvatarURL;
                let list = new Discord.RichEmbed()
                .setAuthor(client.user.username)
                .setThumbnail(bicon)
                .setColor('RANDOM')
                .setTitle(':notes:RADIO LIST')
                .setDescription(`**1-[Country ](//streamlink)\n2-[RnB](//streamlink)\n3-[Dance/Techno](//streamlink)\n4-[Oldies](//streamlink)\n5-[Rock](//streamlink)\n6-[Anime](//streamlink)\n7-[Christmas](//sttreamlink)**`)
                .setFooter(`Please choose a number between 1-7 to play radio`);
                 message.channel.send(list);

     
     //country radio
      message.channel.awaitMessages(response => response.content === '1', {

        max: 1,

        time: 10000,

        errors: ['time'],

      })

      .then((collected) => {
        var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
                voiceChannel.join()
                .then(connection => {
                        connection.playStream('//streamlink')

                })
                let bicon = client.user.displayAvatarURL;
                let support = new Discord.RichEmbed()
                    .setAuthor(client.user.username)
                    .setThumbnail(bicon)
                    .setColor('RANDOM')
                    .setTitle(':notes:Playing Country Radio')
                    .addField('Country','Radio Stream 24/7')
                    .setTimestamp()
                    .setFooter(`Requested by ${message.author.tag}`);
                message.channel.send(support);

        })
     
        .catch(() => {

        });
     
           message.channel.awaitMessages(response => response.content === '2', {

        max: 1,

        time: 10000,

        errors: ['time'],

      })

      .then((collected) => {
        var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
                voiceChannel.join()
                .then(connection => {
                        connection.playStream('//streamlink')

                })
                let bicon = client.user.displayAvatarURL;
                let support = new Discord.RichEmbed()
                    .setAuthor(client.user.username)
                    .setThumbnail(bicon)
                    .setColor('RANDOM')
                    .setTitle(':notes:Playing RnB Radio')
                    .addField('RnB','Radio Stream 24/7')
                    .setTimestamp()
                    .setFooter(`Requested by ${message.author.tag}`);
                message.channel.send(support);

        })
              .catch(() => {

        });
     
                message.channel.awaitMessages(response => response.content === '3', {

        max: 1,

        time: 10000,

        errors: ['time'],

      })

      .then((collected) => {
        var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
                voiceChannel.join()
                .then(connection => {
                        connection.playStream('//streamlink')

                })
                let bicon = client.user.displayAvatarURL;
                let support = new Discord.RichEmbed()
                    .setAuthor(client.user.username)
                    .setThumbnail(bicon)
                    .setColor('RANDOM')
                    .setTitle(':notes:Playing Dance/Techno Radio')
                    .addField('Dance/Techno','Radio Stream 24/7')
                    .setTimestamp()
                    .setFooter(`Requested by ${message.author.tag}`);
                message.channel.send(support);

        })
             .catch(() => {

        });
          
                message.channel.awaitMessages(response => response.content === '4', {

        max: 1,

        time: 10000,

        errors: ['time'],

      })

      .then((collected) => {
        var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
                voiceChannel.join()
                .then(connection => {
                        connection.playStream('//streamlink')

                })
                             let bicon = client.user.displayAvatarURL;
                let support4 = new Discord.RichEmbed()
                    .setAuthor(client.user.username)
                    .setThumbnail(bicon)
                    .setColor('RANDOM')
                    .setTitle(':notes:Playing Oldies Radio')
                    .addField('Oldies','Radio Stream 24/7')
                    .setTimestamp()
                    .setFooter(`Requested by ${message.author.tag}`);
                message.channel.send(support4);
        })
             .catch(() => {

        });
     
                     message.channel.awaitMessages(response => response.content === '5', {

        max: 1,

        time: 10000,

        errors: ['time'],

      })

      .then((collected) => {
        var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
                voiceChannel.join()
                .then(connection => {
                        connection.playStream('//streamlink')

                })
                             let bicon = client.user.displayAvatarURL;
                let support4 = new Discord.RichEmbed()
                    .setAuthor(client.user.username)
                    .setThumbnail(bicon)
                    .setColor('RANDOM')
                    .setTitle(':notes:Playing Rock Radio')
                    .addField('Rock','Radio Stream 24/7')
                    .setTimestamp()
                    .setFooter(`Requested by ${message.author.tag}`);
                message.channel.send(support4);
        })
     
             .catch(() => {

        });
                  message.channel.awaitMessages(response => response.content === '6', {

        max: 1,

        time: 10000,

        errors: ['time'],

      })

      .then((collected) => {
        var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
                voiceChannel.join()
                .then(connection => {
                        connection.playStream('//streamlink')

                })
                             let bicon = client.user.displayAvatarURL;
                let support4 = new Discord.RichEmbed()
                    .setAuthor(client.user.username)
                    .setThumbnail(bicon)
                    .setColor('RANDOM')
                    .setTitle(':notes:Playing Anime Radio')
                 .addField('Anime','Radio Stream 24/7')
                    .setTimestamp()
                    .setFooter(`Requested by ${message.author.tag}`);
                message.channel.send(support4);
        })
     
             .catch(() => {

        });
     
                       message.channel.awaitMessages(response => response.content === '7', {

        max: 1,

        time: 10000,

        errors: ['time'],

      })

      .then((collected) => {
        var voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) return message.channel.send('You need to be in voice channel first!');
    var permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT')) {
      const errorconnect = new Discord.RichEmbed()
            .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't connect into your voice channel, Missing **CONNECT** Permission.`)
      return message.channel.send(errorconnect).then(message => {
        message.delete(10000)
      })
    }
    if (!permissions.has('SPEAK')) {
      const errorspeak = new Discord.RichEmbed()
      .setColor(`RED`)
      .setFooter(`This message will be deleted in 10 seconds..`)
      .setDescription(`I couldn't speak at your voice channel, Missing **SPEAK** Permission.`)
      return message.channel.send(errorspeak).then(message => {
        message.delete(10000)
      })
    }
                voiceChannel.join()
                .then(connection => {
                        connection.playStream('//streamlink')

                })
                             let bicon = client.user.displayAvatarURL;
                let support4 = new Discord.RichEmbed()
                    .setAuthor(client.user.username)
                    .setThumbnail(bicon)
                    .setColor('RANDOM')
                    .setTitle(':notes:Playing Christmas Radio')
                    .addField('Christmas','Radio Stream 24/7')
                    .setTimestamp()
                    .setFooter(`Requested by ${message.author.tag}`);
                message.channel.send(support4);
        })
     
             .catch(() => {

        });
     
      }
               
});


client.login(config.token)