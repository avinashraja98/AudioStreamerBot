const Discord = require('discord.js');
const prism = require('prism-media');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
require('dotenv').config();

const port = 8080;
const client = new Discord.Client();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

server.listen(port, async () => {
    console.log('listening on *:', port);
    client.once('ready', async () => {
        console.log('Ready!');

        const Guilds = client.guilds.cache.map(guild => guild.id);
        const GuildNames = Guilds.map((id) => client.guilds.cache.get(id).name)
        const guildIdName = [];
        GuildNames.forEach((name, idx) => guildIdName.push({ id: Guilds[idx], name }));
        const guildChannels = [];
        GuildNames.forEach((name, idx) => {
            const channelsArr = [];
            client.guilds.cache.get(Guilds[idx]).channels.cache.map((channel) => {
                if (channel.type === 'voice') {
                    channelsArr.push({ id: channel.id, name: channel.name });
                }
            });
            guildChannels.push({ id: Guilds[idx], name: GuildNames[idx], channels: channelsArr });
        });

        io.on('connection', async (socket) => {
            console.log('a user connected');
            socket.on('channel-data', (fn) => fn(guildChannels));
            socket.on('disconnect', () => console.log("a user disconnected"));
            socket.on('join', async (channelId) => {
                const connection = await client.channels.cache.get(channelId).join();
                const encoder = new prism.opus.Encoder({
                    rate: 48000, channels: 2, frameSize: 960
                });
                socket.on('audio-data-' + channelId, data => encoder.write(data));
                connection.play(encoder, { type: 'opus' });
            });
            socket.on('leave', (channelId) => {
                client.channels.cache.get(channelId).leave();
            });
        });
    });

    await client.login(process.env.BOT_TOKEN);
});
