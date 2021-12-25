const {
    Client,
    Intents,
    WebhookClient
} = require('discord.js');

const client = new Client({
    intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
    partials: ["CHANNEL"]
});

const auth = require('./auth.json');
const botDataPath = './bot-data.json';

var tempData = {};

var botData = require(botDataPath);

function saveBotData() {
    let json = JSON.stringify(botData);
    var fs = require('fs');
    fs.writeFile(botDataPath, json, 'utf8', () => {});
}

function sendByChannel(channel, content) {
    channel.send(content).then(msg => {
        setTimeout(() => msg.delete(), 5000);
    }).catch(console.error)
}

function SendWebhookThen(msgId) {
    return function(message) {
        tempData[msgId] = message.id;
    }
}

function SendWebhookError(channelId) {
    return function(error) {
        delete botData['webhook'][channelId];
        saveBotData();
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', msg => {
    if (msg.webhookId !== null || msg.author.id == client.user.id) {
        return
    }
    if (msg.channel.type == "DM") {
        return;
    }
    const args = (msg.content).split(' ');
    switch (args[0]) {
        case "--help":
            msg.channel.send("```\n指令表:\n[取得此機器人的邀請連結]\n--invite\n\n[建立當前的頻道接收]\n--create\n\n[將本頻道的訊息傳送到其他頻道]\n--link <頻道 ID>\n\n[停止繼續將本頻道的訊息傳送到連結頻道]\n--unlink\n\n# 注意: 編輯與刪除功能，僅在機器人開始運作後或重啟後有效的訊息有效。\n# 提示: 如果未轉傳訊息，請使用指令 --create 重新建立看看\n```");
            break;
        case "--invite":
            msg.reply("https://discord.com/oauth2/authorize?client_id=" + client.user.id + "&permissions=536947712&scope=bot");
            break;
        case "--create":
            msg.delete({
                timeout: 1000
            });
            if (msg.member.permissions.has('ADMINISTRATOR')) {
                if (botData['webhook'][msg.channelId] === undefined) {
                    msg.channel.createWebhook(client.user.username, {
                        avatar: 'https://cdn.discordapp.com/avatars/' + client.user.id + '/' + client.user.avatar
                    }).then(hook => {
                        let wdata = {};
                        wdata.id = hook.id;
                        wdata.token = hook.token;
                        botData['webhook'][hook.channelId] = wdata;
                        client.channels.fetch(hook.channelId).then(channel => sendByChannel(channel, "建立完成\n此頻道的ID: `" + channel.id + "`")).catch(console.error);
                        saveBotData();
                    }).catch(console.error);
                } else {
                    sendByChannel(msg.channel, "```diff\n- 錯誤: 此頻道已建立!```");
                }
            } else {
                sendByChannel(msg.channel, "```diff\n- 錯誤: 僅限管理員使用.```");
            }
            break;
        case "--link":
            msg.delete({
                timeout: 1000
            });
            if (msg.member.permissions.has('ADMINISTRATOR')) {
                if (args[1] !== undefined) {
                    let linkChannel = args[1];
                    if (botData['webhook'][linkChannel] !== undefined) {
                        if (linkChannel != msg.channelId) {
                            if (botData['link'][msg.channelId] === undefined) {
                                botData['link'][msg.channelId] = [];
                            }
                            if (botData['link'][msg.channelId].includes(linkChannel)) {
                                sendByChannel(msg.channel, "```diff\n- 錯誤: 目標頻道已連接!```");
                            } else {
                                botData['link'][msg.channelId].push(linkChannel);
                                sendByChannel(msg.channel, "連接完成!");
                                saveBotData();
                            }
                        } else {
                            sendByChannel(msg.channel, "```diff\n- 錯誤: 目標頻道無法為當前頻道!```");
                        }
                    } else {
                        sendByChannel(msg.channel, "```diff\n- 錯誤: 目標頻道尚未建立接收!\n請在目標頻道輸入: --create```");
                    }
                } else {
                    sendByChannel(msg.channel, "```diff\n- 正確用法: --link <頻道 ID>```");
                }
            } else {
                sendByChannel(msg.channel, "```diff\n- 錯誤: 僅限管理員使用.```");
            }
            break;
        case "--unlink":
            msg.delete({
                timeout: 1000
            });
            if (msg.member.permissions.has('ADMINISTRATOR')) {
                if (botData['link'][msg.channelId] !== undefined) {
                    delete botData['link'][msg.channelId];
                    sendByChannel(msg.channel, "已解除所有連結的頻道.");
                    saveBotData();
                } else {
                    sendByChannel(msg.channel, "```diff\n- 錯誤: 本頻道無連結到任何頻道.```");
                }
            } else {
                sendByChannel(msg.channel, "```diff\n- 錯誤: 僅限管理員使用.```");
            }
            break;
        default:
            if (botData['link'][msg.channelId] !== undefined) {
                let author = msg.author;
                let member = msg.member;
                let files = [];
                let avatarURL = 'https://cdn.discordapp.com/avatars/' + author.id + '/' + author.avatar;
                let username = author.username;
                if (member !== null) {
                    if (member.avatar !== null) {
                        avatarURL = 'https://cdn.discordapp.com/guilds/' + member.guild.id + '/users/' + author.id + '/avatars/' + member.avatar;
                    }
                    if (member.nickname !== null) {
                        username = member.nickname;
                    }
                }
                let attachments = msg.attachments.toJSON();
                for (let i = 0; i < attachments.length; ++i) {
                    files.push(attachments[i].url);
                }

                let stickers = msg.stickers.toJSON();
                for (let i = 0; i < stickers.length; ++i) {
                    let url = "https://media.discordapp.net/stickers/" + stickers[i].id + ".png?size=160&.gif";
                    files.push(url);
                }

                let sendData = {
                    username: username,
                    avatarURL: avatarURL,
                    files: files
                };
                if (msg.content !== "") {
                    sendData.content = msg.content;
                }
                if (msg.mentions.repliedUser !== null) {
                    let repUsr = msg.mentions.repliedUser;
                    sendData.embeds = [{
                        "title": " ",
                        "author": {
                            "name": repUsr.tag,
                            "url": "https://discord.com/channels/" + msg.reference.guildId + "/" + msg.reference.channelId + "/" + msg.reference.messageId,
                            "icon_url": 'https://cdn.discordapp.com/avatars/' + repUsr.id + '/' + repUsr.avatar
                        },
                        "footer": {
                            "text": "回覆此用戶的訊息"
                        }
                    }]
                }
                let links = botData['link'][msg.channelId];
                for (let i = 0; i < links.length; ++i) {
                    let chlid = botData['link'][msg.channelId][i];
                    let wbh = botData['webhook'][chlid];
                    if (wbh !== undefined) {
                        const webhook = new WebhookClient({
                            id: wbh.id,
                            token: wbh.token
                        });
                        webhook.send(sendData).then(SendWebhookThen(msg.id)).catch(SendWebhookError(msg.channelId));
                    }
                }
            }
            break;
    }
});
client.on('messageDelete', msg => {
    if (msg.channel.type == "DM") {
        return;
    }
    if (botData['link'][msg.channelId] !== undefined) {
        let webID = tempData[msg.id];
        delete tempData[msg.id];
        if (webID !== undefined) {
            let links = botData['link'][msg.channelId];
            for (let i = 0; i < links.length; ++i) {
                let chlid = botData['link'][msg.channelId][i];
                let wbh = botData['webhook'][chlid];
                if (wbh !== undefined) {
                    const webhook = new WebhookClient({
                        id: wbh.id,
                        token: wbh.token
                    });
                    webhook.deleteMessage(webID).catch(console.error);
                }
            }
        }
    }
    return;
});
client.on('messageUpdate', (oldMsg, msg) => {
    if (msg.channel.type == "DM") {
        return;
    }
    if (botData['link'][msg.channelId] != undefined) {
        let webID = tempData[msg.id];
        if (webID != undefined) {
            let author = msg.author;
            let member = msg.member;
            let files = [];
            let avatarURL = 'https://cdn.discordapp.com/avatars/' + author.id + '/' + author.avatar;
            let username = author.username;
            if (member != null) {
                if (member.avatar != null) {
                    avatarURL = 'https://cdn.discordapp.com/guilds/' + member.guild.id + '/users/' + author.id + '/avatars/' + member.avatar;
                }
                if (member.nickname != null) {
                    username = member.nickname;
                }
            }
            let attachments = msg.attachments.toJSON();
            for (let i = 0; i < attachments.length; ++i) {
                files.push(attachments[i].url);
            }

            let stickers = msg.stickers.toJSON();
            for (let i = 0; i < stickers.length; ++i) {
                let url = "https://media.discordapp.net/stickers/" + stickers[i].id + ".png?size=160&.gif";
                files.push(url);
            }

            let sendData = {
                username: username,
                avatarURL: avatarURL,
                files: files
            };
            if (msg.content != "") {
                sendData.content = msg.content;
            }
            let links = botData['link'][msg.channelId];
            for (let i = 0; i < links.length; ++i) {
                let chlid = botData['link'][msg.channelId][i];
                let wbh = botData['webhook'][chlid];
                if (wbh != undefined) {
                    const webhook = new WebhookClient({
                        id: wbh.id,
                        token: wbh.token
                    });
                    webhook.editMessage(webID, sendData).then(SendWebhookThen(msg.id)).catch(SendWebhookError(msg.channelId));
                }
            }
        }
    }
});

client.login(auth.key);
