const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = 2024;
const DISCORD_WEBHOOK_URL = 'WEBHOOK';

app.use(bodyParser.json());

async function getAvatarFromUsername(username) {
    if (!username) return null;

    try {
        const response = await axios.get(`https://api.github.com/users/${username}`);
        return response.data.avatar_url;
    } catch (e) {
        return null;
    }
}

app.post('/github', async (req, res) => {
    const payload = req.body;
    if (!payload.commits || !payload.repository) return res.sendStatus(400);

    const repoName = payload.repository.full_name;
    const embeds = [];

    for (const commit of payload.commits) {
        const authorName = commit.author.name;
        const authorUsername = commit.author.username;
        const avatarUrl = await getAvatarFromUsername(authorUsername) || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';

        const message = commit.message;

        const formatList = (emoji, label, list) => {
            if (!list.length) return '';
            const lines = list.map(file => `  →  ${file}`).join(',\n');
            return ` ${emoji} ${label}:\n${lines}\n`;
        };

        const fileChanges = 
            '```\n' +
            formatList('🟢', 'Ajoutés', commit.added) +
            (commit.added.length && (commit.modified.length || commit.removed.length) ? '\n' : '') +
            formatList('🟡', 'Modifiés', commit.modified) +
            (commit.modified.length && commit.removed.length ? '\n' : '') +
            formatList('🔴', 'Supprimés', commit.removed) +
            '```';

        const description = [
            `**🆕 Nouveau Commit sur \`${repoName}\`**`,
            `**Auteur :** ${authorName} (${authorUsername || 'anonyme'})`,
            `**Message :** ${message}`,
            '',
            fileChanges
        ].join('\n');

        embeds.push({
            color: 0x00AAFF,
            author: {
                name: authorName,
                icon_url: avatarUrl,
                url: authorUsername ? `https://github.com/${authorUsername}` : undefined
            },
            description,
            timestamp: commit.timestamp,
            url: commit.url
        });
    }

    try {
        await axios.post(DISCORD_WEBHOOK_URL, {
            username: 'Git Commit Notifier',
            avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            embeds
        });
        res.sendStatus(200);
    } catch (error) {
        console.error('Erreur Discord Webhook :', error.message);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
