const Discord = require("discord.js");
const ytdl = require("ytdl-core");
const { Client, Util } = require('discord.js');
const getYoutubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');
const YouTube = require('simple-youtube-api');
const youtube = new YouTube("AIzaSyAdORXg7UZUo7sePv97JyoDqtQVi3Ll0b8");
const queue = new Map();
const client = new Discord.Client();

const NEWS = 'https://www.youtube.com/playlist?list=PLD26ozKv9pPtPJYB3s6c7G59_q0Tkxqt5';

/*
البكجآت
npm install discord.js
npm install ytdl-core
npm install get-youtube-id
npm install youtube-info
npm install simple-youtube-api
npm install queue
*/

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`in ${client.guilds.size} servers `)
    console.log(`[Codes] ${client.users.size}`)
    client.user.setStatus("dnd")
});
client.on('ready', () => {
     client.user.setActivity("Type zplay",{type: 'WATCHING'});

});
const prefix = "z"
client.on('message', async msg => {
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(prefix)) return undefined;
	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);
	let command = msg.content.toLowerCase().split(" ")[0];
	command = command.slice(prefix.length)
	if (command === 'news') {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('يجب أن تتواجد بغرفة صوتية');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!(permissions.has('CONNECT') || permissions.has('SPEAK'))) {
			return msg.channel.send('لا يتوآجد لدي صلاحية للتكلم بهذه الغرفة');
		}

		if (!permissions.has('EMBED_LINKS')) {
			return msg.channel.send("**يجب توافر صلاحية `EMBED LINKS`لدي **");
		}

		const playlist = await youtube.getPlaylist(NEWS);
		const videos = await playlist.getVideos();
		for (const video of Object.values(videos)) {
			const video2 = await youtube.getVideoByID(video.id); 
			await handleVideo(video2, msg, voiceChannel, true); 
		}
		return msg.channel.send(  `إلى قأئمة التشغيل ` +`\` ${playlist.title}\` `+ ` تم إضافة`);
	}
	
	if (command === `play`) {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('يجب أن تتواجد بغرفة صوتية');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!(permissions.has('CONNECT') || permissions.has('SPEAK'))) {
			return msg.channel.send('لا يتوآجد لدي صلاحية للتكلم بهذه الغرفة');
		}

		if (!permissions.has('EMBED_LINKS')) {
			return msg.channel.send("**يجب توافر صلاحية `EMBED LINKS`لدي **");
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); 
				await handleVideo(video2, msg, voiceChannel, true); 
			}
			return msg.channel.send(` **${playlist.title}** تم الإضافة إلى قأئمة التشغيل`);
		} else {
			try {

				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 5);
					let index = 0;
					const embed1 = new Discord.RichEmbed()
			        .setDescription(`**الرجآء إختيار رقم المقطع** :
${videos.map(video2 => `[**${++index} **] \`${video2.title}\``).join('\n')}`)
					.setFooter("ALPHA STORE", "https://i.imgur.com/gD5ohkS.png")
					msg.channel.sendEmbed(embed1).then(message =>{message.delete(20000)})
					
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 15000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('لم يتم إختيار محتوى صوتي');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send(':X: لا يوجد نتائج ');
				}
			}

			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === `skip`) {
		if (!msg.member.voiceChannel) return msg.channel.send('يجب أن تكون في غرفة صوتية');
		if (!serverQueue) return msg.channel.send('لا يتوفر أي محتوى لتجاوزه');
		serverQueue.connection.dispatcher.end('تم تجاوز هذا المحتوى');
		return undefined;
	} else if (command === `stop`) {
		if (!msg.member.voiceChannel) return msg.channel.send('ادخل إلى غرفة صوتية أولًا');
		if (!serverQueue) return msg.channel.send('لا يتوفر محتوى لإيقافه');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('تم إيقاف المحتوى');
		return undefined;
	} else if (command === `vol`) {
		if (!msg.member.voiceChannel) return msg.channel.send('أنت لست بغرفة صوتية');
		if (!serverQueue) return msg.channel.send('.لا يتم تشغيل أي محتوى حاليًا');
		if (!args[1]) return msg.channel.send(`:loud_sound: مستوى الصوت **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 50);
		return msg.channel.send(`:speaker: تم تغير مستوى الصوت الي **${args[1]}**`);
	} else if (command === `np`) {
		if (!serverQueue) return msg.channel.send('.لا يتم تشغيل أي محتوى حاليًا');
		const embedNP = new Discord.RichEmbed()
	.setDescription(`:notes: يتم الآن تشغيل : **${serverQueue.songs[0].title}**`)
		return msg.channel.sendEmbed(embedNP);
	} else if (command === `queue`) {
		if (!serverQueue) return msg.channel.send('.لا يتم تشغيل أي محتوى حاليًا');
		let index = 0;
		const embedqu = new Discord.RichEmbed()
.setDescription(`**قائمة المحتوى**
${serverQueue.songs.map(song => `**${++index} -** ${song.title}`).join('\n')}
**الان يتم تشغيل** ${serverQueue.songs[0].title}`)
		return msg.channel.sendEmbed(embedqu);

	} else if (command === `help`) {
        msg.delete();

		var embed = new Discord.RichEmbed()
		.setColor('#CC0000')
		.addField('**PREFIX**','**Z**')
        .setAuthor('HELP', 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/160/twitter/147/thinking-face_1f914.png')
        .addField('**Commands**', '[play](https://discordapp.com/)\n[stop](https://discordapp.com/)\n[pause](https://discordapp.com/)\n[resume](https://discordapp.com/)\n[np](https://discordapp.com/)\n[queue](https://discordapp.com/)\n[vol](https://discordapp.com/)\n[skip](https://discordapp.com/)')
        .setFooter(`${msg.author.tag}.`, msg.author.avatarURL);
        msg.channel.send(embed);
        
	}else if (command === `pause`) {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('تم إيقاف المحتوى مؤقتًا!');
		}
		return msg.channel.send('لا يتم تشغيل أي محتوى حاليًا');
	} else if (command === "resume") {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send(':arrow_forward: إستئناف');
		}
		return msg.channel.send('لا يتم تشغيل أي محتوى حاليًا');
	}

	return undefined;

});
async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);
		queueConstruct.songs.push(song);
		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`لا أستطيع دخول هذه الغرفة ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return msg.channel.send(` **${song.title}** تم اضافه المحتوى الصوتي الي القائمة!`);
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

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

	serverQueue.textChannel.send(`بدء تشغيل : \` ${song.title}\` `);
}

const adminprefix = "$vip";
const devs = ['9999999998889999'];
client.on('message', message => {
  var argresult = message.content.split(` `).slice(1).join(' ');
    if (!devs.includes(message.author.id)) return;
    
if (message.content.startsWith(adminprefix + 'setgame')) {
  client.user.setGame(argresult);
    message.channel.sendMessage(`**${argresult} تم تغيير بلاينق البوت إلى **`)
} else 
  if (message.content.startsWith(adminprefix + 'setname')) {
client.user.setUsername(argresult).then
    message.channel.sendMessage(`**${argresult}** : تم تغيير أسم البوت إلى`)
return message.reply("**لا يمكنك تغيير الاسم يجب عليك الانتظآر لمدة ساعتين . **");
} else
  if (message.content.startsWith(adminprefix + 'setavatar')) {
client.user.setAvatar(argresult);
  message.channel.sendMessage(`**${argresult}** : تم تغير صورة البوت`);
      } else     
if (message.content.startsWith(adminprefix + 'setT')) {
  client.user.setGame(argresult, "https://www.twitch.tv/idk");
    message.channel.sendMessage(`**تم تغيير تويتش البوت إلى  ${argresult}**`)
}

});

   
